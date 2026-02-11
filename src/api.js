const API_BASE =
  process.env.REACT_APP_API_BASE ??
  (process.env.NODE_ENV === "production"
    ? ""
    : "http://localhost:5000");

const handle = async response => {
  if (!response.ok) {
    let errorMessage = "Request failed";
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      errorMessage = await response.text();
    }
    throw new Error(errorMessage);
  }
  return response.json();
};

export const api = {
  // ===== PUBLIC =====
  getCategories: () =>
    fetch(`${API_BASE}/api/public/categories`).then(handle),

  getCategoryProducts: slug =>
    fetch(`${API_BASE}/api/public/categories/${slug}/products`).then(handle),

  getProduct: id =>
    fetch(`${API_BASE}/api/public/products/${id}`).then(handle),

  searchProducts: query =>
    fetch(`${API_BASE}/api/public/search?q=${encodeURIComponent(query)}`).then(handle),

  // ===== AUTH =====
  login: (email, password) =>
    fetch(`${API_BASE}/api/public/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    }).then(handle),

  signup: (name, email, password) =>
    fetch(`${API_BASE}/api/public/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    }).then(handle),

  updatePassword: (currentPassword, newPassword) => {
    const token = localStorage.getItem("authToken");
    return fetch(`${API_BASE}/api/public/update-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ currentPassword, newPassword })
    }).then(handle);
  },

  checkAdmin: () => {
    const token = localStorage.getItem("authToken");
    return fetch(`${API_BASE}/api/public/check-admin`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).then(handle);
  },

  // ===== ORDERS =====
  getMyOrders: () => {
    const token = localStorage.getItem("authToken");
    return fetch(`${API_BASE}/api/public/my-orders`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(handle);
  },

  createOrder: formData => {
    const token = localStorage.getItem("authToken");
    return fetch(`${API_BASE}/api/public/create-order`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    }).then(handle);
  },

  // Razorpay payment
  createRazorpayOrder: (amount) => {
    const token = localStorage.getItem("authToken");
    return fetch(`${API_BASE}/api/public/create-razorpay-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ amount, currency: "USD" })
    }).then(handle);
  },

  verifyRazorpayPayment: (paymentData) => {
    const token = localStorage.getItem("authToken");
    return fetch(`${API_BASE}/api/public/verify-razorpay-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(paymentData)
    }).then(handle);
  },

  // ===== ADMIN =====
  getAdminProducts: () =>
    fetch(`${API_BASE}/api/admin/products`).then(handle),

  createProduct: formData =>
    fetch(`${API_BASE}/api/admin/products`, {
      method: "POST",
      body: formData
    }).then(handle),

  updateProduct: (id, formData) =>
    fetch(`${API_BASE}/api/admin/products/${id}`, {
      method: "PUT",
      body: formData
    }).then(handle),

  // Fetch a product for editing (includes variants grouped with attributes)
  getProductForEdit: (id) =>
    fetch(`${API_BASE}/api/admin/products/${id}/edit`).then(handle),

  deleteProduct: id =>
    fetch(`${API_BASE}/api/admin/products/${id}`, {
      method: "DELETE"
    }).then(handle),

  deleteVariant: id =>
    fetch(`${API_BASE}/api/admin/variants/${id}`, {
      method: "DELETE"
    }).then(handle),

  // Update a single variant's editable fields (sku, price, stock)
  updateVariant: (variantId, data) => {
    const token = localStorage.getItem("authToken");
    return fetch(`${API_BASE}/api/admin/variants/${variantId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(data)
    }).then(handle);
  },

  updateProductStatus: (id, isActive) => {
    const token = localStorage.getItem("authToken");
    return fetch(`${API_BASE}/api/admin/products/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ isActive })
    }).then(handle);
  },

  // Admin Categories
  createCategory: formData =>
    fetch(`${API_BASE}/api/admin/categories`, {
      method: "POST",
      body: formData
    }).then(handle),

  deleteCategory: id =>
    fetch(`${API_BASE}/api/admin/categories/${id}`, {
      method: "DELETE"
    }).then(handle),

  // Admin Orders
  getAllOrders: () => {
    const token = localStorage.getItem("authToken");
    return fetch(`${API_BASE}/api/admin/orders`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).then(handle);
  },

  updateOrderStatus: (id, status, cancellationReason) => {
    const token = localStorage.getItem("authToken");
    const body = { status };
    if (cancellationReason) {
      body.cancellation_reason = cancellationReason;
    }
    return fetch(`${API_BASE}/api/admin/orders/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    }).then(handle);
  },

  // Restaurant orders (public, external)
  getRestaurantOrders: async () => {
    // Try direct fetch first
    const directUrl = "https://rkindustriesexports.com/api/admin/restaurant-orders";
    try {
      const res = await fetch(directUrl);
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
      return await res.json();
    } catch (err) {
      // Likely CORS; fallback via public CORS-friendly relay
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error(`Fallback failed with status ${res.status}`);
      return await res.json();
    }
  }
};

export { API_BASE };
