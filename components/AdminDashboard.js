'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Modal, Input, Select, EmptyState } from './ui';

const CATEGORY_LIST = ['outdoors', 'health', 'family', 'fitness'];

export default function AdminDashboard({ embedded = false }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('unverified'); // unverified | verified | all
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [postingId, setPostingId] = useState(null);
  const [postResult, setPostResult] = useState(null);
  const [previewingId, setPreviewingId] = useState(null);
  const [previews, setPreviews] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', brand: '', category: 'outdoors', price: '', description: '', product_url: '', image_url: '' });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [trendQuery, setTrendQuery] = useState('');
  const [trendCategory, setTrendCategory] = useState('outdoors');
  const [trendSearching, setTrendSearching] = useState(false);
  const [trendResult, setTrendResult] = useState(null);
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState(null);
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

  async function createProduct(e) {
    e.preventDefault();
    setAddError('');
    if (!newProduct.name || !newProduct.brand || !newProduct.product_url) {
      setAddError('Name, brand, and product URL are required.');
      return;
    }
    setAddSaving(true);
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newProduct,
        price: newProduct.price ? Number(newProduct.price) : null,
      }),
    });
    const data = await res.json();
    setAddSaving(false);
    if (!res.ok) {
      setAddError(data.error || 'Failed to create product');
      return;
    }
    setProducts((prev) => [data.product, ...prev]);
    setNewProduct({ name: '', brand: '', category: 'outdoors', price: '', description: '', product_url: '', image_url: '' });
    setShowAddForm(false);
  }

  async function saveEdit(e) {
    e.preventDefault();
    setEditError('');
    if (!editingProduct.name || !editingProduct.brand) {
      setEditError('Name and brand are required.');
      return;
    }
    setEditSaving(true);
    const { id, ...updates } = editingProduct;
    const res = await fetch('/api/admin/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, updates }),
    });
    setEditSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setEditError(data.error || 'Failed to save');
      return;
    }
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    setEditingProduct(null);
  }

  async function runTrendSearch() {
    if (!trendQuery.trim()) return;
    setTrendSearching(true);
    setTrendResult(null);
    const res = await fetch('/api/admin/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: trendQuery, category: trendCategory }),
    });
    const data = await res.json();
    setTrendResult(data);
    setTrendSearching(false);
    if (data.ok && data.inserted > 0) {
      loadProducts();
    }
  }

  async function runBackfill() {
    setBackfilling(true);
    setBackfillResult(null);
    const res = await fetch('/api/admin/backfill-images', { method: 'POST' });
    const data = await res.json();
    setBackfillResult(data);
    setBackfilling(false);
    if (data.ok && data.updated > 0) loadProducts();
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

  const Wrapper = embedded ? 'div' : 'div';
  const wrapperProps = embedded ? {} : { className: 'container', style: { paddingTop: 40, paddingBottom: 60 } };

  return (
    <Wrapper {...wrapperProps}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
        {!embedded && (
          <div>
            <div className="eyebrow">Admin</div>
            <h1 style={{ fontSize: 28, margin: 0 }}>Product review</h1>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
          <Button variant="primary" size="sm" onClick={() => setShowAddForm(true)}>+ Add product</Button>
          {!embedded && (
            <Button variant="secondary" size="sm" onClick={logout}>Log out</Button>
          )}
        </div>
      </div>

      {/* Database index / stats overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 28 }}>
        {[
          { label: 'Total products', value: products.length },
          { label: 'Verified', value: products.filter((p) => p.canada_verified).length },
          { label: 'Pending review', value: products.filter((p) => !p.canada_verified).length },
          { label: 'Posted to IG', value: products.filter((p) => p.posted_to_instagram).length },
          { label: 'Missing image', value: products.filter((p) => !p.image_url).length },
          ...CATEGORY_LIST.map((c) => ({ label: c, value: products.filter((p) => p.category === c).length })),
        ].map((stat) => (
          <div key={stat.label} style={{ padding: '12px 14px', background: 'var(--pine-light)', border: '1px solid rgba(241,236,224,0.1)', borderRadius: 4 }}>
            <div style={{ fontSize: 22, fontWeight: 600 }}>{stat.value}</div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--parchment-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 24, padding: 16, background: 'var(--pine-light)', border: '1px solid rgba(241,236,224,0.12)', borderRadius: 4 }}>
        <div className="mono" style={{ fontSize: 11, color: 'var(--lake)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
          Search the web for trending products
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            type="text"
            value={trendQuery}
            onChange={(e) => setTrendQuery(e.target.value)}
            placeholder="e.g. trending Canadian camping gear 2026"
            className="mono"
            style={{ flexGrow: 1, minWidth: 220, padding: '9px 12px', background: 'var(--pine)', border: '1px solid rgba(241,236,224,0.2)', borderRadius: 4, color: 'var(--parchment)', fontSize: 12 }}
          />
          <select
            value={trendCategory}
            onChange={(e) => setTrendCategory(e.target.value)}
            className="mono"
            style={{ padding: '9px 12px', background: 'var(--pine)', border: '1px solid rgba(241,236,224,0.2)', borderRadius: 4, color: 'var(--parchment)', fontSize: 12 }}
          >
            {CATEGORY_LIST.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            onClick={runTrendSearch}
            disabled={trendSearching || !trendQuery.trim()}
            className="mono"
            style={{ padding: '9px 18px', background: 'var(--ember)', border: 'none', borderRadius: 4, color: 'var(--ink)', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}
          >
            {trendSearching ? 'Searching…' : 'Search web'}
          </button>
        </div>
        {trendResult && (
          <div className="mono" style={{ marginTop: 10, fontSize: 11, color: trendResult.ok ? 'var(--parchment-dim)' : '#e08080' }}>
            {trendResult.ok
              ? `Found ${trendResult.found} candidate(s) from ${trendResult.searchResultCount} search results — ${trendResult.inserted} new added to the database (unverified, review above).`
              : (trendResult.error || 'Search failed')}
          </div>
        )}
      </div>

      <div style={{ marginBottom: 24, padding: 16, background: 'var(--pine-light)', border: '1px solid rgba(241,236,224,0.12)', borderRadius: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div className="mono" style={{ fontSize: 11, color: 'var(--lake)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Missing images: {products.filter((p) => !p.image_url).length}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {backfillResult && (
            <div className="mono" style={{ fontSize: 11, color: 'var(--parchment-dim)' }}>
              {backfillResult.ok ? `Checked ${backfillResult.checked}, found ${backfillResult.updated}` : backfillResult.error}
            </div>
          )}
          <button
            onClick={runBackfill}
            disabled={backfilling}
            className="mono"
            style={{ padding: '9px 16px', background: 'var(--lake)', border: 'none', borderRadius: 4, color: 'var(--ink)', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}
          >
            {backfilling ? 'Searching…' : 'Find images now'}
          </button>
        </div>
      </div>

      <Modal open={showAddForm} onClose={() => { setShowAddForm(false); setAddError(''); }} title="Add product">
        <form onSubmit={createProduct}>
          <Input label="Product name" required value={newProduct.name} onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))} />
          <Input label="Brand" required value={newProduct.brand} onChange={(e) => setNewProduct((p) => ({ ...p, brand: e.target.value }))} />
          <Select label="Category" options={CATEGORY_LIST} value={newProduct.category} onChange={(e) => setNewProduct((p) => ({ ...p, category: e.target.value }))} />
          <Input label="Price (CAD)" type="number" hint="Optional" value={newProduct.price} onChange={(e) => setNewProduct((p) => ({ ...p, price: e.target.value }))} />
          <Input label="Description" as="textarea" value={newProduct.description} onChange={(e) => setNewProduct((p) => ({ ...p, description: e.target.value }))} />
          <Input label="Product URL" required value={newProduct.product_url} onChange={(e) => setNewProduct((p) => ({ ...p, product_url: e.target.value }))} />
          <Input label="Image URL" hint="Optional" value={newProduct.image_url} onChange={(e) => setNewProduct((p) => ({ ...p, image_url: e.target.value }))} />

          {addError && <div className="field-desc-error mono" style={{ marginBottom: 12 }}>{addError}</div>}

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Button type="submit" variant="primary" loading={addSaving} fullWidth>Save product</Button>
            <Button type="button" variant="secondary" onClick={() => { setShowAddForm(false); setAddError(''); }}>Cancel</Button>
          </div>
        </form>
      </Modal>

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
        <EmptyState title="Loading…" />
      ) : visible.length === 0 ? (
        <EmptyState title="Nothing here" description="Try a different filter or search term." />
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

              <div style={{ flexGrow: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setEditingProduct({ ...p })}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--lake)', textTransform: 'uppercase', marginBottom: 2 }}>
                  {p.brand} · {p.category}
                </div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{p.name}</div>
                <div style={{ fontSize: 13, color: 'var(--parchment-dim)', marginBottom: 8 }}>{p.description}</div>
                <a href={p.product_url} target="_blank" rel="noopener noreferrer" className="mono" style={{ fontSize: 11, color: 'var(--ember)' }} onClick={(e) => e.stopPropagation()}>
                  {p.product_url}
                </a>
                {previews[p.id] && (
                  previews[p.id].error ? (
                    <div className="mono" style={{ fontSize: 11, color: '#e08080', marginTop: 8 }}>{previews[p.id].error}</div>
                  ) : (
                    <div style={{ marginTop: 10, padding: 10, background: 'var(--pine)', borderRadius: 4, fontSize: 13, border: '1px solid var(--lake)' }}>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--lake)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Generated hook</div>
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
                      style={{
                        fontSize: 11,
                        padding: '6px 12px',
                        borderRadius: 3,
                        border: '1px solid var(--lake)',
                        background: previews[p.id] ? 'transparent' : 'var(--lake)',
                        color: previews[p.id] ? 'var(--lake)' : 'var(--ink)',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {previewingId === p.id ? 'Writing…' : previews[p.id] ? 'Regenerate hook' : '✎ Generate hook'}
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
      <Modal open={!!editingProduct} onClose={() => setEditingProduct(null)} title="Edit product">
        {editingProduct && (
          <form onSubmit={saveEdit}>
            <Input label="Product name" required value={editingProduct.name || ''} onChange={(e) => setEditingProduct((p) => ({ ...p, name: e.target.value }))} />
            <Input label="Brand" required value={editingProduct.brand || ''} onChange={(e) => setEditingProduct((p) => ({ ...p, brand: e.target.value }))} />
            <Select label="Category" options={CATEGORY_LIST} value={editingProduct.category || 'outdoors'} onChange={(e) => setEditingProduct((p) => ({ ...p, category: e.target.value }))} />
            <Input label="Price (CAD)" type="number" value={editingProduct.price ?? ''} onChange={(e) => setEditingProduct((p) => ({ ...p, price: e.target.value ? Number(e.target.value) : null }))} />
            <Input label="Description" as="textarea" value={editingProduct.description || ''} onChange={(e) => setEditingProduct((p) => ({ ...p, description: e.target.value }))} />
            <Input label="Product URL" value={editingProduct.product_url || ''} onChange={(e) => setEditingProduct((p) => ({ ...p, product_url: e.target.value }))} />
            <Input label="Image URL" value={editingProduct.image_url || ''} onChange={(e) => setEditingProduct((p) => ({ ...p, image_url: e.target.value }))} />

            <label className="mono" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--parchment-dim)', marginBottom: 16, cursor: 'pointer' }}>
              <input type="checkbox" checked={!!editingProduct.canada_verified} onChange={(e) => setEditingProduct((p) => ({ ...p, canada_verified: e.target.checked }))} />
              Verified Canadian product
            </label>

            {editError && <div className="field-desc-error mono" style={{ marginBottom: 12 }}>{editError}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <Button type="submit" variant="primary" loading={editSaving} fullWidth>Save changes</Button>
              <Button type="button" variant="secondary" onClick={() => setEditingProduct(null)}>Cancel</Button>
              <Button type="button" variant="danger" onClick={() => { deleteProduct(editingProduct.id); setEditingProduct(null); }}>Delete</Button>
            </div>
          </form>
        )}
      </Modal>
    </Wrapper>
  );
}
