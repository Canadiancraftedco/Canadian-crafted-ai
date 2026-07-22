'use client';

import { useEffect, useState } from 'react';

const STATUS_COLORS = {
  pending: 'var(--parchment-dim)',
  rendering: '#e0c068',
  posted: '#6ea86e',
  failed: '#e08080',
  taken_down: '#e0c068',
};

export default function InstagramPerformance() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [checkingReelId, setCheckingReelId] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/instagram-posts');
    const data = await res.json();
    setPosts(data.posts || []);
    setLoading(false);
  }

  async function checkEngagement() {
    setChecking(true);
    setCheckResult(null);
    const res = await fetch('/api/admin/engagement-check', { method: 'POST' });
    const data = await res.json();
    setCheckResult(data);
    setChecking(false);
    load();
  }

  async function checkReel(postId) {
    setCheckingReelId(postId);
    await fetch('/api/admin/check-reel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId }),
    });
    setCheckingReelId(null);
    load();
  }

  if (loading) return <div className="empty-state">Loading…</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: 'var(--parchment-dim)', maxWidth: 480 }}>
          Posts are auto-checked and pruned daily. Reels rendering in the background also
          advance automatically on the daily cron — the button below is for checking sooner.
        </div>
        <button
          onClick={checkEngagement}
          disabled={checking}
          className="mono"
          style={{ fontSize: 12, padding: '9px 16px', background: 'var(--lake)', border: 'none', borderRadius: 4, color: 'var(--ink)', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
        >
          {checking ? 'Checking…' : 'Check engagement now'}
        </button>
      </div>

      {checkResult && (
        <div className="mono" style={{ fontSize: 11, color: 'var(--parchment-dim)', marginBottom: 16 }}>
          {checkResult.ok
            ? `Checked ${checkResult.checked}, updated ${checkResult.updated}, took down ${checkResult.takenDown}.`
            : (checkResult.error || 'Check failed')}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {posts.map((post) => {
          const score = (post.like_count || 0) + (post.comment_count || 0) * 3;
          const isReel = post.post_type === 'reel';
          return (
            <div key={post.id} style={{ display: 'flex', gap: 14, padding: 14, background: 'var(--pine-light)', border: '1px solid rgba(241,236,224,0.1)', borderRadius: 4, alignItems: 'flex-start' }}>
              {post.products?.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.products.image_url} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
              ) : (
                <div style={{ width: 56, height: 56, background: 'var(--pine)', borderRadius: 4, flexShrink: 0 }} />
              )}
              <div style={{ flexGrow: 1, minWidth: 0 }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--lake)', textTransform: 'uppercase', marginBottom: 2 }}>
                  {isReel ? '🎬 REEL · ' : ''}{post.products?.brand} · {post.products?.category}
                </div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{post.products?.name}</div>
                {post.caption && <div style={{ fontSize: 12, color: 'var(--parchment-dim)' }}>{post.caption}</div>}
                {isReel && post.status === 'rendering' && (
                  <button
                    onClick={() => checkReel(post.id)}
                    disabled={checkingReelId === post.id}
                    className="mono"
                    style={{ marginTop: 8, fontSize: 11, padding: '5px 10px', borderRadius: 3, border: '1px solid var(--lake)', background: 'transparent', color: 'var(--lake)', cursor: 'pointer' }}
                  >
                    {checkingReelId === post.id ? 'Checking…' : 'Check render status'}
                  </button>
                )}
              </div>
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <div className="mono" style={{ fontSize: 11, padding: '4px 10px', borderRadius: 3, border: `1px solid ${STATUS_COLORS[post.status]}`, color: STATUS_COLORS[post.status], marginBottom: 6, textTransform: 'uppercase' }}>
                  {post.status?.replace('_', ' ')}
                </div>
                <div className="mono" style={{ fontSize: 12 }}>
                  ♥ {post.like_count || 0} · 💬 {post.comment_count || 0}
                </div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--parchment-dim)' }}>score {score}</div>
              </div>
            </div>
          );
        })}
        {posts.length === 0 && <div className="empty-state">No Instagram posts yet.</div>}
      </div>
    </div>
  );
}
