'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('unverified'); // unverified | verified | all
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [postingId, setPostingId] = useState(null);
  const [postResult, setPostResult] = useState(null);
  const [previewingId, setPreviewingId] = useState(null);
  const [previews, setPreviews] = useState({});
  const router = useRouter();

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    const res = await fetch('/api/admin/products');
    if (res.status === 401) {
      router.push('/admin/login');
      return;
    }
    const data = await res.json();
    setProducts(data.products || []);
    setLoading(false);
  }

  async function updateProduct(id, updates) {
    setSavingId(id);
    await fetch('/api/admin/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, updates }),
    });
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    setSavingId(null);
  }

  async function deleteProduct(id) {
    if (!confirm('Delete this product permanently?')) return;
    await fetch('/api/admin/products', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  async function previewCaption(product) {
    setPreviewingId(product.id);
    const res = await fetch('/api/admin/preview-caption', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product }),
    });
    const data = await res.json();
    setPreviews((prev) => ({ ...prev, [product.id]: data.ok ? data : { error: data.error } }));
    setPreviewingId(null);
  }

  async function postToInstagram(id) {
    setPostingId(id);
    setPostResult(null);
    const res = await fetch('/api/admin/instagram-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    setPostResult({ id, ...data });
    if (data.ok) {
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, posted_to_instagram: true } : p)));
    }
    setPostingId(null);
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  const visible = products.filter((p) => {
    if (filter === 'unverified' && p.canada_verified) return false;
    if (filter === 'verified' && !p.canada_verified) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const haystack = `${p.name} ${p.brand} ${p.category} ${p.description || ''}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
        <div>
          <div className="eyebrow">Admin</div>
          <h1 style={{ fontSize: 28, margin: 0 }}>Product review</h1>
        </div>
        <button onClick={logout} className="mono" style={{ background: 'none', border: '1px solid rgba(241,236,224,0.2)', color: 'var(--parchment-dim)', padding: '8px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
          Log out
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="mono" style={{ display: 'flex', gap: 10 }}>
          {['unverified', 'verified', 'all'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '7px 14px',
                borderRadius: 4,
                border: `1px solid ${filter === f ? 'var(--ember)' : 'rgba(241,236,224,0.2)'}`,
                background: filter === f ? 'var(--ember)' : 'transparent',
                color: filter === f ? 'var(--ink)' : 'var(--parchment-dim)',
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                cursor: 'pointer',
              }}
            >
              {f} ({f === 'all' ? products.length : products.filter((p) => (f === 'verified' ? p.canada_verified : !p.canada_verified)).length})
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, brand, category…"
          className="mono"
          style={{
            flexGrow: 1,
            minWidth: 200,
            padding: '8px 12px',
            background: 'var(--pine-light)',
            border: '1px solid rgba(241,236,224,0.2)',
            borderRadius: 4,
            color: 'var(--parchment)',
            fontSize: 12,
          }}
        />
      </div>

      {loading ? (
        <div className="empty-state">Loading…</div>
      ) : visible.length === 0 ? (
        <div className="empty-state">Nothing here.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {visible.map((p) => (
            <div key={p.id} style={{ display: 'flex', gap: 16, padding: 16, background: 'var(--pine-light)', border: '1px solid rgba(241,236,224,0.1)', borderRadius: 4, alignItems: 'flex-start' }}>
              <div style={{ flexShrink: 0, width: 70 }}>
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt="" style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: 4 }} />
                ) : (
                  <div className="mono" style={{ width: 70, height: 70, background: 'var(--pine)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--parchment-dim)', textAlign: 'center' }}>
                    no image
                  </div>
                )}
                <input
                  type="text"
                  defaultValue={p.image_url || ''}
                  placeholder="paste image URL"
                  onBlur={(e) => {
                    const val = e.target.value.trim();
                    if (val !== (p.image_url || '')) updateProduct(p.id, { image_url: val || null });
                  }}
                  className="mono"
                  style={{
                    width: 70,
                    marginTop: 6,
                    fontSize: 9,
                    padding: '4px 5px',
                    background: 'var(--pine)',
                    border: '1px solid rgba(241,236,224,0.15)',
                    borderRadius: 3,
                    color: 'var(--parchment-dim)',
                  }}
                />
              </div>

              <div style={{ flexGrow: 1, minWidth: 0 }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--lake)', textTransform: 'uppercase', marginBottom: 2 }}>
                  {p.brand} · {p.category}
                </div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: 'var(--parchment-dim)', marginBottom: 8 }}>{p.description}</div>
                <a href={p.product_url} target="_blank" rel="noopener noreferrer" className="mono" style={{ fontSize: 11, color: 'var(--ember)' }}>
                  {p.product_url}
                </a>
                {previews[p.id] && (
                  previews[p.id].error ? (
                    <div className="mono" style={{ fontSize: 11, color: '#e08080', marginTop: 8 }}>{previews[p.id].error}</div>
                  ) : (
                    <div style={{ marginTop: 10, padding: 10, background: 'var(--pine)', borderRadius: 4, fontSize: 13 }}>
                      <div style={{ marginBottom: 6 }}>{previews[p.id].caption}</div>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--lake)' }}>{previews[p.id].hashtags?.join(' ')}</div>
                    </div>
                  )
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', flexShrink: 0 }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--parchment-dim)' }}>
                  confidence {p.canada_confidence != null ? Math.round(p.canada_confidence * 100) + '%' : '—'}
                </div>
                <button
                  onClick={() => updateProduct(p.id, { canada_verified: !p.canada_verified })}
                  disabled={savingId === p.id}
                  className="mono"
                  style={{
                    fontSize: 11,
                    padding: '6px 12px',
                    borderRadius: 3,
                    border: `1px solid ${p.canada_verified ? '#6ea86e' : 'var(--ember)'}`,
                    background: 'transparent',
                    color: p.canada_verified ? '#6ea86e' : 'var(--ember)',
                    cursor: 'pointer',
                  }}
                >
                  {p.canada_verified ? '✓ Verified' : 'Approve'}
                </button>
                <button
                  onClick={() => deleteProduct(p.id)}
                  className="mono"
                  style={{ fontSize: 11, padding: '6px 12px', borderRadius: 3, border: '1px solid rgba(224,128,128,0.4)', background: 'transparent', color: '#e08080', cursor: 'pointer' }}
                >
                  Delete
                </button>
                {p.posted_to_instagram ? (
                  <div className="mono" style={{ fontSize: 10, color: '#6ea86e' }}>✓ posted to IG</div>
                ) : (
                  <>
                    <button
                      onClick={() => previewCaption(p)}
                      disabled={previewingId === p.id}
                      className="mono"
                      style={{ fontSize: 11, padding: '6px 12px', borderRadius: 3, border: '1px solid rgba(241,236,224,0.2)', background: 'transparent', color: 'var(--parchment-dim)', cursor: 'pointer' }}
                    >
                      {previewingId === p.id ? 'Writing…' : 'Preview hook'}
                    </button>
                    <button
                      onClick={() => postToInstagram(p.id)}
                      disabled={postingId === p.id || !p.image_url}
                      title={!p.image_url ? 'Needs an image first' : ''}
                      className="mono"
                      style={{
                        fontSize: 11,
                        padding: '6px 12px',
                        borderRadius: 3,
                        border: `1px solid ${p.image_url ? 'var(--lake)' : 'rgba(241,236,224,0.15)'}`,
                        background: 'transparent',
                        color: p.image_url ? 'var(--lake)' : 'var(--parchment-dim)',
                        cursor: p.image_url ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {postingId === p.id ? 'Posting…' : 'Post to Instagram'}
                    </button>
                  </>
                )}
                {postResult?.id === p.id && (
                  <div className="mono" style={{ fontSize: 10, color: postResult.ok ? '#6ea86e' : '#e08080', maxWidth: 140, textAlign: 'right' }}>
                    {postResult.ok ? 'Posted!' : (postResult.error || 'Failed')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
