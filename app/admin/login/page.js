'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (res.ok) {
      router.push('/admin');
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || 'Login failed');
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handleSubmit} style={{ width: 320, padding: 32, border: '1px solid rgba(241,236,224,0.16)', borderRadius: 4 }}>
        <div className="eyebrow" style={{ marginBottom: 16 }}>Admin</div>
        <h1 style={{ fontSize: 24, margin: '0 0 24px' }}>Canadian Crafted Co.</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          style={{
            width: '100%',
            padding: '10px 12px',
            marginBottom: 16,
            background: 'var(--pine-light)',
            border: '1px solid rgba(241,236,224,0.2)',
            borderRadius: 4,
            color: 'var(--parchment)',
            fontSize: 15,
          }}
        />
        {error && <div style={{ color: '#e08080', fontSize: 13, marginBottom: 16 }} className="mono">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px 12px',
            background: 'var(--ember)',
            border: 'none',
            borderRadius: 4,
            color: 'var(--ink)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </div>
  );
}
