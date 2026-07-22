'use client';

import { useState, useEffect, useRef } from 'react';
import { Button, Input, GlassCard, EmptyState } from '@/components/ui';

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast', icon: '🍳' },
  { key: 'lunch', label: 'Lunch', icon: '🥪' },
  { key: 'dinner', label: 'Dinner', icon: '🍲' },
  { key: 'snacks', label: 'Snacks', icon: '🍫' },
];

export default function TripPlannerPage() {
  const [query, setQuery] = useState('');
  const [parks, setParks] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedPark, setSelectedPark] = useState(null);

  const [trails, setTrails] = useState(null);
  const [loadingTrails, setLoadingTrails] = useState(false);

  const [people, setPeople] = useState(4);
  const [days, setDays] = useState(3);
  const [dietary, setDietary] = useState('');
  const [mealPlan, setMealPlan] = useState(null);
  const [loadingMeals, setLoadingMeals] = useState(false);

  const [groceryList, setGroceryList] = useState(null);
  const [loadingGrocery, setLoadingGrocery] = useState(false);

  const [stores, setStores] = useState(null);
  const [storeStatus, setStoreStatus] = useState('idle');

  const timeoutRef = useRef(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (query.trim().length < 3) {
      setParks([]);
      return;
    }
    setSearching(true);
    timeoutRef.current = setTimeout(async () => {
      const res = await fetch(`/api/trip/search-parks?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setParks(data.parks || []);
      setSearching(false);
    }, 500);
    return () => clearTimeout(timeoutRef.current);
  }, [query]);

  async function selectPark(park) {
    setSelectedPark(park);
    setTrails(null);
    setLoadingTrails(true);
    const res = await fetch(`/api/trip/trails?park=${encodeURIComponent(park.name)}`);
    const data = await res.json();
    setTrails(data.trails || []);
    setLoadingTrails(false);
  }

  async function generateMealPlan(e) {
    e.preventDefault();
    setLoadingMeals(true);
    setMealPlan(null);
    setGroceryList(null);
    const res = await fetch('/api/trip/meal-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ people, days, dietary }),
    });
    const data = await res.json();
    setMealPlan(data.days || []);
    setLoadingMeals(false);
  }

  async function generateGroceries() {
    setLoadingGrocery(true);
    setGroceryList(null);
    const res = await fetch('/api/trip/grocery-list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ people, days, dietary, mealPlan }),
    });
    const data = await res.json();
    setGroceryList(data.categories || []);
    setLoadingGrocery(false);
  }

  function findNearbyStores() {
    setStoreStatus('locating');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const res = await fetch(`/api/trip/nearby-stores?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
        const data = await res.json();
        setStores(data.stores || []);
        setStoreStatus('ready');
      },
      () => setStoreStatus('denied'),
      { timeout: 8000 }
    );
  }

  return (
    <div className="container" style={{ paddingBottom: 80 }}>
      <div className="trip-banner">
        <span className="trip-banner-icon">🏕️</span>
        <div className="section-eyebrow">Trip Planner</div>
        <h1 className="section-title" style={{ marginBottom: 8 }}>Plan a real trip, not a fantasy one.</h1>
        <p style={{ color: 'var(--parchment-dim)', fontSize: 16, maxWidth: 560, margin: 0 }}>
          Real park search, real trails, a full meal plan sized to your group, and an accurate
          grocery list — plus honest links out to actually book your site on the official system.
        </p>
      </div>

      {/* Park search */}
      <section className="section" style={{ paddingTop: 10 }}>
        <div className="section-eyebrow">🗺️ Find a park</div>
        <div style={{ position: 'relative', maxWidth: 600 }}>
          <div className="glass search-bar">
            <span className="mono search-icon">⌕</span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search parks — e.g. Algonquin, Banff, camping near Ottawa…"
            />
            {searching && <span className="dot pulsing" />}
          </div>

          {parks.length > 0 && (
            <div className="glass search-results" style={{ position: 'static', marginTop: 10 }}>
              {parks.map((p, i) => (
                <button
                  key={i}
                  onClick={() => selectPark(p)}
                  className="search-result-item"
                  style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 12 }}
                >
                  <div>
                    <div className="mono search-result-brand">{p.park_type} {p.province ? `· ${p.province}` : ''}</div>
                    <div className="search-result-name" style={{ fontWeight: 600, marginBottom: 3 }}>{p.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--parchment-dim)' }}>{p.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedPark && (
          <GlassCard padding="lg" glow="lake" style={{ marginTop: 24, maxWidth: 700 }}>
            <div className="mono" style={{ fontSize: 11, color: 'var(--lake)', textTransform: 'uppercase', marginBottom: 8 }}>
              {selectedPark.park_type} park {selectedPark.province ? `· ${selectedPark.province}` : ''}
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, margin: '0 0 10px' }}>{selectedPark.name}</h3>
            <p style={{ color: 'var(--parchment-dim)', marginBottom: 16 }}>{selectedPark.description}</p>
            <Button href={selectedPark.official_url} target="_blank" rel="noopener noreferrer" variant="primary">
              Book on official site ↗
            </Button>

            <div style={{ marginTop: 28 }}>
              <h4 className="mono" style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--parchment-dim)', marginBottom: 14 }}>
                🥾 Nearby trails
              </h4>
              {loadingTrails ? (
                <div className="mono" style={{ fontSize: 13, color: 'var(--parchment-dim)' }}>Searching for real trails…</div>
              ) : trails && trails.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {trails.map((t, i) => (
                    <a href={t.source_url} target="_blank" rel="noopener noreferrer" key={i} style={{ padding: 14, background: 'var(--pine)', borderRadius: 6, display: 'block' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <strong>{t.name}</strong>
                        <span className="mono" style={{ fontSize: 12, color: 'var(--lake)' }}>
                          {t.distance_km ? `${t.distance_km} km` : ''} {t.difficulty ? `· ${t.difficulty}` : ''}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--parchment-dim)' }}>{t.description}</div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="mono" style={{ fontSize: 13, color: 'var(--parchment-dim)' }}>No specific trails found — try the park&apos;s official site.</div>
              )}
            </div>
          </GlassCard>
        )}
      </section>

      {/* Meal planner */}
      <section className="section reveal-section">
        <div className="section-eyebrow">🍽️ Meal Planner</div>
        <h2 className="section-title">What&apos;s actually for dinner?</h2>

        <form onSubmit={generateMealPlan} className="glass" style={{ padding: 24, maxWidth: 640, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 100px' }}>
            <Input label="People" type="number" min="1" value={people} onChange={(e) => setPeople(Number(e.target.value))} />
          </div>
          <div style={{ flex: '1 1 100px' }}>
            <Input label="Days" type="number" min="1" value={days} onChange={(e) => setDays(Number(e.target.value))} />
          </div>
          <div style={{ flex: '2 1 200px' }}>
            <Input label="Dietary (optional)" value={dietary} onChange={(e) => setDietary(e.target.value)} placeholder="vegetarian, nut-free…" />
          </div>
          <Button type="submit" variant="primary" loading={loadingMeals}>Plan my meals</Button>
        </form>

        {mealPlan && mealPlan.length > 0 && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18, marginTop: 28, maxWidth: 1100 }}>
              {mealPlan.map((d) => (
                <GlassCard key={d.day} padding="none" className="day-card" holo>
                  <div className="day-card-header">Day {d.day}</div>
                  {MEAL_TYPES.map((mt) => {
                    const meal = d[mt.key];
                    if (!meal) return null;
                    return (
                      <div className="meal-row" key={mt.key}>
                        <div className={`meal-icon meal-icon-${mt.key}`}>{mt.icon}</div>
                        <div className="meal-content">
                          <div className="meal-type-label">{mt.label}</div>
                          <div className="meal-name">{meal.name}</div>
                          <div className="meal-desc">{meal.description}</div>
                        </div>
                      </div>
                    );
                  })}
                </GlassCard>
              ))}
            </div>

            <div style={{ marginTop: 28 }}>
              <Button variant="ghost" onClick={generateGroceries} loading={loadingGrocery}>
                🛒 Generate grocery list from this plan
              </Button>
            </div>
          </>
        )}

        {groceryList && groceryList.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginTop: 24, maxWidth: 900 }}>
            {groceryList.map((cat, i) => (
              <GlassCard key={i} padding="md">
                <div className="mono" style={{ fontSize: 11, color: 'var(--lake)', textTransform: 'uppercase', marginBottom: 10 }}>{cat.category}</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {cat.items.map((item, j) => (
                    <li key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span>{item.name}</span>
                      <span className="mono" style={{ color: 'var(--parchment-dim)' }}>{item.quantity}</span>
                    </li>
                  ))}
                </ul>
              </GlassCard>
            ))}
          </div>
        )}
      </section>

      {/* Nearby grocery stores */}
      <section className="section reveal-section">
        <div className="section-eyebrow">📍 Stock Up</div>
        <h2 className="section-title">Find a grocery store near you</h2>
        <Button variant="secondary" onClick={findNearbyStores} loading={storeStatus === 'locating'}>
          Find stores near me
        </Button>

        {storeStatus === 'denied' && (
          <div style={{ marginTop: 14 }}>
            <EmptyState title="Location access denied" description="Can't search nearby stores without it." />
          </div>
        )}

        {stores && stores.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20, maxWidth: 500 }}>
            {stores.map((s, i) => (
              <GlassCard key={i} padding="sm" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{s.name}</div>
                  {s.address && <div style={{ fontSize: 12, color: 'var(--parchment-dim)' }}>{s.address}</div>}
                </div>
                <div className="mono" style={{ fontSize: 13, color: 'var(--lake)' }}>{s.distanceKm} km</div>
              </GlassCard>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
