'use client';

import { useEffect, useState } from 'react';

const STATUS_COLORS = {
  not_found: 'var(--parchment-dim)',
  found: 'var(--lake)',
  applied: '#e0c068',
  approved: '#6ea86e',
  rejected: '#e08080',
};

export default function AffiliatePrograms() {
  const [statuses, setStatuses] = useState([]);
  const [unscanned, setUnscanned] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanningBrand, setScanningBrand] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/affiliates');
    const data = await res.json();
    setStatuses(data.statuses || []);
    setUnscanned(data.unscanned || []);
    setLoading(false);
  }

  async function scanBrand(brand) {
    setScanningBrand(brand);
    await fetch('/api/admin/affiliates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand }),
    });
    setScanningBrand(null);
    load();
  }

  async function updateStatus(brand, updates) {
    await fetch('/api/admin/affiliates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand, updates }),
    });
    setStatuses((prev) => prev.map((s) => (s.brand === brand ? { ...s, ...updates } : s)));
  }

  if (loading) return <div className="empty-state">Loading…</div>;

  return (
    <div>
      <div style={{ marginBottom: 20, padding: 14, background: 'var(--pine-light)', border: '1px solid rgba(241,236,224,0.12)', borderRadius: 4, fontSize: 13, color: 'var(--parchment-dim)' }}>
        This finds and tracks affiliate programs — it can&apos;t submit application forms for you
        (most require manual review). Scan a brand to find their program, apply yourself on their
        site, then set the status here to Applied → Approved once confirmed. Only <strong style={{ color: 'var(--parchment)' }}>Approved</strong> brands
        are eligible for Instagram auto-posting.
      </div>

      {unscanned.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--lake)', textTransform: 'uppercase', marginBottom: 10 }}>
            Not yet scanned ({unscanned.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {unscanned.map((brand) => (
              <button
                key={brand}
                onClick={() => scanBrand(brand)}
                disabled={scanningBrand === brand}
                className="mono"
                style={{ fontSize: 12, padding: '7px 12px', borderRadius: 4, border: '1px solid var(--ember)', background: 'transparent', color: 'var(--ember)', cursor: 'pointer' }}
              >
                {scanningBrand === brand ? 'Scanning…' : `Scan "${brand}"`}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {statuses.map((s) => (
          <div key={s.brand} style={{ padding: 16, background: 'var(--pine-light)', border: '1px solid rgba(241,236,224,0.1)', borderRadius: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{s.brand}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--parchment-dim)' }}>
                  {s.network || 'network unknown'}
                  {s.program_url && (
                    <> · <a href={s.program_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ember)' }}>program page</a></>
                  )}
                </div>
              </div>
              <select
                value={s.status}
                onChange={(e) => updateStatus(s.brand, { status: e.target.value })}
                className="mono"
                style={{ fontSize: 11, padding: '6px 10px', borderRadius: 3, border: `1px solid ${STATUS_COLORS[s.status]}`, background: 'transparent', color: STATUS_COLORS[s.status], textTransform: 'uppercase' }}
              >
                {Object.keys(STATUS_COLORS).map((st) => <option key={st} value={st}>{st.replace('_', ' ')}</option>)}
              </select>
            </div>
            {s.notes && <div style={{ fontSize: 13, color: 'var(--parchment-dim)', marginBottom: 8 }}>{s.notes}</div>}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                type="number"
                defaultValue={s.commission_pct ?? ''}
                placeholder="commission %"
                onBlur={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  if (val !== s.commission_pct) updateStatus(s.brand, { commission_pct: val });
                }}
                className="mono"
                style={{ width: 100, fontSize: 12, padding: '6px 8px', background: 'var(--pine)', border: '1px solid rgba(241,236,224,0.15)', borderRadius: 3, color: 'var(--parchment)' }}
              />
              <button
                onClick={() => scanBrand(s.brand)}
                disabled={scanningBrand === s.brand}
                className="mono"
                style={{ fontSize: 11, padding: '6px 10px', borderRadius: 3, border: '1px solid rgba(241,236,224,0.2)', background: 'transparent', color: 'var(--parchment-dim)', cursor: 'pointer' }}
              >
                {scanningBrand === s.brand ? 'Rescanning…' : 'Rescan'}
              </button>
            </div>
          </div>
        ))}
        {statuses.length === 0 && unscanned.length === 0 && (
          <div className="empty-state">No brands yet — add some products first.</div>
        )}
      </div>
    </div>
  );
}
