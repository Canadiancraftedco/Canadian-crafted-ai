'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SearchBar from './SearchBar';
import LocationWeather from './LocationWeather';

const HeroScene = dynamic(() => import('./HeroScene'), { ssr: false });

export default function CinematicHome({ categories, featured, pool }) {
  const containerRef = useRef(null);
  const heroTitleRef = useRef(null);
  const [condition, setCondition] = useState(null);

  const handleCondition = useCallback((c) => setCondition(c), []);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      if (!prefersReducedMotion) {
        const words = heroTitleRef.current?.querySelectorAll('.word-inner');
        if (words?.length) {
          gsap.set(words, { yPercent: 110 });
          gsap.to(words, { yPercent: 0, duration: 1.1, ease: 'power4.out', stagger: 0.08, delay: 0.2 });
        }

        gsap.from('.hero-fade', { opacity: 0, y: 16, duration: 1, ease: 'power3.out', stagger: 0.12, delay: 0.7 });

        gsap.utils.toArray('.reveal-section').forEach((section) => {
          const items = section.querySelectorAll('.reveal-item');
          gsap.from(items, {
            opacity: 0, y: 40, duration: 0.9, ease: 'power3.out', stagger: 0.08,
            scrollTrigger: { trigger: section, start: 'top 78%', toggleActions: 'play none none reverse' },
          });
        });
      } else {
        gsap.set('.word-inner, .hero-fade, .reveal-item', { opacity: 1, y: 0, yPercent: 0 });
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const recommended = useMemo(() => {
    const source = pool && pool.length > 0 ? pool : featured;
    if (!condition) return featured;

    const matching = source.filter((p) => p.weather_tags?.includes(condition));
    const agnostic = source.filter((p) => !p.weather_tags || p.weather_tags.length === 0);
    const rest = source.filter((p) => p.weather_tags?.length > 0 && !p.weather_tags.includes(condition));

    return [...matching, ...agnostic, ...rest].slice(0, 8);
  }, [condition, pool, featured]);

  const sectionLabel = condition
    ? { hot: 'Picked for today\u2019s heat', cold: 'Picked for today\u2019s cold', mild: 'Picked for today\u2019s mild weather', rain: 'Picked for today\u2019s rain', snow: 'Picked for today\u2019s snow' }[condition]
    : 'Recently verified';

  const heroWords = ['An', 'AI', 'agent', 'that', 'never', 'stops', 'hunting', 'Canadian', 'gear.'];

  return (
    <div ref={containerRef}>
      <div className="hero-cinematic container">
        <HeroScene />
        <div className="eyebrow hero-fade">01 — Made / Vetted / Verified in Canada</div>
        <h1 className="hero-title" ref={heroTitleRef}>
          {heroWords.map((w, i) => (
            <span className="word" key={i}>
              <span className="word-inner">{w}&nbsp;</span>
            </span>
          ))}
        </h1>
        <p className="hero-fade">
          Outdoors, health, family, and fitness — Canadian Crafted Co. continuously
          discovers and verifies premium Canadian products so you don&apos;t have to dig.
        </p>
        <div className="hero-fade" style={{ marginBottom: 20 }}>
          <SearchBar />
        </div>
        <div className="hero-fade" style={{ marginBottom: 28 }}>
          <LocationWeather onCondition={handleCondition} />
        </div>
        <div className="hero-fade">
          <a href="#categories" className="glass" style={{ display: 'inline-block', padding: '14px 28px', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15 }}>
            Explore the catalog ↓
          </a>
        </div>
        <div className="scroll-cue hero-fade">
          <span className="line" /> Scroll
        </div>
      </div>

      <div className="container">
        <section className="section reveal-section" id="categories">
          <div className="reveal-item section-eyebrow">02 — Categories</div>
          <h2 className="reveal-item section-title">Four categories. One standard: genuinely Canadian.</h2>
          <div className="category-row">
            {categories.map((c, i) => (
              <a className="category-card glass glass-holo reveal-item" href={`/${c.slug}`} key={c.slug}>
                <span className="glass-holo-sheen" aria-hidden="true" />
                <div className="num">{String(i + 1).padStart(2, '0')}</div>
                <h3>{c.label}</h3>
                <p>{c.tagline}</p>
              </a>
            ))}
          </div>
        </section>

        <section className="section reveal-section">
          <div className="reveal-item section-eyebrow">03 — Live catalog</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 className="reveal-item section-title">{sectionLabel}</h2>
            <div className="mono reveal-item" style={{ fontSize: 12, color: 'var(--parchment-dim)' }}>{recommended.length} products</div>
          </div>
          {recommended.length > 0 ? (
            <div className="product-grid">
              {recommended.map((p) => (
                <div className="product-card glass reveal-item" key={p.id}>
                  <div className="product-card-image">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt={p.name} loading="lazy" />
                    ) : (
                      <div className="product-card-image-fallback">
                        <span className="mono">{p.brand}</span>
                      </div>
                    )}
                  </div>
                  <div className="brand">{p.brand}</div>
                  <h3>{p.name}</h3>
                  <div className="desc">{p.description}</div>
                  <div className="footer-row">
                    <div className="price">{p.price ? `$${Number(p.price).toFixed(0)} CAD` : 'See price'}</div>
                    <a className="visit" href={p.product_url} target="_blank" rel="noopener noreferrer">Visit →</a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">No verified products yet — the discovery agent is still working on it.</div>
          )}
        </section>
      </div>
    </div>
  );
}
