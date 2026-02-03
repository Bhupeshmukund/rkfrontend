import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./ShoppingCart.css";
import { getCart, updateCartItemQty, removeFromCart, getCartTotal } from "../../utils/cart";
import { API_BASE } from "../../api";

const ShoppingCart = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);

  useEffect(() => {
    // Load cart from localStorage
    const loadCart = () => {
      const cartData = getCart();
      setCart(cartData);
    };

    loadCart();

    // Listen for cart updates
    const handleCartUpdate = () => {
      loadCart();
    };

    window.addEventListener('cartUpdated', handleCartUpdate);

    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, []);

  const updateQty = (id, delta) => {
    const cartItem = cart.find(item => item.id === id);
    if (cartItem) {
      const newQty = Math.max(1, cartItem.qty + delta);
      updateCartItemQty(id, newQty);
      // Cart will be updated via event listener
    }
  };

  const removeItem = (id) => {
    removeFromCart(id);
    // Cart will be updated via event listener
  };

  const subtotal = getCartTotal();
  const total = subtotal;

  return (
    <section className="cart-page">
      <h1>Shopping cart</h1>
      <div className="cart-layout">
        {/* LEFT */}
        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="empty-cart">
              <p>Your cart is empty</p>
              <a href="/" className="continue-shopping">Continue Shopping</a>
            </div>
          ) : (
            cart.map(item => {
              const imageUrl = item.image?.startsWith("http")
                ? item.image
                : `${API_BASE}${item.image}`;
              
              // Format attributes for display
              let attributeText = "";
              if (item.attributes) {
                if (Array.isArray(item.attributes) && item.attributes.length > 0) {
                  attributeText = item.attributes.map(attr => `${attr.name}: ${attr.value}`).join(" / ");
                } else if (typeof item.attributes === 'object' && Object.keys(item.attributes).length > 0) {
                  attributeText = Object.keys(item.attributes).map(k => `${k}: ${item.attributes[k]}`).join(" / ");
                }
              }
              if (!attributeText) attributeText = item.variantSku || "";

              return (
                <div key={item.id} className="cart-item">
                  <button className="remove" onClick={() => removeItem(item.id)}>×</button>

                  <img src={imageUrl} alt={item.productName} />

                  <div className="details">
                    <span className="category">{item.variantSku || "Product"}</span>
                    <h3>{item.productName}</h3>
                    {attributeText && <p>{attributeText}</p>}
                    {/* Show product and variant ids for clarity */}
                    <small className="ids">{item.productId ? `Product ID: ${item.productId}` : ""} {item.variantId ? ` · Variant ID: ${item.variantId}` : ""}</small>
                  </div>

                  <div className="qty">
                    <button onClick={() => updateQty(item.id, -1)}>-</button>
                    <span>{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)}>+</button>
                  </div>

                  <div className="price">
                    {item.qty} x ₹{parseFloat(item.price).toFixed(2)}
                  </div>
                </div>
              );
            })
          )}

        </div>

        {/* RIGHT */}
        <div className="cart-summary">
          <h2>Summary</h2>

          <div className="row">
            <span>Subtotal</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>

          <div className="divider"></div>

          <div className="row total">
            <span>Total</span>
            <span>₹{total.toFixed(2)}</span>
          </div>

          <input
            type="text"
            placeholder="Enter coupon code here"
            className="coupon"
          />

          <button 
            className="checkout" 
            onClick={() => {
              if (cart.length === 0) {
                alert("Your cart is empty. Please add items to cart before checkout.");
                return;
              }
              navigate("/checkout");
            }}
          >
            Check Out
          </button>
        </div>
      </div>
    </section>
  );
};

export default ShoppingCart;
    