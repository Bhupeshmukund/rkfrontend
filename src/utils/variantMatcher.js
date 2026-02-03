// Utility functions for variant matching (framework-agnostic)

// Find exact variant that matches all selections provided (requires selections may be partial)
export function findExactVariant(selections = {}, variants = []) {
  const keys = Object.keys(selections).filter(k => selections[k] !== undefined && selections[k] !== null && selections[k] !== '');
  if (keys.length === 0) return null;

  return variants.find(v => keys.every(k => (v.attributes?.[k] ?? null) === selections[k])) || null;
}

// Choose nearest variant given a partial selection and the name of the attribute last changed
export function findNearestVariant(selections = {}, variants = [], lastChangedKey = null) {
  const wantValue = lastChangedKey ? selections[lastChangedKey] : undefined;

  const scoreVariant = (variant) => {
    return Object.entries(selections).reduce((s, [k, v]) => {
      if (!v) return s;
      return s + ((variant.attributes?.[k] ?? null) === v ? 1 : 0);
    }, 0);
  };

  // Prefer candidates that match the last changed attribute value
  if (lastChangedKey && wantValue !== undefined && wantValue !== null && wantValue !== '') {
    const candidates = variants.filter(v => (v.attributes?.[lastChangedKey] ?? null) === wantValue);
    if (candidates.length > 0) {
      candidates.sort((a, b) => {
        const sa = scoreVariant(a), sb = scoreVariant(b);
        if (sb !== sa) return sb - sa;
        const inA = (a.stock || 0) > 0, inB = (b.stock || 0) > 0;
        if (inA !== inB) return inA ? -1 : 1;
        return a.id - b.id;
      });
      return candidates[0];
    }
  }

  // Fallback: pick best-scoring variant overall
  const scored = variants.map(v => ({ v, score: scoreVariant(v), inStock: (v.stock || 0) > 0 }));
  scored.sort((x, y) => {
    if (y.score !== x.score) return y.score - x.score;
    if (x.inStock !== y.inStock) return x.inStock ? -1 : 1;
    return x.v.id - y.v.id;
  });

  return scored.length ? scored[0].v : null;
}

// Return attributes map for a variant
export function normalizedSelectionFromVariant(variant) {
  return { ...(variant?.attributes || {}) };
}
