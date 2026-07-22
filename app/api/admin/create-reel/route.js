import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/adminAuth';
import { checkEligibility, generateCaption } from '@/lib/instagram';
import { getTopPerformingExamples } from '@/lib/engagement';
import { buildReelTimeline, submitRender } from '@/lib/reels';

export const maxDuration = 30;

// Fast: generates the caption, submits the render job to Shotstack, and
// returns immediately. Does NOT wait for the video to finish — that's
// check-reel's job, called separately (polling, or the daily cron).
export async function POST(request) {
  const token = cookies().get('admin_session')?.value;
  if (!verifySessionToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await request.json();
  if (!id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: product, error } = await supabase.from('products').select('*').eq('id', id).single();
  if (error || !product) return NextResponse.json({ ok: false, error: 'Product not found' }, { status: 404 });

  try {
    await checkEligibility(supabase, product);
    if (!product.image_url) throw new Error('Product has no image_url — run image backfill first');
    if (!process.env.SHOTSTACK_API_KEY) throw new Error('SHOTSTACK_API_KEY not configured');

    const topExamples = await getTopPerformingExamples(supabase, product.category);
    const { caption, hashtags } = await generateCaption(product, topExamples);
    const hookText = caption.split('\n')[0].slice(0, 90);

    const timeline = buildReelTimeline(product, hookText);
    const renderId = await submitRender(timeline);

    const { data: post } = await supabase
      .from('instagram_posts')
      .insert({
        product_id: product.id,
        caption,
        hashtags,
        post_type: 'reel',
        status: 'rendering',
        shotstack_render_id: renderId,
      })
      .select()
      .single();

    return NextResponse.json({ ok: true, postId: post.id, renderId, message: 'Render submitted — check status in a minute or two.' });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
