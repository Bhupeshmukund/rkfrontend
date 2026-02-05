import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { api, API_BASE } from "../../api";
import { addToCart } from "../../utils/cart";
import { findExactVariant, normalizedSelectionFromVariant } from "../../utils/variantMatcher";
import "./ProductDetailsModal.css";

const ProductDetailsModal = ({ productId, onClose }) => {
  const [product, setProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [lastChangedAttribute, setLastChangedAttribute] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    api.getProduct(productId)
      .then(res => {
        if (!active) return;
        setProduct(res.product);
        
        // Auto-select the first variant (if any)
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
  }, [productId]);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-loading">Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-error">{error || "Product not found"}</div>
        </div>
      </div>
    );
  }

  // Combine main image + gallery images
  const allImages = [];
  if (product.image) {
    allImages.push({ id: 'main', image: product.image });
  }
  if (product.gallery && Array.isArray(product.gallery)) {
    product.gallery.forEach((img, idx) => {
      if (img && img.image) {
        allImages.push({ id: `gallery_${idx}`, image: img.image });
      }
    });
  }
  const currentImage = allImages[mainImageIndex] || allImages[0] || { image: '' };

  const resolveSrc = (src) => {
    if (!src) return '';
    if (src.startsWith('http')) return src;
    return `${API_BASE}${src}`;
  };

  // Normalize variants
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

  const attributeNames = Array.from(
    new Set(normalizedVariants.flatMap(v => Object.keys(v.attributesObj)))
  );

  const allOptions = attributeNames.reduce((acc, name) => {
    acc[name] = Array.from(new Set(
      normalizedVariants.map(v => v.attributesObj[name]).filter(Boolean)
    )).sort();
    return acc;
  }, {});

  const variantsWithAttrs = normalizedVariants.map(v => ({ ...v, attributes: v.attributesObj }));

  // Check if current selection is valid
  const isCurrentSelectionValid = () => {
    if (!selectedAttributes || Object.keys(selectedAttributes).length === 0) {
      return false;
    }
    const allSelected = attributeNames.length > 0 && attributeNames.every(k => selectedAttributes[k]);
    if (!allSelected) {
      return false;
    }
    const exact = findExactVariant(selectedAttributes, variantsWithAttrs);
    return exact !== null;
  };

  // Handler for attribute change
  const onAttributeChange = (attrName, value) => {
    const updated = { ...selectedAttributes };
    if (value === '' || value === null || value === undefined) delete updated[attrName];
    else updated[attrName] = value;

    setSelectedAttributes(updated);
    setLastChangedAttribute(attrName);

    const allSelected = attributeNames.length > 0 && attributeNames.every(k => updated[k]);
    if (allSelected) {
      const exact = findExactVariant(updated, variantsWithAttrs);
      if (exact) {
        setSelectedVariant(exact);
        return;
      }
    }

    setSelectedVariant(null);
  };

  const handleAddToCart = () => {
    if (!product || !selectedVariant || !selectedVariant.id) {
      console.warn('Add to cart blocked: no valid variant selected');
      return;
    }

    if (selectedVariant.stock !== undefined && Number(selectedVariant.stock) <= 0) {
      console.warn('Cannot add out-of-stock variant to cart');
      return;
    }

    setAddingToCart(true);

    const cartItemId = `item_${product.id}_${selectedVariant.id}_${Date.now()}`;
    const rawAttrs = selectedVariant.attributes || selectedAttributes || {};
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

    addToCart(cartItem);
    toast.success("Product added to cart!", {
      position: "top-right",
      autoClose: 3000,
    });
    setQty(1);
    setTimeout(() => {
      setAddingToCart(false);
      onClose(); // Close modal after adding to cart
    }, 500);
  };

  const handleDecreaseQty = () => {
    setQty(prev => Math.max(1, prev - 1));
  };

  const handleIncreaseQty = () => {
    setQty(prev => prev + 1);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>×</button>
        
        <div className="modal-product-content">
          {/* IMAGE */}
          <div className="modal-product-image-box">
            <img
              src={resolveSrc(currentImage.image)}
              alt={product.name}
              className="modal-product-main-image"
            />
            {allImages.length > 1 && (
              <div className="modal-product-thumbnails">
                {allImages.map((img, index) => (
                  <button
                    key={img.id || index}
                    type="button"
                    className={index === mainImageIndex ? "modal-thumb active" : "modal-thumb"}
                    onClick={() => setMainImageIndex(index)}
                  >
                    <img src={resolveSrc(img.image)} alt={`${product.name} ${index + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* INFO */}
          <div className="modal-product-info-box">
            <h1 className="modal-product-title">{product.name}</h1>

            <p className="modal-product-price">
              {selectedVariant ? `₹${selectedVariant.price}` : "Select options"}
            </p>

            {selectedVariant && Number(selectedVariant.stock) === 0 && (
              <p className="modal-out-of-stock" style={{ color: 'red', fontWeight: 600, marginTop: '-15px', marginBottom: '10px' }}>
                Out of Stock
              </p>
            )}

            {/* VARIANT SELECTION */}
            {attributeNames.length > 0 ? (
              <div className="modal-selected-variant-info">
                <h3 className="modal-variant-info-title">Select Variant</h3>
                <div className="modal-variant-attributes-list">
                  {attributeNames.map((name) => {
                    const opts = allOptions[name] || [];
                    const single = opts.length === 1;
                    const displayValue = selectedAttributes[name] || (single ? opts[0] : '');
                    return (
                      <div key={name} className="modal-variant-attribute-item" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <span className="modal-variant-attribute-name">{name}:</span>
                        {single ? (
                          <span className="modal-variant-attribute-value">{displayValue}</span>
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
            ) : null}

            {/* SELECTION SUMMARY */}
            {attributeNames.length > 0 && Object.keys(selectedAttributes).length > 0 && (
              <div className="modal-selection-summary">
                <h4 className="modal-selection-summary-title">Selected Combination:</h4>
                <div className="modal-selection-combination">
                  {attributeNames.map((name, idx) => {
                    const value = selectedAttributes[name];
                    if (!value) return null;
                    return (
                      <span key={name} className="modal-combination-item">
                        {value}{idx < attributeNames.length - 1 ? ' • ' : ''}
                      </span>
                    );
                  })}
                  {isCurrentSelectionValid() ? (
                    <span className="modal-availability-badge available">✔ Available</span>
                  ) : (
                    <span className="modal-availability-badge unavailable">✖ Not Available</span>
                  )}
                </div>
              </div>
            )}

            {/* CART */}
            <div className="modal-cart-row">
              <div className="modal-quantity-selector">
                <button 
                  type="button" 
                  className="modal-qty-btn minus" 
                  onClick={handleDecreaseQty}
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
                  className="modal-qty-input"
                  readOnly
                />
                <button 
                  type="button" 
                  className="modal-qty-btn plus" 
                  onClick={handleIncreaseQty}
                >
                  +
                </button>
              </div>
              <button
                className="modal-add-to-cart-btn"
                onClick={handleAddToCart}
                disabled={!selectedVariant || (selectedVariant.stock !== undefined && Number(selectedVariant.stock) <= 0) || addingToCart}
              >
                {addingToCart ? "Adding..." : (selectedVariant && Number(selectedVariant.stock) === 0 ? "OUT OF STOCK" : "Add to Cart")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsModal;
