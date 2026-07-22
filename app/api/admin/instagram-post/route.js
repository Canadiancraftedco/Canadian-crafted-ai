import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/adminAuth';
import { postProductToInstagram } from '@/lib/instagram';

export const maxDuration = 60;

export async function POST(request) {
  const token = cookies().get('admin_session')?.value;
  if (!verifySessionToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await request.json();
  if (!id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !product) {
    return NextResponse.json({ ok: false, error: 'Product not found' }, { status: 404 });
  }

  try {
    const { igPostId, caption } = await postProductToInstagram(supabase, product);
    return NextResponse.json({ ok: true, ig_post_id: igPostId, caption });
  } catch (err) {
    await supabase.from('instagram_posts').insert({ product_id: product.id, status: 'failed', caption: null });
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
