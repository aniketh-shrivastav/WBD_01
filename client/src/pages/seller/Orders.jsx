import React, { useEffect, useState } from "react";

function useLink(href) {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, [href]);
}

function StatusBadge({ status }) {
  const s = String(status || "").toLowerCase();
  const color =
    s === "pending"
      ? "#FFC107"
      : s === "confirmed"
        ? "#7e57c2"
        : s === "shipped"
          ? "#2196F3"
          : s === "delivered"
            ? "#4CAF50"
            : s === "cancelled"
              ? "#e53935"
              : "#546e7a";
  const label = s.charAt(0).toUpperCase() + s.slice(1);
  return (
    <span
      className={`status ${s}`}
      style={{
        padding: "6px 12px",
        borderRadius: 16,
        color: "#fff",
        display: "inline-block",
        background: color,
        fontSize: ".85rem",
      }}
    >
      {label}
    </span>
  );
}

export default function SellerOrders() {
  useLink("/Css/CStyle.css");
  useLink("/newstyle.css");
  useLink("/Css/sellerBase.css");

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Store original statuses to track changes
  const [originalStatuses, setOriginalStatuses] = useState({});
  // Store pending status changes (not yet saved)
  const [pendingStatuses, setPendingStatuses] = useState({});
  // Store delivery dates
  const [deliveryDates, setDeliveryDates] = useState({});

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
      <nav className="navbar">
        <div className="brand">
          <img
            src="/images3/logo2.jpg"
            alt="AutoCustomizer"
            style={{ height: "40px", objectFit: "contain" }}
          />
        </div>
        <ul>
          <li>
            <a href="/seller/dashboard">Dashboard</a>
          </li>
          <li>
            <a href="/seller/profileSettings">Profile Settings</a>
          </li>
          <li>
            <a href="/seller/productmanagement">Products</a>
          </li>
          <li>
            <a href="/seller/orders" className="active">
              Orders
            </a>
          </li>
          <li>
            <a href="/seller/reviews">Reviews</a>
          </li>
          <li>
            <a href="/logout">Logout</a>
          </li>
        </ul>
      </nav>

      <header>
        <h1>Order Management</h1>
      </header>

      <main className="seller-main">
        <div
          className="container"
          style={{
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
            padding: 20,
          }}
        >
          <h2 style={{ marginTop: 0, color: "#6a11cb" }}>Orders</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {[
                    "Order ID",
                    "Customer",
                    "Product",
                    "Qty",
                    "Delivery Address",
                    "Delivery Date",
                    "Status",
                    "Action",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: 10,
                        background: "#6a11cb",
                        color: "#fff",
                        textAlign: "left",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      style={{ textAlign: "center", padding: 20 }}
                    >
                      Loading...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td
                      colSpan={8}
                      style={{ textAlign: "center", padding: 20, color: "red" }}
                    >
                      {error}
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      style={{
                        textAlign: "center",
                        padding: 25,
                        color: "#888",
                      }}
                    >
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
                    // Disable if original status is final (prevent changing FROM final state)
                    // Allow changing TO delivered/cancelled from other states
                    const disabled = ["delivered", "cancelled"].includes(
                      String(originalStatus).toLowerCase(),
                    );

                    return (
                      <tr key={uniqueId}>
                        <td
                          style={{ padding: 8, borderBottom: "1px solid #ddd" }}
                        >
                          {o.orderId}
                        </td>
                        <td
                          style={{ padding: 8, borderBottom: "1px solid #ddd" }}
                        >
                          {o.customerName}
                        </td>
                        <td
                          style={{ padding: 8, borderBottom: "1px solid #ddd" }}
                        >
                          {o.productName}
                        </td>
                        <td
                          style={{ padding: 8, borderBottom: "1px solid #ddd" }}
                        >
                          {o.quantity}
                        </td>
                        <td
                          style={{ padding: 8, borderBottom: "1px solid #ddd" }}
                        >
                          {o.deliveryAddress}
                        </td>
                        <td
                          style={{ padding: 8, borderBottom: "1px solid #ddd" }}
                        >
                          <input
                            type="date"
                            value={deliveryDates[uniqueId] || ""}
                            onChange={(e) =>
                              setDeliveryDates((prev) => ({
                                ...prev,
                                [uniqueId]: e.target.value,
                              }))
                            }
                            disabled={disabled}
                            min={new Date().toISOString().split("T")[0]}
                            style={{
                              padding: "4px 8px",
                              borderRadius: 6,
                              border: "1px solid #ccc",
                              fontSize: 13,
                            }}
                          />
                          {deliveryDates[uniqueId] && (
                            <div
                              style={{
                                fontSize: 11,
                                color: "#6b7280",
                                marginTop: 2,
                              }}
                            >
                              {new Date(
                                deliveryDates[uniqueId],
                              ).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td
                          style={{ padding: 8, borderBottom: "1px solid #ddd" }}
                        >
                          <StatusBadge status={currentStatus} />
                        </td>
                        <td
                          style={{ padding: 8, borderBottom: "1px solid #ddd" }}
                        >
                          <div
                            className="form-inline"
                            style={{
                              background: "transparent",
                              padding: 0,
                              margin: 0,
                            }}
                          >
                            <select
                              value={String(currentStatus).toLowerCase()}
                              disabled={disabled}
                              onChange={(e) =>
                                handleStatusChange(uniqueId, e.target.value)
                              }
                              style={{
                                padding: 6,
                                borderRadius: 6,
                                borderColor: hasChanged ? "#ffc107" : "",
                              }}
                            >
                              {allStatuses.map((s) => (
                                <option key={s} value={s}>
                                  {s.charAt(0).toUpperCase() + s.slice(1)}
                                </option>
                              ))}
                            </select>
                            <button
                              className="btn"
                              disabled={disabled || !hasChanged}
                              style={{
                                marginLeft: 8,
                                opacity: disabled || !hasChanged ? 0.5 : 1,
                                cursor:
                                  disabled || !hasChanged
                                    ? "not-allowed"
                                    : "pointer",
                              }}
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

      <footer className="seller-footer">
        <p>© 2025 AutoCustomizer | All Rights Reserved</p>
      </footer>

      {/* Scoped CSS guardrails */}
      <style>{`
        .seller-page { background: linear-gradient(135deg, #f5f7fa, #c3cfe2); min-height: 100vh; }
        .seller-page .navbar { position: static !important; }
        .seller-page header { background: linear-gradient(135deg, #6a11cb, #2575fc); color:#fff; padding:30px 20px; text-align:center; box-shadow:0 4px 6px rgba(0,0,0,0.1); }
        .seller-page header h1 { margin:0; font-weight:600; }

        /* Make the Update button look enabled unless actually disabled */
        .seller-page .form-inline .btn {
          background: linear-gradient(135deg, #6a11cb, #2575fc) !important;
          color: #fff !important;
          border: none !important;
          padding: 8px 14px !important;
          border-radius: 8px !important;
          cursor: pointer !important;
          opacity: 1 !important;
          box-shadow: 0 2px 6px rgba(0,0,0,0.12);
          transition: transform .15s ease, box-shadow .15s ease, background .2s ease;
        }
        .seller-page .form-inline .btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(0,0,0,0.18);
        }
        .seller-page .form-inline .btn:disabled {
          background: #d5d7de !important;
          color: #888 !important;
          cursor: not-allowed !important;
          opacity: .75 !important;
          box-shadow: none !important;
          transform: none !important;
        }
      `}</style>
    </div>
  );
}
