import { addToCart, getCart, saveCart, clearCart } from './cart';

describe('cart utils', () => {
  beforeEach(() => {
    // clear localStorage
    localStorage.clear();
  });

  test('addToCart stores attributes as provided array and merges qty when same variant', () => {
    const item = {
      id: 'item_1',
      productId: 10,
      productName: 'Test Product',
      variantId: 100,
      variantSku: 'SKU100',
      price: 100,
      qty: 1,
      attributes: [{ name: 'Size', value: 'M' }]
    };

    addToCart(item);
    let cart = getCart();
    expect(cart.length).toBe(1);
    expect(cart[0].attributes).toEqual([{ name: 'Size', value: 'M' }]);
    expect(cart[0].productName).toBe('Test Product');

    // Add same variant again
    addToCart({ ...item, id: 'item_2', qty: 2 });
    cart = getCart();
    expect(cart.length).toBe(1);
    expect(cart[0].qty).toBe(3);
  });

  test('clearCart removes all items', () => {
    addToCart({ id: 'a', productId: 1, variantId: 1, qty: 1, price: 10, attributes: [] });
    expect(getCart().length).toBe(1);
    clearCart();
    expect(getCart().length).toBe(0);
  });
});
