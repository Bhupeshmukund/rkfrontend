import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import "./Product.css";
import { api, API_BASE } from "../../api";

const CategoryProducts = () => {
  const { slug } = useParams();

  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    Promise.all([
      api.getCategoryProducts(slug),
      api.getCategories()
    ])
      .then(([categoryRes, categoriesRes]) => {
        if (!active) return;
        setCategory(categoryRes.category);
        // Filter to ensure only active products are displayed
        const activeProducts = (categoryRes.products || []).filter(
          product => product.isActive !== 0 && product.isActive !== false
        );
        setProducts(activeProducts);
        setAllCategories(categoriesRes.categories || []);
      })
      .catch(err => {
        console.error("Category page load failed", err);
        if (!active) return;
        setError("Unable to load category right now.");
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [slug]);

  return (
    <>
      {loading && <div className="category-banner"><h1>Loading...</h1></div>}
      {!loading && !category && (
        <div className="category-banner"><h1>Category not found</h1></div>
      )}
      {!loading && category && (
        <div className="category-banner">
          <h1>{category?.name}</h1>
        </div>
      )}

      <div className="category-layout">

       <div className="products-section">
  <div className="product-grid">
    {error && <p className="error">{error}</p>}
    {!error && !products.length && !loading && (
      <p>No products found in this category yet.</p>
    )}
    {!error && products.map(product => {
      // Additional safety check - skip inactive products
      if (product.isActive === 0 || product.isActive === false) {
        return null;
      }
      const image = product.image?.startsWith("http")
        ? product.image
        : `${API_BASE}${product.image}`;
      return (
        <Link
          key={product.id}
          to={`/product/${product.id}`}
          className="product-card"
        >
          <img src={image} alt={product.name} />
          <h3>{product.name}</h3>
          <p className="price">{product.priceRange}</p>
        </Link>
      );
    })}
  </div>
</div>


        {/* SIDEBAR */}
        <aside className="category-sidebar">
          <h3>OTHER PRODUCTS</h3>

          {allCategories.map(cat => (
            <Link
              key={cat.id}
              to={`/category/${cat.slug}`}
              className={`sidebar-link ${
                cat.slug === slug ? "active" : ""
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </aside>

      </div>
    </>
  );
};

export default CategoryProducts;
