import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Orders.css";
import { api, API_BASE } from "../../api";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { useCurrency } from "../../contexts/CurrencyContext";
import { formatPrice } from "../../utils/currency";

const Orders = () => {
  const navigate = useNavigate();
  const { currency, exchangeRate } = useCurrency();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("authToken");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      navigate("/login");
      return;
    }

    // Fetch user orders
    fetchOrders();
  }, [navigate]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.getMyOrders();
      setOrders(response.orders || []);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError(err.message || "Failed to load orders. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Using formatPrice from currency utils

  if (loading) {
    return (
      <div className="orders-page">
        <div className="orders-container">
          <div className="loading">Loading orders...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <div className="orders-container">
        <h1>My Orders</h1>

        {error && <div className="error-message">{error}</div>}

        {orders.length === 0 ? (
          <div className="empty-orders">
            <div className="empty-icon">📦</div>
            <h2>No orders yet</h2>
            <p>You haven't placed any orders yet. Start shopping to see your orders here!</p>
            <Link to="/" className="shop-now-btn">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => {
              // Parse billing data for summary
              const billingData = order.billing_data 
                ? (typeof order.billing_data === 'string' ? JSON.parse(order.billing_data) : order.billing_data)
                : {};

              const firstItem = order.items && order.items.length > 0 ? order.items[0] : null;
              const itemCount = order.items ? order.items.length : 0;

              return (
                <div 
                  key={order.id} 
                  className="order-card"
                  onClick={() => {
                    setSelectedOrder(order);
                    setShowOrderModal(true);
                  }}
                >
                  <div className="order-header">
                    <div className="order-info">
                      <div className="order-id">Order #{order.id}</div>
                      <div className="order-date">{formatDate(order.created_at)}</div>
                    </div>
                    <div className="order-status">
                      <span className={`status-badge status-${(order.status?.toLowerCase() || "pending")}`}>
                        {(order.status || "Pending").charAt(0).toUpperCase() + (order.status || "Pending").slice(1).toLowerCase()}
                      </span>
                    </div>
                  </div>

                  {order.status === "cancelled" && order.cancellation_reason && (
                    <div className="cancellation-reason" onClick={(e) => e.stopPropagation()}>
                      <strong>Cancellation Reason:</strong>
                      <p>{order.cancellation_reason}</p>
                    </div>
                  )}

                  {/* Order Summary Preview */}
                  <div className="order-preview-content">
                    {firstItem && (
                      <div className="order-preview-item">
                        {firstItem.image && (
                          <img 
                            src={firstItem.image?.startsWith("http") 
                              ? firstItem.image 
                              : `${API_BASE}${firstItem.image}`} 
                            alt={firstItem.productName} 
                            className="preview-item-image" 
                          />
                        )}
                        <div className="preview-item-info">
                          <div className="preview-item-name">{firstItem.productName}</div>
                          {itemCount > 1 && (
                            <div className="preview-item-count">+ {itemCount - 1} more item{itemCount > 2 ? 's' : ''}</div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="order-preview-footer">
                      <div className="preview-total">
                        <span className="preview-total-label">Total:</span>
                        <span className="preview-total-amount">{formatPrice(order.total || order.total_amount || 0, currency, exchangeRate)}</span>
                      </div>
                      <div className="view-details-hint">Click to view details</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Order Details Modal */}
        {showOrderModal && selectedOrder && (
            <div className="modal-overlay" onClick={() => setShowOrderModal(false)}>
              <div className="modal-content order-details-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>Order Details - #{selectedOrder.id}</h2>
                  <button className="modal-close" onClick={() => setShowOrderModal(false)}>
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                </div>
                
                <div className="modal-body">
                  {(() => {
                    const billingData = selectedOrder.billing_data 
                      ? (typeof selectedOrder.billing_data === 'string' ? JSON.parse(selectedOrder.billing_data) : selectedOrder.billing_data) 
                      : {};
                    
                    return (
                      <>
                        {/* Order Information */}
                        <div className="order-detail-section">
                          <h3>Order Information</h3>
                          <div className="detail-grid">
                            <div className="detail-item">
                              <span className="detail-label">Order ID:</span>
                              <span className="detail-value">#{selectedOrder.id}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Order Date:</span>
                              <span className="detail-value">{new Date(selectedOrder.created_at).toLocaleString()}</span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Status:</span>
                              <span className={`status-badge status-${(selectedOrder.status?.toLowerCase() || "pending")}`}>
                                {(selectedOrder.status || "Pending").charAt(0).toUpperCase() + (selectedOrder.status || "Pending").slice(1).toLowerCase()}
                              </span>
                            </div>
                            <div className="detail-item">
                              <span className="detail-label">Payment Method:</span>
                              <span className="detail-value payment-method-badge">
                                {selectedOrder.payment_method ? selectedOrder.payment_method.charAt(0).toUpperCase() + selectedOrder.payment_method.slice(1) : "N/A"}
                              </span>
                            </div>
                            {selectedOrder.payment_proof && (
                              <div className="detail-item full-width">
                                <span className="detail-label">Payment Proof:</span>
                                <span className="detail-value">
                                  <button 
                                    className="view-proof-btn"
                                    onClick={() => {
                                      let proofUrl;
                                      if (selectedOrder.payment_proof.startsWith("http")) {
                                        proofUrl = selectedOrder.payment_proof;
                                      } else if (selectedOrder.payment_proof.startsWith("/")) {
                                        proofUrl = process.env.NODE_ENV === "production"
                                          ? `${API_BASE}/backend${selectedOrder.payment_proof}`
                                          : `${API_BASE}${selectedOrder.payment_proof}`;
                                      } else {
                                        proofUrl = process.env.NODE_ENV === "production"
                                          ? `${API_BASE}/backend/${selectedOrder.payment_proof}`
                                          : `${API_BASE}/${selectedOrder.payment_proof}`;
                                      }
                                      window.open(proofUrl, '_blank');
                                    }}
                                  >
                                    View Payment Proof
                                  </button>
                                  <span className="proof-filename">{selectedOrder.payment_proof.split('/').pop()}</span>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Cancellation Reason */}
                        {selectedOrder.status === "cancelled" && selectedOrder.cancellation_reason && (
                          <div className="order-detail-section">
                            <h3>Cancellation Reason</h3>
                            <div className="cancellation-reason">
                              <p>{selectedOrder.cancellation_reason}</p>
                            </div>
                          </div>
                        )}

                        {/* Customer Information */}
                        <div className="order-detail-section">
                          <h3>Customer Information</h3>
                          <div className="detail-grid">
                            <div className="detail-item">
                              <span className="detail-label">Name:</span>
                              <span className="detail-value">
                                {billingData.firstName && billingData.lastName 
                                  ? `${billingData.firstName} ${billingData.lastName}`
                                  : "N/A"}
                              </span>
                            </div>
                            {billingData.company && (
                              <div className="detail-item">
                                <span className="detail-label">Company:</span>
                                <span className="detail-value">{billingData.company}</span>
                              </div>
                            )}
                            <div className="detail-item">
                              <span className="detail-label">Email:</span>
                              <span className="detail-value">{billingData.email || "N/A"}</span>
                            </div>
                            {billingData.phone && (
                              <div className="detail-item">
                                <span className="detail-label">Phone:</span>
                                <span className="detail-value">{billingData.phone}</span>
                              </div>
                            )}
                            {billingData.gst && (
                              <div className="detail-item">
                                <span className="detail-label">GST Number:</span>
                                <span className="detail-value">{billingData.gst}</span>
                              </div>
                            )}
                            {billingData.iec && (
                              <div className="detail-item">
                                <span className="detail-label">IEC Code:</span>
                                <span className="detail-value">{billingData.iec}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Billing Address */}
                        {(billingData.address1 || billingData.address2 || billingData.city || billingData.state || billingData.zip || billingData.postcode || billingData.country) && (
                          <div className="order-detail-section">
                            <h3>Billing Address</h3>
                            <div className="detail-grid">
                              {(billingData.address1 || billingData.address2) && (
                                <div className="detail-item full-width">
                                  <span className="detail-label">Address:</span>
                                  <span className="detail-value">
                                    {[billingData.address1, billingData.address2].filter(Boolean).join(", ")}
                                  </span>
                                </div>
                              )}
                              {(billingData.city || billingData.state || billingData.zip || billingData.postcode) && (
                                <div className="detail-item full-width">
                                  <span className="detail-label">City, State, ZIP:</span>
                                  <span className="detail-value">
                                    {[billingData.city, billingData.state, billingData.zip || billingData.postcode].filter(Boolean).join(", ")}
                                  </span>
                                </div>
                              )}
                              {billingData.country && (
                                <div className="detail-item">
                                  <span className="detail-label">Country:</span>
                                  <span className="detail-value">{billingData.country}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Order Items */}
                        <div className="order-detail-section">
                          <h3>Order Items</h3>
                          <div className="order-items-detail">
                            {selectedOrder.items && selectedOrder.items.length > 0 ? (
                              selectedOrder.items.map((item, idx) => {
                                const imageUrl = item.image?.startsWith("http")
                                  ? item.image
                                  : `${API_BASE}${item.image}`;
                                const itemTotal = parseFloat(item.price) * item.qty;
                                
                                return (
                                  <div key={idx} className="order-item-detail">
                                    {item.image && (
                                      <img src={imageUrl || "/placeholder.png"} alt={item.productName} className="order-item-image" />
                                    )}
                                    <div className="order-item-info">
                                      <div className="order-item-name">{item.productName}</div>
                                      {item.variantSku && (
                                        <div className="order-item-sku">SKU: {item.variantSku}</div>
                                      )}
                                      {item.attributes && item.attributes.length > 0 && (
                                        <div className="order-item-attributes">
                                          {item.attributes.map((attr, attrIdx) => (
                                            <span key={attrIdx} className="attribute-tag">
                                              {attr.name}: {attr.value}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                      <div className="order-item-qty-price">
                                        <span>Quantity: {item.qty}</span>
                                        <span>Price: {formatPrice(parseFloat(item.price), currency, exchangeRate)}</span>
                                        <span className="order-item-total">Subtotal: {formatPrice(itemTotal, currency, exchangeRate)}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div>No items found</div>
                            )}
                          </div>
                        </div>

                        {/* Order Summary */}
                        <div className="order-detail-section">
                          <h3>Order Summary</h3>
                          <div className="order-summary">
                            <div className="summary-row">
                              <span className="summary-label">Subtotal:</span>
                              <span className="summary-value">{formatPrice(parseFloat(selectedOrder.total_amount || selectedOrder.total || 0), currency, exchangeRate)}</span>
                            </div>
                            <div className="summary-row total-row">
                              <span className="summary-label">Total Amount:</span>
                              <span className="summary-value">{formatPrice(parseFloat(selectedOrder.total_amount || selectedOrder.total || 0), currency, exchangeRate)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Order Notes */}
                        {billingData.notes && (
                          <div className="order-detail-section">
                            <h3>Notes</h3>
                            <div className="order-notes">
                              <p className="notes-text">{billingData.notes}</p>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default Orders;

