import { CATEGORIES, getFeaturedProducts } from '@/lib/supabase';
import ProductCard from '@/components/ProductCard';

export default async function Home() {
  const featured = await getFeaturedProducts(8);

  return (
    <div className="container">
      <section className="hero">
        <div className="eyebrow">01 — Made / Vetted / Verified in Canada</div>
        <h1>An AI agent that never stops looking for great Canadian gear.</h1>
        <p>
          Outdoors, health, family, and fitness — Canadian Crafted Co. continuously
          discovers and verifies premium Canadian products so you don&apos;t have to dig.
        </p>
        <div className="category-row">
          {CATEGORIES.map((c, i) => (
            <a className="category-card" href={`/${c.slug}`} key={c.slug}>
              <div className="num">{String(i + 1).padStart(2, '0')}</div>
              <h3>{c.label}</h3>
              <p>{c.tagline}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Recently verified</h2>
          <div className="count">{featured.length} products</div>
        </div>
        {featured.length > 0 ? (
          <div className="product-grid">
            {featured.map((p) => (
              <ProductCard product={p} key={p.id} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            No verified products yet — the discovery agent is still working on it.
          </div>
        )}
      </section>
    </div>
  );
}
