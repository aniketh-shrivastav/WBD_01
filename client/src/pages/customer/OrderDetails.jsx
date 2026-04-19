import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CustomerNav from "../../components/CustomerNav";
import CustomerFooter from "../../components/CustomerFooter";
import "../../Css/customer.css";

function useLink(href) {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, [href]);
}

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  useLink("/styles/styles.css");

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`/customer/api/order/${id}`, {
          headers: { Accept: "application/json" },
          credentials: "include",
        });
        if (res.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        const j = await res.json();
        if (!res.ok) {
          throw new Error(j?.message || "Failed to load order details");
        }
        if (!j.success) throw new Error(j.message || "Failed to load order");
        if (!cancelled) setOrder(j.order || null);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load order");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  const getStatusClass = (status) => {
    const statusMap = {
      pending: "customer-status-pending",
      confirmed: "customer-status-confirmed",
      shipped: "customer-status-shipped",
      delivered: "customer-status-delivered",
      cancelled: "customer-status-cancelled",
    };
    return statusMap[status?.toLowerCase()] || "customer-status-pending";
  };

  const formatExpectedDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString();
  };

  const formatDeliveryAddress = (orderData) => {
    const details = orderData?.deliveryAddressDetails;
    if (!details || typeof details !== "object") {
      return orderData?.deliveryAddress || "-";
    }

    const line1 = [details.addressLine1, details.addressLine2]
      .filter(Boolean)
      .join(", ");
    const line2 = [
      details.landmark,
      details.city,
      details.state,
      details.postalCode,
    ]
      .filter(Boolean)
      .join(", ");
    return [line1, line2, details.country].filter(Boolean).join(", ") || "-";
  };

  return (
    <div className="customer-page">
      <CustomerNav />
      <main className="customer-main" style={{ maxWidth: "900px" }}>
        {loading && (
          <div className="customer-loading">
            <div className="customer-spinner"></div>
            <div className="customer-loading-text">
              Loading order details...
            </div>
          </div>
        )}

        {error && (
          <div className="customer-alert customer-alert-error">
            <div className="customer-alert-icon">⚠️</div>
            <div className="customer-alert-content">{error}</div>
          </div>
        )}

        {!loading && !error && order && (
          <div>
            <button
              type="button"
              className="customer-btn customer-btn-secondary customer-btn-sm"
              onClick={() => navigate("/customer/history")}
              style={{ marginBottom: "24px" }}
            >
              ← Back to History
            </button>

            <h1 className="customer-title" style={{ marginBottom: "24px" }}>
              Order Details
            </h1>

            {/* Order Summary Card */}
            <div className="customer-card" style={{ marginBottom: "24px" }}>
              <div
                className="customer-card-header"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "14px",
                      color: "var(--customer-text-secondary)",
                    }}
                  >
                    Order ID
                  </span>
                  <div style={{ fontWeight: "600", fontFamily: "monospace" }}>
                    {order.orderId || order._id}
                  </div>
                </div>
                <span
                  className={`customer-status-badge ${getStatusClass(order.orderStatus)}`}
                >
                  {order.orderStatus}
                </span>
              </div>
              <div className="customer-card-body">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "20px",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "var(--customer-text-secondary)",
                      }}
                    >
                      Placed On
                    </span>
                    <div style={{ fontWeight: "500" }}>
                      {order.placedAt
                        ? new Date(order.placedAt).toLocaleString()
                        : "-"}
                    </div>
                  </div>
                  <div>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "var(--customer-text-secondary)",
                      }}
                    >
                      Payment Status
                    </span>
                    <div style={{ fontWeight: "500" }}>
                      {order.paymentStatus}
                    </div>
                  </div>
                  <div>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "var(--customer-text-secondary)",
                      }}
                    >
                      City / State
                    </span>
                    <div style={{ fontWeight: "500" }}>
                      {order.deliveryAddressDetails
                        ? `${order.deliveryAddressDetails.city || "-"}, ${order.deliveryAddressDetails.state || "-"}`
                        : order.district || "-"}
                    </div>
                  </div>
                  <div>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "var(--customer-text-secondary)",
                      }}
                    >
                      Total Amount
                    </span>
                    <div
                      style={{
                        fontWeight: "700",
                        fontSize: "1.25rem",
                        color: "var(--customer-primary)",
                      }}
                    >
                      ₹{order.totalAmount}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: "16px",
                    paddingTop: "16px",
                    borderTop: "1px solid var(--customer-border)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "13px",
                      color: "var(--customer-text-secondary)",
                    }}
                  >
                    Delivery Address
                  </span>
                  <div style={{ fontWeight: "500" }}>
                    {formatDeliveryAddress(order)}
                  </div>
                </div>
              </div>
            </div>

            {/* Items Section */}
            <h2 className="customer-subtitle" style={{ marginBottom: "16px" }}>
              📦 Order Items
            </h2>
            <div style={{ display: "grid", gap: "16px", marginBottom: "24px" }}>
              {(order.items || []).map((item, idx) => (
                <div key={`${item.productId}-${idx}`} className="customer-card">
                  <div
                    className="customer-card-body"
                    style={{
                      display: "flex",
                      gap: "20px",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                    }}
                  >
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.name}
                        style={{
                          width: 100,
                          height: 100,
                          objectFit: "cover",
                          borderRadius: "var(--customer-radius)",
                          border: "1px solid var(--customer-border)",
                        }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: "200px" }}>
                      <h4 style={{ fontWeight: "600", marginBottom: "8px" }}>
                        {item.name}
                      </h4>
                      <div
                        style={{
                          display: "flex",
                          gap: "24px",
                          flexWrap: "wrap",
                          color: "var(--customer-text-secondary)",
                          fontSize: "14px",
                        }}
                      >
                        <span>
                          Qty:{" "}
                          <strong
                            style={{ color: "var(--customer-text-primary)" }}
                          >
                            {item.quantity}
                          </strong>
                        </span>
                        <span>
                          Price:{" "}
                          <strong style={{ color: "var(--customer-primary)" }}>
                            ₹{item.price}
                          </strong>
                        </span>
                        {item.seller && (
                          <span>
                            Seller:{" "}
                            <strong
                              style={{ color: "var(--customer-text-primary)" }}
                            >
                              {item.seller.name || ""}
                            </strong>
                          </span>
                        )}
                      </div>
                      <div style={{ marginTop: "8px" }}>
                        <span
                          className={`customer-status-badge ${getStatusClass(item.itemStatus || order.orderStatus)}`}
                        >
                          {item.itemStatus || order.orderStatus}
                        </span>
                      </div>
                      {item.deliveryOtp &&
                        String(item.itemStatus || "").toLowerCase() ===
                          "shipped" && (
                          <div
                            style={{
                              marginTop: "10px",
                              padding: "8px 14px",
                              background: "#ede9fe",
                              border: "1px dashed #6d28d9",
                              borderRadius: "8px",
                              display: "inline-block",
                            }}
                          >
                            <strong
                              style={{ color: "#6d28d9", fontSize: "13px" }}
                            >
                              Delivery OTP:
                            </strong>{" "}
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: "18px",
                                letterSpacing: "3px",
                                color: "#4c1d95",
                              }}
                            >
                              {item.deliveryOtp}
                            </span>
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#6d28d9",
                                marginTop: "2px",
                              }}
                            >
                              Share this OTP with the seller to confirm delivery
                            </div>
                          </div>
                        )}
                      <div
                        style={{
                          marginTop: "10px",
                          fontSize: "14px",
                          color: "var(--customer-text-secondary)",
                        }}
                      >
                        <span>Expected Delivery: </span>
                        <strong
                          style={{ color: "var(--customer-text-primary)" }}
                        >
                          {formatExpectedDate(item.deliveryDate)}
                        </strong>
                      </div>

                      {String(
                        item.itemStatus || order.orderStatus || "",
                      ).toLowerCase() === "delivered" &&
                        item.productId && (
                          <div style={{ marginTop: "12px" }}>
                            <button
                              type="button"
                              className="customer-btn customer-btn-primary customer-btn-sm"
                              onClick={() =>
                                navigate(`/customer/product/${item.productId}`)
                              }
                            >
                              Write / Update Review
                            </button>
                          </div>
                        )}
                    </div>
                  </div>

                  {(item.itemStatusHistory || []).length > 0 && (
                    <div className="customer-card-footer">
                      <strong
                        style={{
                          fontSize: "13px",
                          color: "var(--customer-text-secondary)",
                        }}
                      >
                        Status History
                      </strong>
                      <div style={{ marginTop: "8px", fontSize: "13px" }}>
                        {(item.itemStatusHistory || []).map((h, i) => (
                          <div
                            key={i}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              marginBottom: "4px",
                            }}
                          >
                            <span
                              style={{
                                background: "var(--customer-border)",
                                padding: "2px 8px",
                                borderRadius: "4px",
                              }}
                            >
                              {h.from || "-"}
                            </span>
                            <span>→</span>
                            <span
                              style={{
                                background: "var(--customer-primary)",
                                color: "white",
                                padding: "2px 8px",
                                borderRadius: "4px",
                              }}
                            >
                              {h.to}
                            </span>
                            <span
                              style={{
                                color: "var(--customer-text-muted)",
                                marginLeft: "auto",
                              }}
                            >
                              {h.changedAt
                                ? new Date(h.changedAt).toLocaleString()
                                : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Order Status History */}
            {(order.orderStatusHistory || []).length > 0 && (
              <div className="customer-card" style={{ marginBottom: "24px" }}>
                <div className="customer-card-header">
                  <h3 style={{ fontSize: "1rem", margin: 0 }}>
                    📋 Order Status History
                  </h3>
                </div>
                <div className="customer-card-body">
                  {(order.orderStatusHistory || []).map((h, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "8px 0",
                        borderBottom:
                          i < order.orderStatusHistory.length - 1
                            ? "1px dashed var(--customer-border)"
                            : "none",
                      }}
                    >
                      <span
                        style={{
                          background: "var(--customer-bg-secondary)",
                          padding: "4px 12px",
                          borderRadius: "6px",
                          fontWeight: "500",
                        }}
                      >
                        {h.from || "-"}
                      </span>
                      <span
                        style={{
                          color: "var(--customer-primary)",
                          fontSize: "20px",
                        }}
                      >
                        →
                      </span>
                      <span
                        style={{
                          background: "var(--customer-primary)",
                          color: "white",
                          padding: "4px 12px",
                          borderRadius: "6px",
                          fontWeight: "500",
                        }}
                      >
                        {h.to}
                      </span>
                      <span
                        style={{
                          color: "var(--customer-text-muted)",
                          marginLeft: "auto",
                          fontSize: "13px",
                        }}
                      >
                        {h.changedAt
                          ? new Date(h.changedAt).toLocaleString()
                          : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
      <CustomerFooter />
    </div>
  );
}
