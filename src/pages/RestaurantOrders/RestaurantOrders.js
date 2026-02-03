import React, { useEffect, useState } from "react";
import { api } from "../../api";
import "./RestaurantOrders.css";

const formatDate = (isoString) => {
  if (!isoString) return "-";
  const date = new Date(isoString);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
};

const normalizeItems = (items) => {
  if (!items) return [];
  if (Array.isArray(items)) {
    return items.map((itm, idx) => {
      if (typeof itm === "string") return { label: itm, key: idx };
      if (typeof itm === "object") {
        const name = itm.item_name || itm.item_nae || itm.name || "Item";
        const qty = itm.quantity ?? itm.qty ?? 1;
        const price = itm.price;
        return {
          label: `${qty} x ${name}${price !== undefined ? ` (₹${price})` : ""}`,
          key: idx
        };
      }
      return { label: String(itm), key: idx };
    });
  }
  return [{ label: String(items), key: "single" }];
};

const RestaurantOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError("");

    api
      .getRestaurantOrders()
      .then((res) => {
        if (!isMounted) return;
        setOrders(res.orders || []);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || "Failed to load restaurant orders");
      })
      .finally(() => isMounted && setLoading(false));

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="restaurant-orders-page">
      <div className="restaurant-orders-header">
        <h1>Restaurant Orders</h1>
        <p>Live feed from rkindustriesexports.com</p>
      </div>

      {loading && <div className="ro-card">Loading orders...</div>}
      {error && !loading && <div className="ro-card ro-error">{error}</div>}

      {!loading && !error && (
        <div className="ro-table-wrapper">
          <table className="ro-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Items</th>
                <th>Amount</th>
                <th>Collection</th>
                <th>Status</th>
                <th>Address</th>
                <th>Phone</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center" }}>
                    No orders found.
                  </td>
                </tr>
              )}
              {orders.map((order) => {
                const items = normalizeItems(order.order_items);
                return (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>{order.name || "-"}</td>
                    <td>
                      <ul className="ro-items-list">
                        {items.map((itm) => (
                          <li key={itm.key}>{itm.label}</li>
                        ))}
                      </ul>
                    </td>
                    <td>₹{order.amount || "-"}</td>
                    <td>{order.collection || "-"}</td>
                    <td>
                      <span className={`ro-status ro-status-${order.status || "pending"}`}>
                        {order.status || "pending"}
                      </span>
                    </td>
                    <td>{order.address || "-"}</td>
                    <td>{order.phone_no || "-"}</td>
                    <td>{formatDate(order.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RestaurantOrders;
