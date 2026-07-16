export default function ProductCard({ product }) {
  return (
    <div className="product-card glass">
      <div className="product-card-image">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt={product.name} loading="lazy" />
        ) : (
          <div className="product-card-image-fallback">
            <span className="mono">{product.brand}</span>
          </div>
        )}
      </div>
      <div className="brand">{product.brand}</div>
      <h3>{product.name}</h3>
      <div className="desc">{product.description}</div>
      <div className="footer-row">
        <div className="price">
          {product.price ? `$${Number(product.price).toFixed(0)} CAD` : 'See price'}
        </div>
        <a className="visit" href={product.product_url} target="_blank" rel="noopener noreferrer">
          Visit →
        </a>
      </div>
    </div>
  );
}
