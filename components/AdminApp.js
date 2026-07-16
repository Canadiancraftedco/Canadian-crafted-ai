'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminDashboard from './AdminDashboard';
import AffiliatePrograms from './AffiliatePrograms';
import InstagramPerformance from './InstagramPerformance';

const TABS = [
  { key: 'products', label: 'Products' },
  { key: 'affiliates', label: 'Affiliate Programs' },
  { key: 'performance', label: 'Instagram Performance' },
];

export default function AdminApp() {
  const [tab, setTab] = useState('products');
  const router = useRouter();

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <div>
          <div className="eyebrow">Admin</div>
          <h1 style={{ fontSize: 28, margin: 0 }}>Canadian Crafted Co.</h1>
        </div>
        <button onClick={logout} className="mono" style={{ background: 'none', border: '1px solid rgba(241,236,224,0.2)', color: 'var(--parchment-dim)', padding: '8px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
          Log out
        </button>
      </div>

      <div className="mono" style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '1px solid rgba(241,236,224,0.12)' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${tab === t.key ? 'var(--ember)' : 'transparent'}`,
              color: tab === t.key ? 'var(--parchment)' : 'var(--parchment-dim)',
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'products' && <AdminDashboard embedded />}
      {tab === 'affiliates' && <AffiliatePrograms />}
      {tab === 'performance' && <InstagramPerformance />}
    </div>
  );
}
