'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('unverified'); // unverified | verified | all
  const [savingId, setSavingId] = useState(null);
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

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  const visible = products.filter((p) => {
    if (filter === 'unverified') return !p.canada_verified;
    if (filter === 'verified') return p.canada_verified;
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

      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }} className="mono">
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

      {loading ? (
        <div className="empty-state">Loading…</div>
      ) : visible.length === 0 ? (
        <div className="empty-state">Nothing here.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {visible.map((p) => (
            <div key={p.id} style={{ display: 'flex', gap: 16, padding: 16, background: 'var(--pine-light)', border: '1px solid rgba(241,236,224,0.1)', borderRadius: 4, alignItems: 'flex-start' }}>
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt="" style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
              ) : (
                <div className="mono" style={{ width: 70, height: 70, background: 'var(--pine)', borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--parchment-dim)', textAlign: 'center' }}>
                  no image
                </div>
              )}

              <div style={{ flexGrow: 1, minWidth: 0 }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--lake)', textTransform: 'uppercase', marginBottom: 2 }}>
                  {p.brand} · {p.category}
                </div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: 'var(--parchment-dim)', marginBottom: 8 }}>{p.description}</div>
                <a href={p.product_url} target="_blank" rel="noopener noreferrer" className="mono" style={{ fontSize: 11, color: 'var(--ember)' }}>
                  {p.product_url}
                </a>
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
                {p.posted_to_instagram && (
                  <div className="mono" style={{ fontSize: 10, color: 'var(--parchment-dim)' }}>posted to IG</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
