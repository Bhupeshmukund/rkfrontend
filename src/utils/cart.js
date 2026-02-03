// Cart utility functions using localStorage

const CART_STORAGE_KEY = 'rk_industries_cart';

// Get cart from localStorage
export const getCart = () => {
  try {
    const cart = localStorage.getItem(CART_STORAGE_KEY);
    return cart ? JSON.parse(cart) : [];
  } catch (error) {
    console.error('Error getting cart from localStorage:', error);
    return [];
  }
};

// Save cart to localStorage
export const saveCart = (cart) => {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('cartUpdated'));
  } catch (error) {
    console.error('Error saving cart to localStorage:', error);
  }
};

// Add item to cart
export const addToCart = (item) => {
  const cart = getCart();
  
  // Check if item with same product id and variant id already exists
  const existingIndex = cart.findIndex(
    cartItem => 
      cartItem.productId === item.productId && 
      cartItem.variantId === item.variantId
  );

  if (existingIndex >= 0) {
    // Update quantity if item exists
    cart[existingIndex].qty += item.qty;
  } else {
    // Add new item
    cart.push(item);
  }

  saveCart(cart);
  return cart;
};

// Remove item from cart
export const removeFromCart = (itemId) => {
  const cart = getCart();
  const updatedCart = cart.filter(item => item.id !== itemId);
  saveCart(updatedCart);
  return updatedCart;
};

// Update item quantity in cart
export const updateCartItemQty = (itemId, qty) => {
  const cart = getCart();
  const updatedCart = cart.map(item =>
    item.id === itemId ? { ...item, qty: Math.max(1, qty) } : item
  );
  saveCart(updatedCart);
  return updatedCart;
};

// Clear cart
export const clearCart = () => {
  saveCart([]);
};

// Get cart total amount
export const getCartTotal = () => {
  const cart = getCart();
  return cart.reduce((total, item) => total + (parseFloat(item.price) * item.qty), 0);
};

// Get cart items count
export const getCartItemsCount = () => {
  const cart = getCart();
  return cart.reduce((count, item) => count + item.qty, 0);
};

