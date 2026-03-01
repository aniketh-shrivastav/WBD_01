import React, { useEffect, useState } from "react";
import SellerNav from "../../components/SellerNav";
import SellerFooter from "../../components/SellerFooter";
import "../../Css/seller.css";

function StatusBadge({ status }) {
  const s = String(status || "").toLowerCase();
  const label = s.charAt(0).toUpperCase() + s.slice(1);
  return (
    <span className={`seller-status-badge seller-status-${s}`}>{label}</span>
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
                  <th>Delivery Address</th>
                  <th>Delivery Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="seller-td-empty">
                      <div
                        className="seller-spinner"
                        style={{ margin: "0 auto" }}
                      />
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={8} className="seller-td-error">
                      {error}
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="seller-td-empty">
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
                        <td>{o.deliveryAddress}</td>
                        <td>
                          <input
                            type="date"
                            className="seller-input seller-input-compact"
                            value={deliveryDates[uniqueId] || ""}
                            onChange={(e) =>
                              setDeliveryDates((prev) => ({
                                ...prev,
                                [uniqueId]: e.target.value,
                              }))
                            }
                            disabled={disabled}
                            min={new Date().toISOString().split("T")[0]}
                          />
                          {deliveryDates[uniqueId] && (
                            <div className="seller-date-label">
                              {new Date(
                                deliveryDates[uniqueId],
                              ).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td>
                          <StatusBadge status={currentStatus} />
                        </td>
                        <td>
                          <div className="seller-order-action">
                            <select
                              className={`seller-select seller-select-compact${hasChanged ? " seller-select-changed" : ""}`}
                              value={String(currentStatus).toLowerCase()}
                              disabled={disabled}
                              onChange={(e) =>
                                handleStatusChange(uniqueId, e.target.value)
                              }
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
                                  placeholder="Enter delivery OTP"
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
                                    width: "130px",
                                    letterSpacing: "2px",
                                    fontWeight: 600,
                                    textAlign: "center",
                                    marginTop: "4px",
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

      <SellerFooter />
    </div>
  );
}
