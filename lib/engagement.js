const IG_API_VERSION = 'v21.0';

// Tuning knobs — adjust as you learn what "good" looks like for this account
const REVIEW_AFTER_HOURS = 48; // how long a post gets to prove itself before we judge it
const MIN_ENGAGEMENT_SCORE = 2; // likes + comments*3 below this after the review window = takedown

function computeScore(likeCount, commentCount) {
  return (likeCount || 0) + (commentCount || 0) * 3;
}

export async function fetchPostMetrics(postId) {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const res = await fetch(
    `https://graph.facebook.com/${IG_API_VERSION}/${postId}?fields=like_count,comments_count&access_token=${accessToken}`
  );
  if (!res.ok) throw new Error(`Failed to fetch metrics for ${postId}: ${res.status}`);
  return res.json();
}

export async function deleteInstagramPost(postId) {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const res = await fetch(`https://graph.facebook.com/${IG_API_VERSION}/${postId}?access_token=${accessToken}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete post ${postId}: ${res.status} — ${await res.text()}`);
  return res.json();
}

// Checks all live posts, updates their engagement, and takes down underperformers
// that have had a fair review window to prove themselves.
export async function trackAndPruneEngagement(supabase) {
  const { data: posts, error } = await supabase
    .from('instagram_posts')
    .select('*')
    .eq('status', 'posted')
    .not('post_id', 'is', null);

  if (error) throw new Error(error.message);

  const results = { checked: 0, updated: 0, takenDown: 0, errors: [] };

  for (const post of posts || []) {
    results.checked++;
    try {
      const metrics = await fetchPostMetrics(post.post_id);
      const likeCount = metrics.like_count ?? 0;
      const commentCount = metrics.comments_count ?? 0;
      const score = computeScore(likeCount, commentCount);

      await supabase
        .from('instagram_posts')
        .update({ like_count: likeCount, comment_count: commentCount, last_checked_at: new Date().toISOString() })
        .eq('id', post.id);

      if (post.product_id) {
        await supabase.from('products').update({ engagement_score: score }).eq('id', post.product_id);
      }
      results.updated++;

      const postedAt = post.posted_at ? new Date(post.posted_at) : null;
      const hoursOld = postedAt ? (Date.now() - postedAt.getTime()) / (1000 * 60 * 60) : 0;

      if (hoursOld >= REVIEW_AFTER_HOURS && score < MIN_ENGAGEMENT_SCORE) {
        await deleteInstagramPost(post.post_id);
        await supabase
          .from('instagram_posts')
          .update({ status: 'taken_down', taken_down_at: new Date().toISOString() })
          .eq('id', post.id);
        if (post.product_id) {
          await supabase.from('products').update({ posted_to_instagram: false }).eq('id', post.product_id);
        }
        results.takenDown++;
      }
    } catch (err) {
      results.errors.push({ post_id: post.post_id, error: String(err) });
    }
  }

  return results;
}

// Learning loop: pull the best-performing recent captions in this category
// to use as style examples for the next caption.
export async function getTopPerformingExamples(supabase, category, limit = 3) {
  const { data: catProducts } = await supabase.from('products').select('id').eq('category', category);
  const ids = (catProducts || []).map((p) => p.id);
  if (ids.length === 0) return [];

  const { data: posts } = await supabase
    .from('instagram_posts')
    .select('caption, hashtags, like_count, comment_count')
    .in('product_id', ids)
    .eq('status', 'posted')
    .not('caption', 'is', null);

  return (posts || [])
    .map((p) => ({ ...p, score: computeScore(p.like_count, p.comment_count) }))
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
