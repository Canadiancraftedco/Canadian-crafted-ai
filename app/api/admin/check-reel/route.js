import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/adminAuth';
import { publishReelToInstagram } from '@/lib/instagram';
import { checkRenderStatus } from '@/lib/reels';

export const maxDuration = 60;

// Checks a pending reel's Shotstack render status. If done, publishes to
// Instagram as a Reel (this part CAN take a while — video processing on
// Instagram's side is genuinely slow — so this route has the longer budget).
export async function POST(request) {
  const token = cookies().get('admin_session')?.value;
  if (!verifySessionToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { postId } = await request.json();
  if (!postId) return NextResponse.json({ ok: false, error: 'postId required' }, { status: 400 });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: post, error } = await supabase.from('instagram_posts').select('*').eq('id', postId).single();
  if (error || !post) return NextResponse.json({ ok: false, error: 'Reel job not found' }, { status: 404 });

  if (post.status !== 'rendering') {
    return NextResponse.json({ ok: true, status: post.status, message: 'Already resolved.' });
  }

  try {
    const render = await checkRenderStatus(post.shotstack_render_id);

    if (render.status === 'failed') {
      await supabase.from('instagram_posts').update({ status: 'failed' }).eq('id', post.id);
      return NextResponse.json({ ok: false, status: 'failed', error: render.error });
    }

    if (render.status !== 'done') {
      return NextResponse.json({ ok: true, status: 'rendering', shotstackStatus: render.status });
    }

    // video is ready — publish it
    await supabase.from('instagram_posts').update({ video_url: render.url }).eq('id', post.id);

    const fullCaption = `${post.caption}\n\n${(post.hashtags || []).join(' ')}`;
    const igPostId = await publishReelToInstagram({ videoUrl: render.url, caption: fullCaption });

    await supabase
      .from('instagram_posts')
      .update({ status: 'posted', post_id: igPostId, posted_at: new Date().toISOString() })
      .eq('id', post.id);

    await supabase.from('products').update({ posted_to_instagram: true }).eq('id', post.product_id);

    return NextResponse.json({ ok: true, status: 'posted', ig_post_id: igPostId });
  } catch (err) {
    await supabase.from('instagram_posts').update({ status: 'failed' }).eq('id', post.id);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
