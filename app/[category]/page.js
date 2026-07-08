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
      <section className="hero" style={{ paddingBottom: 30 }}>
        <div className="eyebrow">Category</div>
        <h1 style={{ fontSize: 42 }}>{category.label}</h1>
        <p>{category.tagline}</p>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="section-header">
          <h2>All {category.label.toLowerCase()} products</h2>
          <div className="count">{products.length} verified</div>
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
