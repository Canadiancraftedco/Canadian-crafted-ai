import { CATEGORIES, getProductsByCategory } from '@/lib/supabase';
import ProductCard from '@/components/ProductCard';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.slug }));
}

export default async function CategoryPage({ params }) {
  const category = CATEGORIES.find((c) => c.slug === params.category);
  if (!category) notFound();

  const products = await getProductsByCategory(category.slug);

  return (
    <div className="container">
      <section className="section" style={{ paddingBottom: 20 }}>
        <div className="section-eyebrow">Category</div>
        <h1 className="section-title" style={{ marginBottom: 12 }}>{category.label}</h1>
        <p style={{ color: 'var(--parchment-dim)', fontSize: 16, maxWidth: 480 }}>{category.tagline}</p>
      </section>

      <section className="section" style={{ paddingTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 28 }}>
          <h2 className="display" style={{ fontSize: 22, margin: 0 }}>All {category.label.toLowerCase()} products</h2>
          <div className="mono" style={{ fontSize: 12, color: 'var(--parchment-dim)' }}>{products.length} verified</div>
        </div>
        {products.length > 0 ? (
          <div className="product-grid">
            {products.map((p) => (
              <ProductCard product={p} key={p.id} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            No verified products in this category yet — the discovery agent runs continuously,
            check back soon.
          </div>
        )}
      </section>
    </div>
  );
}
