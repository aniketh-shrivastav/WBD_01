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

export default function ServiceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  useLink("/styles/styles.css");

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`/customer/api/service/${id}`, {
          headers: { Accept: "application/json" },
          credentials: "include",
        });
        if (res.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        if (!res.ok) throw new Error("Failed to load service details");
        const j = await res.json();
        if (!j.success) throw new Error(j.message || "Failed to load service");
        if (!cancelled) setBooking(j.booking || null);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load service");
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
      waiting: "customer-status-pending",
      confirmed: "customer-status-confirmed",
      delivered: "customer-status-delivered",
      rejected: "customer-status-cancelled",
    };
    return statusMap[status?.toLowerCase()] || "customer-status-pending";
  };

  return (
    <div className="customer-page">
      <CustomerNav />
      <main className="customer-main" style={{ maxWidth: "900px" }}>
        {loading && (
          <div className="customer-loading">
            <div className="customer-spinner"></div>
            <div className="customer-loading-text">
              Loading service details...
            </div>
          </div>
        )}

        {error && (
          <div className="customer-alert customer-alert-error">
            <div className="customer-alert-icon">⚠️</div>
            <div className="customer-alert-content">{error}</div>
          </div>
        )}

        {!loading && !error && booking && (
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
              Service Booking Details
            </h1>

            {/* Service Summary Card */}
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
                    Service ID
                  </span>
                  <div style={{ fontWeight: "600", fontFamily: "monospace" }}>
                    {booking._id}
                  </div>
                </div>
                <span
                  className={`customer-status-badge ${getStatusClass(booking.status)}`}
                >
                  {booking.status}
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
                      Booked On
                    </span>
                    <div style={{ fontWeight: "500" }}>
                      {booking.createdAt
                        ? new Date(booking.createdAt).toLocaleString()
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
                      Total Cost
                    </span>
                    <div
                      style={{
                        fontWeight: "700",
                        fontSize: "1.25rem",
                        color: "var(--customer-primary)",
                      }}
                    >
                      ₹{booking.totalCost || 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Provider Info Card */}
            <div className="customer-card" style={{ marginBottom: "24px" }}>
              <div className="customer-card-header">
                <h3 style={{ margin: 0, fontSize: "1rem" }}>
                  🔧 Service Provider
                </h3>
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
                      Name
                    </span>
                    <div style={{ fontWeight: "500" }}>
                      {booking.providerId?.name || "-"}
                    </div>
                  </div>
                  <div>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "var(--customer-text-secondary)",
                      }}
                    >
                      Email
                    </span>
                    <div style={{ fontWeight: "500" }}>
                      {booking.providerId?.email || "-"}
                    </div>
                  </div>
                  <div>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "var(--customer-text-secondary)",
                      }}
                    >
                      Phone
                    </span>
                    <div style={{ fontWeight: "500" }}>
                      {booking.providerId?.phone || "-"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Booking Details Card */}
            <div className="customer-card" style={{ marginBottom: "24px" }}>
              <div className="customer-card-header">
                <h3 style={{ margin: 0, fontSize: "1rem" }}>
                  🚗 Booking Details
                </h3>
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
                      Selected Services
                    </span>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "6px",
                        marginTop: "6px",
                      }}
                    >
                      {(booking.selectedServices || []).map((service, i) => (
                        <span
                          key={i}
                          style={{
                            background: "var(--customer-bg-secondary)",
                            padding: "4px 12px",
                            borderRadius: "var(--customer-radius-full)",
                            fontSize: "13px",
                            fontWeight: "500",
                          }}
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "var(--customer-text-secondary)",
                      }}
                    >
                      Car Model
                    </span>
                    <div style={{ fontWeight: "500" }}>{booking.carModel}</div>
                  </div>
                  <div>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "var(--customer-text-secondary)",
                      }}
                    >
                      Car Year
                    </span>
                    <div style={{ fontWeight: "500" }}>{booking.carYear}</div>
                  </div>
                  <div>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "var(--customer-text-secondary)",
                      }}
                    >
                      Address
                    </span>
                    <div style={{ fontWeight: "500" }}>{booking.address}</div>
                  </div>
                </div>
                {booking.description && (
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
                      Description
                    </span>
                    <div style={{ fontWeight: "500", marginTop: "4px" }}>
                      {booking.description}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Status History */}
            {(booking.statusHistory || []).length > 0 && (
              <div className="customer-card" style={{ marginBottom: "24px" }}>
                <div className="customer-card-header">
                  <h3 style={{ fontSize: "1rem", margin: 0 }}>
                    📋 Status History
                  </h3>
                </div>
                <div className="customer-card-body">
                  {(booking.statusHistory || []).map((h, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "8px 0",
                        borderBottom:
                          i < booking.statusHistory.length - 1
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

            {/* Cost History */}
            {(booking.costHistory || []).length > 0 && (
              <div className="customer-card" style={{ marginBottom: "24px" }}>
                <div className="customer-card-header">
                  <h3 style={{ fontSize: "1rem", margin: 0 }}>
                    💰 Cost History
                  </h3>
                </div>
                <div className="customer-card-body">
                  {(booking.costHistory || []).map((h, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "8px 0",
                        borderBottom:
                          i < booking.costHistory.length - 1
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
                        ₹{h.from ?? "-"}
                      </span>
                      <span
                        style={{
                          color: "var(--customer-success)",
                          fontSize: "20px",
                        }}
                      >
                        →
                      </span>
                      <span
                        style={{
                          background: "var(--customer-success)",
                          color: "white",
                          padding: "4px 12px",
                          borderRadius: "6px",
                          fontWeight: "500",
                        }}
                      >
                        ₹{h.to}
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
