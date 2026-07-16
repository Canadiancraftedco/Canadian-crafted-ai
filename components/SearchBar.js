'use client';

import { useEffect, useRef, useState } from 'react';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    timeoutRef.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.products || []);
      setLoading(false);
      setOpen(true);
    }, 300);

    return () => clearTimeout(timeoutRef.current);
  }, [query]);

  return (
    <div className="search-bar-wrap" ref={containerRef}>
      <div className="glass search-bar">
        <span className="mono search-icon">⌕</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search products, brands, categories…"
        />
        {loading && <span className="dot pulsing" />}
      </div>

      {open && results.length > 0 && (
        <div className="glass search-results">
          {results.map((p) => (
            <a href={p.product_url} target="_blank" rel="noopener noreferrer" className="search-result-item" key={p.id}>
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt="" />
              ) : (
                <div className="search-result-fallback mono">{p.brand?.[0]}</div>
              )}
              <div>
                <div className="mono search-result-brand">{p.brand}</div>
                <div className="search-result-name">{p.name}</div>
              </div>
            </a>
          ))}
        </div>
      )}

      {open && query.trim().length >= 2 && !loading && results.length === 0 && (
        <div className="glass search-results">
          <div className="mono search-empty">No matches for &quot;{query}&quot;</div>
        </div>
      )}
    </div>
  );
}
