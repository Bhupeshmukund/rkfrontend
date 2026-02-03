import { Link, useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "./ProductPage.css";
import { api, API_BASE } from "../../api";
import { addToCart } from "../../utils/cart";
import { findExactVariant, findNearestVariant, normalizedSelectionFromVariant } from "../../utils/variantMatcher";

const ProductDetails = () => {
  const { id } = useParams();

  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedAttributes, setSelectedAttributes] = useState({}); // Track selected attribute values
  const [qty, setQty] = useState(1);
  const [tab] = useState("description");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [lastChangedAttribute, setLastChangedAttribute] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    api.getProduct(id)
      .then(res => {
        if (!active) return;
        setProduct(res.product);
        setRelatedProducts(res.related || []);
        
        // Auto-select the first variant (if any) so product page has a sensible default
        const firstVariant = res.product?.variants && res.product.variants.length > 0 ? res.product.variants[0] : null;
        if (firstVariant) {
          const attrs = firstVariant.attributes || [];
          const attrsObj = Array.isArray(attrs)
            ? attrs.reduce((acc, a) => { if (a && a.name) acc[a.name] = a.value; return acc; }, {})
            : (typeof attrs === 'object' ? attrs : {});
          setSelectedVariant({ ...firstVariant, attributes: attrsObj, attributesObj: attrsObj });
          setSelectedAttributes(attrsObj);
        } else {
          setSelectedVariant(null);
          setSelectedAttributes({});
        }

        // If any attribute has only one possible option across all variants, default it too
        (function setSingleOptionDefaults() {
          const variants = res.product?.variants || [];
          const normalized = variants.map(v => {
            const attrs = v.attributes || [];
            const attrsObj = Array.isArray(attrs)
              ? attrs.reduce((acc, a) => { if (a && a.name) acc[a.name] = a.value; return acc; }, {})
              : (typeof attrs === 'object' ? attrs : {});
            return { ...v, attributesObj: attrsObj };
          });
          const attributeNamesLocal = Array.from(new Set(normalized.flatMap(v => Object.keys(v.attributesObj))));
          const allOptionsLocal = attributeNamesLocal.reduce((acc, name) => {
            acc[name] = Array.from(new Set(normalized.map(v => v.attributesObj[name]).filter(Boolean))).sort();
            return acc;
          }, {});
          const defaults = {};
          attributeNamesLocal.forEach(name => {
            const opts = allOptionsLocal[name] || [];
            if (opts.length === 1) defaults[name] = opts[0];
          });
          if (Object.keys(defaults).length > 0) {
            setSelectedAttributes(prev => ({ ...prev, ...defaults }));
            setSelectedVariant(prev => prev ? { ...prev, attributes: { ...(prev.attributes || {}), ...defaults }, attributesObj: { ...(prev.attributesObj || {}), ...defaults } } : prev);
          }
        })();

        // Reset to main image (index 0) when product loads
        setMainImageIndex(0);
      })
      .catch(err => {
        console.error("Product load failed", err);
        if (!active) return;
        setError("Unable to load product right now.");
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return <h2 style={{ padding: "40px" }}>Loading...</h2>;
  }

  if (error || !product) {
    return <h2 style={{ padding: "40px" }}>{error || "Product not found"}</h2>;
  }

  // Combine main image + gallery images, with main image first
  const allImages = [];
  
  // Add main product image first
  if (product.image) {
    allImages.push({ 
      id: 'main', 
      image: product.image,
      isMain: true 
    });
  }
  
  // Add gallery images after main image
  if (product.images && product.images.length > 0) {
    product.images.forEach(img => {
      // Don't duplicate if gallery image is same as main image
      if (img.image !== product.image) {
        allImages.push(img);
      }
    });
  }
  
  // Fallback if no images at all
  if (allImages.length === 0) {
    allImages.push({ id: 'main', image: product.image || '' });
  }

  const currentImage = allImages[Math.min(mainImageIndex, allImages.length - 1)];
  const resolveSrc = (imagePath) =>
    imagePath?.startsWith("http")
      ? imagePath
      : `${API_BASE}${imagePath}`;



  const handleDecreaseQty = () => {
    setQty(prev => Math.max(1, prev - 1));
  };

  const handleIncreaseQty = () => {
    setQty(prev => prev + 1);
  };

  // --- VARIANTS / ATTRIBUTES HELPERS ---
  // Normalize variants so each has attributes as an object map
  const normalizedVariants = (product.variants || []).map(v => {
    const attrs = v.attributes || [];
    const attrsObj = Array.isArray(attrs)
      ? attrs.reduce((acc, a) => {
          if (a && a.name) acc[a.name] = a.value;
          return acc;
        }, {})
      : (typeof attrs === 'object' ? attrs : {});

    return { ...v, attributesObj: attrsObj };
  });

  // Get ordered attribute names and all possible values per attribute
  const attributeNames = Array.from(
    new Set(normalizedVariants.flatMap(v => Object.keys(v.attributesObj)))
  );

  const allOptions = attributeNames.reduce((acc, name) => {
    acc[name] = Array.from(new Set(
      normalizedVariants.map(v => v.attributesObj[name]).filter(Boolean)
    )).sort();
    return acc;
  }, {});

  // Prepare variants with attributes as a plain object for matcher utilities
  const variantsWithAttrs = normalizedVariants.map(v => ({ ...v, attributes: v.attributesObj }));

  // When all attributes are selected, try to find an exact variant match
  // We use matcher utilities for consistent behavior across UI and tests
  // (findExactVariant returns null if no exact match for the provided selection)
  // FindNearest handles partial selections and prefers last-changed attribute

  // Handler invoked when user changes any attribute dropdown
  const onAttributeChange = (attrName, value) => {
    // Update selection state; empty/cleared values remove the key
    const updated = { ...selectedAttributes };
    if (value === '' || value === null || value === undefined) delete updated[attrName];
    else updated[attrName] = value;

    setSelectedAttributes(updated);
    setLastChangedAttribute(attrName);

    // If user selected all attributes, try exact match first
    const allSelected = attributeNames.length > 0 && attributeNames.every(k => updated[k]);
    if (allSelected) {
      const exact = findExactVariant(updated, variantsWithAttrs);
      if (exact) {
        setSelectedVariant(exact);
        setSelectedAttributes(normalizedSelectionFromVariant(exact));
        return;
      }
    }

    // No exact match / partial selection -> pick nearest variant while preserving last-changed attr
    const nearest = findNearestVariant(updated, variantsWithAttrs, attrName);
    if (nearest) {
      setSelectedVariant(nearest);
      setSelectedAttributes(normalizedSelectionFromVariant(nearest));
      return;
    }

    // As a final fallback, clear selected variant (should be rare if variants exist)
    setSelectedVariant(null);
  };

  const handleAddToCart = () => {
    // Strict validation: need a selectedVariant with an id
    if (!product || !selectedVariant || !selectedVariant.id) {
      console.warn('Add to cart blocked: no valid variant selected', { selectedVariant, selectedAttributes });
      return;
    }

    // Stock is informational only; allow adding even when stock <= 0
    if (selectedVariant.stock !== undefined && Number(selectedVariant.stock) <= 0) {
      console.debug('Adding out-of-stock variant to cart (stock informational):', selectedVariant);
    }

    setAddingToCart(true);

    const cartItemId = `item_${product.id}_${selectedVariant.id}_${Date.now()}`;

    const rawAttrs = selectedVariant.attributes || selectedAttributes || {};

    // Normalize attributes to array of {name, value} for consistent storage and display
    const attrsArray = Array.isArray(rawAttrs)
      ? rawAttrs.map(a => ({ name: a.name, value: a.value }))
      : Object.keys(rawAttrs || {}).map(name => ({ name, value: rawAttrs[name] }));

    const cartItem = {
      id: cartItemId,
      productId: product.id,
      productName: product.name,
      variantId: selectedVariant.id,
      variantSku: selectedVariant.sku,
      price: selectedVariant.price,
      qty: qty,
      image: product.image,
      attributes: attrsArray
    };

    console.debug('Adding to cart:', cartItem);

    addToCart(cartItem);

    setQty(1);
    setTimeout(() => setAddingToCart(false), 500);
  };

  return (
    <div className="product-page">

      {/* TOP SECTION */}
      <div className="product-top">

        {/* IMAGE */}
        <div className="product-image-box">
          <img
            src={resolveSrc(currentImage.image)}
            alt={product.name}
            className="product-main-image"
          />
          {allImages.length > 1 && (
            <div className="product-thumbnails">
              {allImages.map((img, index) => (
                <button
                  key={img.id || index}
                  type="button"
                  className={
                    index === mainImageIndex
                      ? "thumb active"
                      : "thumb"
                  }
                  onClick={() => setMainImageIndex(index)}
                >
                  <img src={resolveSrc(img.image)} alt={`${product.name} ${index + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* INFO */}
        <div className="product-info-box">
          <h1 className="product-title">{product.name}</h1>

          {/* DYNAMIC PRICE */}
          <p className="product-price">
            {selectedVariant ? `₹${selectedVariant.price}` : "Select options"}
          </p>

          {/* SELECTED VARIANT DETAILS (moved above cart) */}
          {selectedVariant && (
            <div className="selected-variant-info">
              <h3 className="variant-info-title">Selected Variant Details</h3>
              <div className="variant-attributes-list">
                {attributeNames.length > 0 ? (
                  attributeNames.map((name) => {
                    const opts = allOptions[name] || [];
                    const single = opts.length === 1;
                    const displayValue = selectedAttributes[name] || (single ? opts[0] : '');
                    return (
                      <div key={name} className="variant-attribute-item" style={{ display: 'flex', alignItems: '', gap: '12px' }}>
                        <span className="variant-attribute-name">{name}:</span>
                        {single ? (
                          <span className="variant-attribute-value">{displayValue}</span>
                        ) : (
                          <select value={selectedAttributes[name] || ''} onChange={e => onAttributeChange(name, e.target.value)}>
                            <option value="">Select {name}</option>
                            {opts.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })
                ) : (
                  product.variants && product.variants.length > 1 ? (
                    <div className="variant-attribute-item" style={{ display: 'flex', alignItems: '', gap: '12px' }}>
                      <span className="variant-attribute-name">Variant:</span>
                      <select value={selectedVariant?.id || ''} onChange={e => {
                        const v = product.variants.find(vv => vv.id === Number(e.target.value));
                        setSelectedVariant(v || null);
                        setSelectedAttributes(v ? (v.attributesObj || {}) : {});
                      }}>
                        {product.variants.map(v => (
                          <option key={v.id} value={v.id}>{v.sku || `Variant ${v.id}`} — ₹{v.price}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    (() => {
                      const attrMap = selectedVariant.attributes || {};
                      return Object.keys(attrMap).map((name, index) => (
                        <div key={index} className="variant-attribute-item">
                          <span className="variant-attribute-name">{name}:</span>
                          <span className="variant-attribute-value">{attrMap[name]}</span>
                        </div>
                      ));
                    })()
                  )
                )}


              </div>
            </div>
          )} 


          {/* CART */}
          <div className="cart-row">
            <div className="quantity-selector">
              <button 
                type="button" 
                className="qty-btn minus" 
                onClick={handleDecreaseQty}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={e => {
                  const val = parseInt(e.target.value) || 1;
                  setQty(Math.max(1, val));
                }}
                className="qty-input"
                readOnly
              />
              <button 
                type="button" 
                className="qty-btn plus" 
                onClick={handleIncreaseQty}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <button 
              className="add-cart-btn" 
              onClick={handleAddToCart}
              disabled={ addingToCart || !selectedVariant }
            >
              {addingToCart ? "ADDING..." : (selectedVariant ? "ADD TO CART" : "Select options")}
            </button> 
          </div>



          {/* TABS */}
          {/* <div className="product-tabs">
            <button
              className={tab === "description" ? "active" : ""}
              onClick={() => setTab("description")}
            >
              DESCRIPTION
            </button>
            <button
              className={tab === "info" ? "active" : ""}
              onClick={() => setTab("info")}
            >
              ADDITIONAL INFORMATION
            </button>
          </div> */}

          {/* TAB CONTENT */}
          <div className="tab-content">
            {tab === "description" && (
              <>
                <div
                  className="product-description scroll-box"
                  dangerouslySetInnerHTML={{
                    __html: product.description || "<p>No description available.</p>"
                  }}
                />
              </>
            )}


             
            {/* {tab === "info" && (
              <ul>
                {product.variants.map(v => (
                  <li key={v.id}>
                    <strong>{v.sku}</strong> — ₹{v.price} (
                    {v.attributes?.map(a => `${a.name}: ${a.value}`).join(", ")})
                  </li>
                ))}
              </ul>
            )}  */}
          </div>
        </div>

      </div>


      {/* RELATED PRODUCTS */}
      {relatedProducts.length > 0 && (
        <div className="related-products">
          <h2>Related Products</h2>

          <div className="related-grid">
            {relatedProducts.map(item => (
              <Link to={`/product/${item.id}`} className="related-card">
                <img
                  src={
                    item.image?.startsWith("http")
                      ? item.image
                      : `${API_BASE}${item.image}`
                  }
                  alt={item.name}
                />
                <h4>{item.name}</h4>
              </Link>

            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductDetails;
