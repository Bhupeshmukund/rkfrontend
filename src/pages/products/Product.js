import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import "./Product.css";
import { api, API_BASE } from "../../api";
import { addToCart } from "../../utils/cart";
import ProductDetailsModal from "../../components/ProductDetailsModal/ProductDetailsModal";
import { useCurrency } from "../../contexts/CurrencyContext";
import { formatPriceRange } from "../../utils/currency";

const CategoryProducts = () => {
  const { slug } = useParams();
  const { currency, exchangeRate } = useCurrency();

  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProductForModal, setSelectedProductForModal] = useState(null);
  const [hoveredProductId, setHoveredProductId] = useState(null);

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

  // Check if product has single values for all attributes
  const hasSingleValues = (product) => {
    if (!product.variants || product.variants.length === 0) {
      return true; // No variants means single product
    }
    
    // Normalize variants to get attributes
    const normalizedVariants = product.variants.map(v => {
      const attrs = v.attributes || [];
      const attrsObj = Array.isArray(attrs)
        ? attrs.reduce((acc, a) => { if (a && a.name) acc[a.name] = a.value; return acc; }, {})
        : (typeof attrs === 'object' ? attrs : {});
      return { ...v, attributesObj: attrsObj };
    });

    // Get all attribute names
    const attributeNames = Array.from(
      new Set(normalizedVariants.flatMap(v => Object.keys(v.attributesObj)))
    );

    if (attributeNames.length === 0) {
      return true; // No attributes means single product
    }

    // Check if each attribute has only one unique value
    return attributeNames.every(name => {
      const uniqueValues = new Set(
        normalizedVariants.map(v => v.attributesObj[name]).filter(Boolean)
      );
      return uniqueValues.size === 1;
    });
  };

  // Handle direct add to cart for single-variant products
  const handleDirectAddToCart = (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!product.variants || product.variants.length === 0) {
      // Product without variants
      const cartItem = {
        id: `item_${product.id}_${Date.now()}`,
        productId: product.id,
        productName: product.name,
        variantId: null,
        variantSku: null,
        price: product.price || 0,
        qty: 1,
        image: product.image,
        attributes: []
      };
      addToCart(cartItem);
      toast.success("Product added to cart!", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    // Get the first variant (since all attributes have single values)
    const firstVariant = product.variants[0];
    const attrs = firstVariant.attributes || [];
    const attrsArray = Array.isArray(attrs)
      ? attrs.map(a => ({ name: a.name, value: a.value }))
      : Object.keys(attrs || {}).map(name => ({ name, value: attrs[name] }));

    const cartItem = {
      id: `item_${product.id}_${firstVariant.id}_${Date.now()}`,
      productId: product.id,
      productName: product.name,
      variantId: firstVariant.id,
      variantSku: firstVariant.sku,
      price: firstVariant.price,
      qty: 1,
      image: product.image,
      attributes: attrsArray
    };

    addToCart(cartItem);
    toast.success("Product added to cart!", {
      position: "top-right",
      autoClose: 3000,
    });
  };

  // Handle select variant button click
  const handleSelectVariant = (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedProductForModal(product.id);
  };

  // Close modal
  const handleCloseModal = () => {
    setSelectedProductForModal(null);
  };

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
      
      const isSingleValue = hasSingleValues(product);
      const isHovered = hoveredProductId === product.id;

      return (
        <div
          key={product.id}
          className="product-card-wrapper"
          onMouseEnter={() => setHoveredProductId(product.id)}
          onMouseLeave={() => setHoveredProductId(null)}
        >
          <Link
            to={`/product/${product.id}`}
            className="product-card"
          >
            <img src={image} alt={product.name} />
            <h3>{product.name}</h3>
            <p className="price">
              {product.priceRange 
                ? (typeof product.priceRange === 'object' && product.priceRange.min !== undefined
                  ? formatPriceRange(product.priceRange.min, product.priceRange.max, currency, exchangeRate)
                  : product.priceRange.replace(/USDT/gi, '').trim())
                : ''}
            </p>
          </Link>
          
          {/* Hover Button at Bottom */}
          {isHovered && (
            <div className="product-hover-button">
              {isSingleValue ? (
                <button
                  className="product-hover-btn add-to-cart-btn"
                  onClick={(e) => handleDirectAddToCart(e, product)}
                >
                  Add to Cart
                </button>
              ) : (
                <button
                  className="product-hover-btn select-variant-btn"
                  onClick={(e) => handleSelectVariant(e, product)}
                >
                  Select Variant
                </button>
              )}
            </div>
          )}
        </div>
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

      {/* Product Details Modal */}
      {selectedProductForModal && (
        <ProductDetailsModal
          productId={selectedProductForModal}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
};

export default CategoryProducts;
