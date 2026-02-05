import { Link, useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
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
  const [tab, setTab] = useState("description");
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

  // Process HTML content to fix image URLs
  const processHtmlContent = (html) => {
    if (!html) return html;
    
    // Use regex to find and replace img src attributes
    return html.replace(/<img([^>]*)\ssrc=["']([^"']+)["']([^>]*)>/gi, (match, before, src, after) => {
      // If it's already an absolute URL, keep it
      if (src.startsWith('http://') || src.startsWith('https://')) {
        return match;
      }
      
      let newSrc = src;
      
      // If it starts with /backend, convert to absolute URL
      if (src.startsWith('/backend')) {
        if (process.env.NODE_ENV === 'production') {
          const protocol = window.location.protocol;
          const host = window.location.host;
          newSrc = `${protocol}//${host}${src}`;
        } else {
          newSrc = `${API_BASE}${src}`;
        }
      } else if (src.startsWith('/uploads')) {
        // Handle /uploads paths - add /backend prefix
        if (process.env.NODE_ENV === 'production') {
          const protocol = window.location.protocol;
          const host = window.location.host;
          newSrc = `${protocol}//${host}/backend${src}`;
        } else {
          newSrc = `${API_BASE}${src}`;
        }
      } else if (!src.startsWith('http') && !src.startsWith('data:')) {
        // Relative path - convert to absolute
        if (process.env.NODE_ENV === 'production') {
          const protocol = window.location.protocol;
          const host = window.location.host;
          newSrc = `${protocol}//${host}/backend${src.startsWith('/') ? '' : '/'}${src}`;
        } else {
          newSrc = `${API_BASE}${src.startsWith('/') ? '' : '/'}${src}`;
        }
      }
      
      return `<img${before} src="${newSrc}"${after}>`;
    });
  };



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

  // Check if current selection is valid (exact match exists)
  const isCurrentSelectionValid = () => {
    if (!selectedAttributes || Object.keys(selectedAttributes).length === 0) {
      return false;
    }
    // Check if all attributes are selected
    const allSelected = attributeNames.length > 0 && attributeNames.every(k => selectedAttributes[k]);
    if (!allSelected) {
      return false;
    }
    // Check if exact variant exists
    const exact = findExactVariant(selectedAttributes, variantsWithAttrs);
    return exact !== null;
  };

  // Handler invoked when user changes any attribute dropdown
  // Users can select any combination - we just check if it's available
  const onAttributeChange = (attrName, value) => {
    // Update selection state; empty/cleared values remove the key
    const updated = { ...selectedAttributes };
    if (value === '' || value === null || value === undefined) delete updated[attrName];
    else updated[attrName] = value;

    setSelectedAttributes(updated);
    setLastChangedAttribute(attrName);

    // Check if the updated selection is valid
    const allSelected = attributeNames.length > 0 && attributeNames.every(k => updated[k]);
    if (allSelected) {
      const exact = findExactVariant(updated, variantsWithAttrs);
      if (exact) {
        // Update selectedVariant if exact match found
        setSelectedVariant(exact);
        return;
      }
    }

    // If no exact match, clear selectedVariant but keep the user's selections
    setSelectedVariant(null);
  };

  const handleAddToCart = () => {
    // Strict validation: need a selectedVariant with an id
    if (!product || !selectedVariant || !selectedVariant.id) {
      console.warn('Add to cart blocked: no valid variant selected', { selectedVariant, selectedAttributes });
      return;
    }

    // Block adding out-of-stock items
    if (selectedVariant.stock !== undefined && Number(selectedVariant.stock) <= 0) {
      console.warn('Cannot add out-of-stock variant to cart');
      return;
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
    toast.success("Product added to cart!", {
      position: "top-right",
      autoClose: 3000,
    });

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

          {/* OUT OF STOCK INDICATOR */}
          {selectedVariant && Number(selectedVariant.stock) === 0 && (
            <p className="out-of-stock" style={{ color: 'red', fontWeight: 600, marginTop: '-15px', marginBottom: '10px' }}>
              Out of Stock
            </p>
          )}

          {/* SELECTED VARIANT DETAILS (moved above cart) */}
          {/* Always show dropdowns when there are attributes, even if selection is invalid */}
          {attributeNames.length > 0 ? (
            <div className="selected-variant-info">
              <h3 className="variant-info-title">Selected Variant Details</h3>
              <div className="variant-attributes-list">
                {attributeNames.map((name) => {
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
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            // Fallback for products without attributes but with multiple variants
            product.variants && product.variants.length > 1 && selectedVariant && (
              <div className="selected-variant-info">
                <h3 className="variant-info-title">Selected Variant Details</h3>
                <div className="variant-attributes-list">
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
                </div>
              </div>
            )
          )}

          {/* SELECTION SUMMARY */}
          {attributeNames.length > 0 && Object.keys(selectedAttributes).length > 0 && (
            <div className="selection-summary">
              <h4 className="selection-summary-title">Selected Combination:</h4>
              <div className="selection-combination">
                {attributeNames.map((name, idx) => {
                  const value = selectedAttributes[name];
                  if (!value) return null;
                  return (
                    <span key={name} className="combination-item">
                      {value}{idx < attributeNames.length - 1 ? ' • ' : ''}
                    </span>
                  );
                })}
                {isCurrentSelectionValid() ? (
                  <span className="availability-badge available">✔ Available</span>
                ) : (
                  <span className="availability-badge unavailable">✖ Not Available</span>
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
              disabled={ 
                addingToCart || 
                !selectedVariant || 
                (selectedVariant && selectedVariant.stock !== undefined && Number(selectedVariant.stock) <= 0)
              }
            >
              {addingToCart 
                ? "ADDING..." 
                : (!selectedVariant 
                  ? "Select options" 
                  : (selectedVariant.stock !== undefined && Number(selectedVariant.stock) <= 0)
                    ? "OUT OF STOCK"
                    : "ADD TO CART"
                  )
              }
            </button> 
          </div>



        </div>

      </div>

      {/* TABS SECTION - Below product info */}
      <div className="product-tabs-section">
        <div className="product-tabs">
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
        </div>

        {/* TAB CONTENT */}
        <div className="tab-content">
          {tab === "description" && (
            <div className="tab-panel">
              <h3 className="tab-panel-title">DESCRIPTION</h3>
              <div
                className="product-description"
                dangerouslySetInnerHTML={{
                  __html: processHtmlContent(product.description) || "<p>No description available.</p>"
                }}
              />
            </div>
          )}

          {tab === "info" && (
            <div className="tab-panel">
              <h3 className="tab-panel-title">ADDITIONAL INFORMATION</h3>
              
              {/* Additional Description */}
              {product.additionalDescription ? (
                <div className="additional-description-content">
                  <div
                    className="additional-description"
                    dangerouslySetInnerHTML={{
                      __html: processHtmlContent(product.additionalDescription)
                    }}
                  />
                </div>
              ) : (
                <p className="no-info">No additional information available.</p>
              )}
            </div>
          )}
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
