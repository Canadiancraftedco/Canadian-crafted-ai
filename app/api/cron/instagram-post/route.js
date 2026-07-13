import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { postProductToInstagram } from '@/lib/instagram';

export const maxDuration = 60;

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: candidates, error } = await supabase
    .from('products')
    .select('*')
    .eq('canada_verified', true)
    .not('image_url', 'is', null)
    .or('posted_to_instagram.is.null,posted_to_instagram.eq.false')
    .order('canada_confidence', { ascending: false })
    .limit(1);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ ok: true, message: 'No eligible products to post right now.' });
  }

  const product = candidates[0];

  try {
    const { igPostId } = await postProductToInstagram(supabase, product);
    return NextResponse.json({ ok: true, product: product.name, ig_post_id: igPostId });
  } catch (err) {
    await supabase.from('instagram_posts').insert({ product_id: product.id, status: 'failed', caption: null });
    return NextResponse.json({ ok: false, product: product.name, error: String(err) }, { status: 500 });
  }
}
