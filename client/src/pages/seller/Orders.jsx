import React, { useEffect, useState } from "react";
import SellerNav from "../../components/SellerNav";
import SellerFooter from "../../components/SellerFooter";
import "../../Css/seller.css";

function StatusBadge({ status }) {
  const statusColors = {
    pending: "#f59e0b",
    confirmed: "#3b82f6",
    shipped: "#8b5cf6",
    delivered: "#10b981",
    cancelled: "#ef4444",
  };
  return (
    <span
      style={{
        background: statusColors[String(status).toLowerCase()] || "#6b7280",
        color: "white",
        padding: "4px 12px",
        borderRadius: "6px",
        fontSize: "0.85rem",
        fontWeight: "600",
      }}
    >
      {String(status).charAt(0).toUpperCase() + String(status).slice(1)}
    </span>
  );
}

function DetailsModal({
  isOpen,
  onClose,
  order,
  onDeliveryDateChange,
  deliveryDate,
  onSaveDeliveryDate,
}) {
  if (!isOpen || !order) return null;

  const [savingDeliveryDate, setSavingDeliveryDate] = useState(false);

  const disabled = ["delivered", "cancelled"].includes(
    String(order.status).toLowerCase(),
  );

  const handleSaveDeliveryDate = async () => {
    if (!deliveryDate) {
      alert("Please select a delivery date");
      return;
    }

    setSavingDeliveryDate(true);
    try {
      const orderIdentifier = order._id || order.orderId;
      const res = await fetch(
        `/seller/orders/${orderIdentifier}/delivery-date`,
        {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          deliveryDate,
          productId: order.productId,
          itemIndex: order.itemIndex,
        }),
        },
      );

      const data = await res.json();
      if (data.success) {
        alert("Delivery date saved successfully!");
        onSaveDeliveryDate?.();
      } else {
        alert(data.message || "Failed to save delivery date");
      }
    } catch (e) {
      alert("Error saving delivery date: " + e.message);
    } finally {
      setSavingDeliveryDate(false);
    }
  };

  return (
    <div className="seller-modal-overlay" onClick={onClose}>
      <div
        className="seller-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="seller-modal-header">
          <h2>Order Details</h2>
          <button className="seller-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="seller-modal-body">
          {/* Order Information */}
          <div className="seller-detail-section">
            <h3>Order Information</h3>
            <div className="seller-detail-grid">
              <div className="seller-detail-item">
                <label>Order ID</label>
                <span>{order.orderId || order._id}</span>
              </div>
              <div className="seller-detail-item">
                <label>Status</label>
                <span>
                  <StatusBadge status={order.status} />
                </span>
              </div>
              <div className="seller-detail-item">
                <label>Placed On</label>
                <span>{new Date(order.placedAt).toLocaleString()}</span>
              </div>
              <div className="seller-detail-item">
                <label>Total Amount</label>
                <span>₹{order.totalAmount || 0}</span>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="seller-detail-section">
            <h3>Customer Information</h3>
            <div className="seller-detail-grid">
              <div className="seller-detail-item">
                <label>Customer Name</label>
                <span>{order.customerName}</span>
              </div>
              <div className="seller-detail-item">
                <label>Email</label>
                <span>{order.customerEmail}</span>
              </div>
              <div className="seller-detail-item">
                <label>Delivery Location</label>
                <span>{order.district}</span>
              </div>
            </div>
          </div>

          {/* Product Information */}
          <div className="seller-detail-section">
            <h3>Product Information</h3>
            {order.image && (
              <div className="seller-product-image-container">
                <img
                  src={order.image}
                  alt={order.productName}
                  className="seller-product-image"
                />
              </div>
            )}
            <div className="seller-detail-grid">
              <div className="seller-detail-item">
                <label>Product</label>
                <span>{order.productName}</span>
              </div>
              <div className="seller-detail-item">
                <label>Quantity</label>
                <span>{order.quantity}</span>
              </div>
              <div className="seller-detail-item">
                <label>Price</label>
                <span>₹{order.price}</span>
              </div>
            </div>
          </div>

          {/* Delivery Information */}
          <div className="seller-detail-section">
            <h3>Delivery Information</h3>
            <div className="seller-detail-item seller-full-width">
              <label>Delivery Address</label>
              <span>{order.deliveryAddress}</span>
            </div>
            <div className="seller-detail-grid">
              <div className="seller-detail-item">
                <label>Expected Delivery Date</label>
                <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <input
                      type="date"
                      className="seller-detail-input"
                      value={deliveryDate || ""}
                      onChange={(e) => onDeliveryDateChange(e.target.value)}
                      disabled={disabled}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <button
                    onClick={handleSaveDeliveryDate}
                    disabled={disabled || !deliveryDate || savingDeliveryDate}
                    style={{
                      padding: "8px 16px",
                      background: disabled ? "#d1d5db" : "#667eea",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      cursor: disabled || savingDeliveryDate ? "not-allowed" : "pointer",
                      fontWeight: "500",
                      fontSize: "0.9rem",
                      transition: "background 0.2s",
                      opacity: savingDeliveryDate ? 0.7 : 1,
                      whiteSpace: "nowrap",
                    }}
                    onMouseOver={(e) => {
                      if (!disabled && !savingDeliveryDate) {
                        e.target.style.background = "#764ba2";
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!disabled && !savingDeliveryDate) {
                        e.target.style.background = "#667eea";
                      }
                    }}
                  >
                    {savingDeliveryDate ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
              {order.deliveryOtp && (
                <div className="seller-detail-item">
                  <label>Delivery OTP</label>
                  <span>{order.deliveryOtp}</span>
                </div>
              )}
            </div>
          </div>

          {/* Status History */}
          {(order.itemStatusHistory && order.itemStatusHistory.length > 0) ||
          (order.orderStatusHistory && order.orderStatusHistory.length > 0) ? (
            <div className="seller-detail-section">
              <h3>Status Timeline</h3>
              <div className="seller-status-timeline">
                {(order.itemStatusHistory || []).map((h, idx) => (
                  <div className="seller-timeline-item" key={`item-${idx}`}>
                    <div className="seller-timeline-dot"></div>
                    <div className="seller-timeline-content">
                      <div className="seller-timeline-change">
                        <span className="seller-timeline-from">
                          {h.from || "Start"}
                        </span>
                        <span className="seller-timeline-arrow">→</span>
                        <span className="seller-timeline-to">{h.to}</span>
                      </div>
                      <div className="seller-timeline-time">
                        {h.changedAt
                          ? new Date(h.changedAt).toLocaleString()
                          : "N/A"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <style>{`
        .seller-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease-in-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .seller-modal-content {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 800px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        .seller-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 2px solid #e5e7eb;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px 12px 0 0;
        }
        .seller-modal-header h2 {
          margin: 0;
          font-size: 1.25rem;
          color: white;
        }
        .seller-modal-close {
          background: none;
          border: none;
          font-size: 1.75rem;
          cursor: pointer;
          color: white;
          line-height: 1;
          opacity: 0.9;
          transition: opacity 0.2s;
        }
        .seller-modal-close:hover {
          opacity: 1;
        }
        .seller-modal-body {
          padding: 24px;
        }
        .seller-detail-section {
          margin-bottom: 24px;
        }
        .seller-detail-section:last-child {
          margin-bottom: 0;
        }
        .seller-detail-section h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
          margin: 0 0 16px 0;
          padding-bottom: 8px;
          border-bottom: 2px solid #e5e7eb;
        }
        .seller-detail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }
        .seller-detail-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .seller-detail-item.seller-full-width {
          grid-column: 1 / -1;
        }
        .seller-detail-item label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #6b7280;
        }
        .seller-detail-item span {
          font-size: 0.95rem;
          font-weight: 500;
          color: #111827;
        }
        .seller-detail-input {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.95rem;
          width: 100%;
          transition: border-color 0.2s;
        }
        .seller-detail-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        .seller-detail-input:disabled {
          background: #f3f4f6;
          color: #9ca3af;
          cursor: not-allowed;
        }
        .seller-status-timeline {
          position: relative;
          padding-left: 24px;
        }
        .seller-timeline-item {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
          position: relative;
        }
        .seller-timeline-item:last-child {
          margin-bottom: 0;
        }
        .seller-timeline-dot {
          position: absolute;
          left: -24px;
          top: 6px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: 3px solid white;
          box-shadow: 0 0 0 2px #667eea;
          flex-shrink: 0;
        }
        .seller-timeline-item:not(:last-child) .seller-timeline-dot::after {
          content: '';
          position: absolute;
          left: 1px;
          top: 12px;
          width: 2px;
          height: 40px;
          background: #e5e7eb;
        }
        .seller-timeline-content {
          flex: 1;
          padding: 12px;
          background: #f9fafb;
          border-radius: 8px;
          border-left: 3px solid #667eea;
        }
        .seller-timeline-change {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
          flex-wrap: wrap;
        }
        .seller-timeline-from,
        .seller-timeline-to {
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 500;
          font-size: 0.85rem;
        }
        .seller-timeline-from {
          background: #f3f4f6;
          color: #6b7280;
        }
        .seller-timeline-to {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .seller-timeline-arrow {
          color: #d1d5db;
          font-weight: 600;
        }
        .seller-timeline-time {
          font-size: 0.8rem;
          color: #9ca3af;
          margin-top: 4px;
        }
        .seller-product-image-container {
          margin-bottom: 16px;
          text-align: center;
        }
        .seller-product-image {
          max-width: 100%;
          max-height: 250px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
}

export default function SellerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Store original statuses to track changes
  const [originalStatuses, setOriginalStatuses] = useState({});
  // Store pending status changes (not yet saved)
  const [pendingStatuses, setPendingStatuses] = useState({});
  // Store delivery dates
  const [deliveryDates, setDeliveryDates] = useState({});
  // Store delivery OTP inputs
  const [otpInputs, setOtpInputs] = useState({});
  // Store selected order for details modal
  const [selectedOrder, setSelectedOrder] = useState(null);

  async function loadOrders() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/seller/api/orders", {
        headers: { Accept: "application/json" },
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      if (!data.success)
        throw new Error(data.message || "Failed to load orders");
      const loadedOrders = (data.orders || []).map((o) => ({
        ...o,
        originalStatus: o.status,
      }));
      setOrders(loadedOrders);
      // Initialize original statuses and clear pending changes using uniqueId
      const statusMap = {};
      const dateMap = {};
      loadedOrders.forEach((o) => {
        const uniqueId = o.uniqueId || `${o.orderId}-${o.productId || ""}`;
        statusMap[uniqueId] = o.originalStatus || o.status;
        if (o.deliveryDate) {
          dateMap[uniqueId] = new Date(o.deliveryDate)
            .toISOString()
            .split("T")[0];
        }
      });
      setOriginalStatuses(statusMap);
      setDeliveryDates(dateMap);
      setPendingStatuses({});
    } catch (e) {
      setError("Failed to load orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function updateStatus(uniqueId, orderId, productId, itemIndex) {
    // Get the pending status or current status
    const order = orders.find((o) => {
      const oUniqueId = o.uniqueId || `${o.orderId}-${o.productId || ""}`;
      return oUniqueId === uniqueId;
    });
    const newStatus = pendingStatuses[uniqueId] || order?.status;
    const hasOriginal = Object.prototype.hasOwnProperty.call(
      originalStatuses,
      uniqueId,
    );
    const originalStatus =
      (hasOriginal ? originalStatuses[uniqueId] : order?.originalStatus) ||
      order?.status;

    // Don't update if status hasn't changed
    if (newStatus === originalStatus) {
      alert("Status unchanged. No update needed.");
      return;
    }

    // Require OTP when marking as delivered
    if (newStatus === "delivered") {
      const enteredOtp = (otpInputs[uniqueId] || "").trim();
      if (!enteredOtp || enteredOtp.length !== 6) {
        alert("Please enter the 6-digit delivery OTP from the customer.");
        return;
      }
    }

    try {
      const deliveryDate = deliveryDates[uniqueId] || null;

      const res = await fetch(`/seller/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          newStatus,
          productId: productId || undefined,
          itemIndex: itemIndex !== undefined ? itemIndex : undefined,
          deliveryDate: deliveryDate || undefined,
          otp:
            newStatus === "delivered"
              ? (otpInputs[uniqueId] || "").trim()
              : undefined,
        }),
      });

      const out = await res.json().catch(() => ({}));

      if (!res.ok || out.success === false) {
        const errorMsg = out.message || "Failed to update status";
        alert(errorMsg);
        // Revert to original status on error
        setPendingStatuses((prev) => {
          const updated = { ...prev };
          delete updated[uniqueId];
          return updated;
        });
        setOrders((prev) =>
          prev.map((o) => {
            const oUniqueId = o.uniqueId || `${o.orderId}-${o.productId || ""}`;
            return oUniqueId === uniqueId
              ? { ...o, status: originalStatus }
              : o;
          }),
        );
        return;
      }

      // Update original status after successful save
      setOriginalStatuses((prev) => ({
        ...prev,
        [uniqueId]: newStatus,
      }));

      // Clear pending status
      setPendingStatuses((prev) => {
        const updated = { ...prev };
        delete updated[uniqueId];
        return updated;
      });

      // Clear OTP input
      setOtpInputs((prev) => {
        const updated = { ...prev };
        delete updated[uniqueId];
        return updated;
      });

      // Update order in state
      setOrders((prev) =>
        prev.map((o) => {
          const oUniqueId = o.uniqueId || `${o.orderId}-${o.productId || ""}`;
          return oUniqueId === uniqueId
            ? { ...o, status: newStatus, originalStatus: newStatus }
            : o;
        }),
      );

      alert("Order status updated successfully!");

      // Reload orders to ensure dashboard reflects changes
      setTimeout(() => {
        loadOrders();
      }, 500);
    } catch (e) {
      alert(e.message || "Error updating order");
      // Revert on error
      setPendingStatuses((prev) => {
        const updated = { ...prev };
        delete updated[uniqueId];
        return updated;
      });
      setOrders((prev) =>
        prev.map((o) => {
          const oUniqueId = o.uniqueId || `${o.orderId}-${o.productId || ""}`;
          return oUniqueId === uniqueId ? { ...o, status: originalStatus } : o;
        }),
      );
    }
  }

  function handleStatusChange(uniqueId, newStatus) {
    // Only update the pending status (visual change), don't persist yet
    setPendingStatuses((prev) => ({
      ...prev,
      [uniqueId]: newStatus,
    }));

    // Update visual display immediately
    setOrders((prev) =>
      prev.map((o) => {
        const oUniqueId = o.uniqueId || `${o.orderId}-${o.productId || ""}`;
        return oUniqueId === uniqueId ? { ...o, status: newStatus } : o;
      }),
    );
  }

  const allStatuses = [
    "pending",
    "confirmed",
    "shipped",
    "delivered",
    "cancelled",
  ];

  return (
    <div className="seller-page">
      <SellerNav />

      <main className="seller-main">
        <h1 className="seller-title">Order Management</h1>
        <p className="seller-subtitle">Track and manage all your orders</p>

        <div className="seller-table-container">
          <div className="seller-table-header">
            <span className="seller-table-title">
              Orders
              {orders.length > 0 && (
                <span className="seller-table-count">{orders.length}</span>
              )}
            </span>
          </div>
          <div className="seller-table-wrap">
            <table className="seller-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="seller-td-empty">
                      <div
                        className="seller-spinner"
                        style={{ margin: "0 auto" }}
                      />
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="seller-td-error">
                      {error}
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="seller-td-empty">
                      No orders available.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => {
                    const uniqueId =
                      o.uniqueId || `${o.orderId}-${o.productId || ""}`;
                    const hasOriginal = Object.prototype.hasOwnProperty.call(
                      originalStatuses,
                      uniqueId,
                    );
                    const baseOriginal =
                      (hasOriginal
                        ? originalStatuses[uniqueId]
                        : o.originalStatus) || o.status;
                    const currentStatus = pendingStatuses[uniqueId] || o.status;
                    const originalStatus = baseOriginal;
                    const hasChanged = currentStatus !== originalStatus;
                    const disabled = ["delivered", "cancelled"].includes(
                      String(originalStatus).toLowerCase(),
                    );

                    return (
                      <tr key={uniqueId}>
                        <td className="seller-td-bold">{o.orderId}</td>
                        <td>{o.customerName}</td>
                        <td>{o.productName}</td>
                        <td>{o.quantity}</td>
                        <td>
                          <StatusBadge status={currentStatus} />
                        </td>
                        <td>
                          <div
                            className="seller-order-action"
                            style={{
                              display: "flex",
                              gap: "8px",
                              flexWrap: "wrap",
                            }}
                          >
                            <button
                              className="seller-btn seller-btn-primary seller-btn-sm"
                              onClick={(e) => {
                                e.preventDefault();
                                setSelectedOrder(o);
                              }}
                              style={{ background: "#3b82f6" }}
                            >
                              View Details
                            </button>
                            <select
                              className={`seller-select seller-select-compact${hasChanged ? " seller-select-changed" : ""}`}
                              value={String(currentStatus).toLowerCase()}
                              disabled={disabled}
                              onChange={(e) =>
                                handleStatusChange(uniqueId, e.target.value)
                              }
                              style={{ flex: 1, minWidth: "120px" }}
                            >
                              {allStatuses.map((s) => (
                                <option key={s} value={s}>
                                  {s.charAt(0).toUpperCase() + s.slice(1)}
                                </option>
                              ))}
                            </select>
                            {currentStatus === "delivered" &&
                              originalStatus === "shipped" && (
                                <input
                                  type="text"
                                  className="seller-input seller-input-compact"
                                  placeholder="Enter OTP"
                                  maxLength={6}
                                  value={otpInputs[uniqueId] || ""}
                                  onChange={(e) => {
                                    const val = e.target.value
                                      .replace(/\D/g, "")
                                      .slice(0, 6);
                                    setOtpInputs((prev) => ({
                                      ...prev,
                                      [uniqueId]: val,
                                    }));
                                  }}
                                  style={{
                                    width: "100px",
                                    letterSpacing: "2px",
                                    fontWeight: 600,
                                    textAlign: "center",
                                  }}
                                />
                              )}
                            <button
                              className="seller-btn seller-btn-primary seller-btn-sm"
                              disabled={disabled || !hasChanged}
                              onClick={(e) => {
                                e.preventDefault();
                                updateStatus(
                                  uniqueId,
                                  o.orderId,
                                  o.productId,
                                  o.itemIndex,
                                );
                              }}
                            >
                              Update
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Order Details Modal */}
      <DetailsModal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        order={selectedOrder}
        deliveryDate={
          selectedOrder ? deliveryDates[selectedOrder.uniqueId] : ""
        }
        onDeliveryDateChange={(date) => {
          if (selectedOrder) {
            const uniqueId =
              selectedOrder.uniqueId ||
              `${selectedOrder.orderId}-${selectedOrder.productId || ""}`;
            setDeliveryDates((prev) => ({
              ...prev,
              [uniqueId]: date,
            }));
          }
        }}
        onSaveDeliveryDate={() => {
          // Reload orders after saving delivery date
          loadOrders();
          setSelectedOrder(null);
        }}
      />

      <SellerFooter />
    </div>
  );
}
