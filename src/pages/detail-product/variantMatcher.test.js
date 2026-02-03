import { findExactVariant, findNearestVariant, normalizedSelectionFromVariant } from '../../utils/variantMatcher';

const variants = [
  { id: 1, sku: 'SKU1', price: 100, stock: 5, attributes: { Size: 'S', Color: 'Red' } },
  { id: 2, sku: 'SKU2', price: 120, stock: 0, attributes: { Size: 'M', Color: 'Red' } },
  { id: 3, sku: 'SKU3', price: 130, stock: 3, attributes: { Size: 'M', Color: 'Blue' } },
  { id: 4, sku: 'SKU4', price: 140, stock: 2, attributes: { Size: 'L', Color: 'Blue' } }
];

test('findExactVariant matches variant when partial selection matches', () => {
  const sel = { Size: 'M' };
  // Policy: findExactVariant finds a variant that matches all provided selection keys
  const v = findExactVariant(sel, variants);
  expect(v).not.toBeNull();
  expect(v.id).toBe(2); // first match in list with Size M
});

test('findExactVariant returns exact match when full selection provided', () => {
  const sel = { Size: 'M', Color: 'Blue' };
  const v = findExactVariant(sel, variants);
  expect(v).not.toBeNull();
  expect(v.id).toBe(3);
});

test('findNearestVariant prefers lastChanged attribute', () => {
  const sel = { Size: 'M', Color: 'Green' };
  const nearest = findNearestVariant(sel, variants, 'Size');
  // Should pick id 3 (Size M, Color Blue) over id 2 because id 3 is in stock
  expect(nearest.id).toBe(3);
});

test('findNearestVariant chooses in-stock among ties', () => {
  const sel = { Color: 'Red' };
  const nearest = findNearestVariant(sel, variants, 'Color');
  // Both id 1 (in stock) and id 2 (out of stock) have Color Red -> pick id 1
  expect(nearest.id).toBe(1);
});

test('normalizedSelectionFromVariant returns attributes object', () => {
  expect(normalizedSelectionFromVariant(variants[0])).toEqual({ Size: 'S', Color: 'Red' });
});
