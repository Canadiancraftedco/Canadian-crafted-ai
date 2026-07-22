import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { postProductToInstagram, publishReelToInstagram } from '@/lib/instagram';
import { trackAndPruneEngagement } from '@/lib/engagement';
import { checkRenderStatus } from '@/lib/reels';

export const maxDuration = 60;

async function advancePendingReels(supabase) {
  const { data: pending } = await supabase
    .from('instagram_posts')
    .select('*')
    .eq('status', 'rendering')
    .eq('post_type', 'reel');

  const results = [];
  for (const post of pending || []) {
    try {
      const render = await checkRenderStatus(post.shotstack_render_id);
      if (render.status === 'failed') {
        await supabase.from('instagram_posts').update({ status: 'failed' }).eq('id', post.id);
        results.push({ id: post.id, status: 'failed' });
        continue;
      }
      if (render.status !== 'done') {
        results.push({ id: post.id, status: 'still_rendering' });
        continue;
      }

      await supabase.from('instagram_posts').update({ video_url: render.url }).eq('id', post.id);
      const fullCaption = `${post.caption}\n\n${(post.hashtags || []).join(' ')}`;
      const igPostId = await publishReelToInstagram({ videoUrl: render.url, caption: fullCaption });

      await supabase
        .from('instagram_posts')
        .update({ status: 'posted', post_id: igPostId, posted_at: new Date().toISOString() })
        .eq('id', post.id);
      await supabase.from('products').update({ posted_to_instagram: true }).eq('id', post.product_id);

      results.push({ id: post.id, status: 'posted' });
    } catch (err) {
      await supabase.from('instagram_posts').update({ status: 'failed' }).eq('id', post.id);
      results.push({ id: post.id, status: 'failed', error: String(err) });
    }
  }
  return results;
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  let engagementResult = null;
  try {
    engagementResult = await trackAndPruneEngagement(supabase);
  } catch (err) {
    engagementResult = { error: String(err) };
  }

  let reelResults = null;
  try {
    reelResults = await advancePendingReels(supabase);
  } catch (err) {
    reelResults = { error: String(err) };
  }

  const { data: approved } = await supabase.from('brand_affiliate_status').select('brand').eq('status', 'approved');
  const approvedBrands = (approved || []).map((b) => b.brand);

  if (approvedBrands.length === 0) {
    return NextResponse.json({ ok: true, engagement: engagementResult, reels: reelResults, message: 'No brands approved for affiliate posting yet.' });
  }

  const { data: candidates, error } = await supabase
    .from('products')
    .select('*')
    .eq('canada_verified', true)
    .not('image_url', 'is', null)
    .or('posted_to_instagram.is.null,posted_to_instagram.eq.false')
    .in('brand', approvedBrands)
    .order('canada_confidence', { ascending: false })
    .limit(1);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ ok: true, engagement: engagementResult, reels: reelResults, message: 'No eligible products to post right now.' });
  }

  const product = candidates[0];

  try {
    const { igPostId } = await postProductToInstagram(supabase, product);
    return NextResponse.json({ ok: true, engagement: engagementResult, reels: reelResults, product: product.name, ig_post_id: igPostId });
  } catch (err) {
    await supabase.from('instagram_posts').insert({ product_id: product.id, status: 'failed', caption: null });
    return NextResponse.json({ ok: false, engagement: engagementResult, reels: reelResults, product: product.name, error: String(err) }, { status: 500 });
  }
}
