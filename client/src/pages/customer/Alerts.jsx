import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomerNav from "../../components/CustomerNav";
import CustomerFooter from "../../components/CustomerFooter";
import "../../Css/customer.css";

/* ─── helpers ─── */
function backendBase() {
  const { protocol, hostname, port } = window.location;
  if (port === "5173") return `${protocol}//${hostname}:3000`;
  return "";
}

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const TYPE_META = {
  new_order: {
    icon: "🛒",
    color: "#4f46e5",
    bg: "#eef2ff",
    label: "New Order",
  },
  order_status: {
    icon: "📦",
    color: "#0369a1",
    bg: "#e0f2fe",
    label: "Order Update",
  },
  new_service: {
    icon: "🔧",
    color: "#7c3aed",
    bg: "#f5f3ff",
    label: "Service Booked",
  },
  service_status: {
    icon: "🔔",
    color: "#0891b2",
    bg: "#ecfeff",
    label: "Service Update",
  },
  price_finalized: {
    icon: "💰",
    color: "#b45309",
    bg: "#fffbeb",
    label: "Price Proposal",
  },
  price_accepted: {
    icon: "✅",
    color: "#047857",
    bg: "#ecfdf5",
    label: "Price Accepted",
  },
  price_rejected: {
    icon: "❌",
    color: "#b91c1c",
    bg: "#fef2f2",
    label: "Price Rejected",
  },
  service_cancelled: {
    icon: "🚫",
    color: "#6b7280",
    bg: "#f3f4f6",
    label: "Cancelled",
  },
};

const FILTER_OPTIONS = [
  { value: "all", label: "All Alerts" },
  { value: "orders", label: "Orders" },
  { value: "services", label: "Services" },
  { value: "price", label: "Price Approvals" },
];

function matchesFilter(type, filter) {
  if (filter === "all") return true;
  if (filter === "orders") return ["new_order", "order_status"].includes(type);
  if (filter === "services")
    return ["new_service", "service_status", "service_cancelled"].includes(
      type,
    );
  if (filter === "price")
    return ["price_finalized", "price_accepted", "price_rejected"].includes(
      type,
    );
  return true;
}

/* ─── main component ─── */
export default function Alerts() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState({});
  const fetchedRef = useRef(false);

  /* ─── fetch notifications ─── */
  const fetchNotifications = useCallback(async (pg = 1) => {
    try {
      setLoading(true);
      const res = await fetch(
        `${backendBase()}/customer/api/notifications?page=${pg}&limit=20`,
        { headers: { Accept: "application/json" }, credentials: "include" },
      );
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
        setTotalPages(data.totalPages);
        setPage(pg);
      } else {
        setError(data.message || "Failed to load alerts");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchNotifications(1);
    }
  }, [fetchNotifications]);

  /* ─── Socket.IO live updates ─── */
  useEffect(() => {
    let socket;
    try {
      const base = backendBase();
      // eslint-disable-next-line no-undef
      const io =
        window.io ||
        (typeof require !== "undefined" && require("socket.io-client"));
      if (!io) return;
      socket =
        typeof io === "function"
          ? io(base || undefined, { withCredentials: true })
          : null;
      if (!socket) return;

      socket.on("notification:new", (notif) => {
        setNotifications((prev) => [notif, ...prev]);
        setUnreadCount((c) => c + 1);
      });
    } catch {
      /* socket optional */
    }
    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  /* ─── actions ─── */
  async function apiAction(url, method = "POST") {
    const res = await fetch(`${backendBase()}${url}`, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    return res.json();
  }

  async function handleMarkAllRead() {
    await apiAction("/customer/api/notifications/mark-all-read", "PUT");
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  async function handleMarkRead(id) {
    await apiAction(`/customer/api/notifications/${id}/read`, "PUT");
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, read: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function handleAcceptPrice(id) {
    setActionLoading((s) => ({ ...s, [id]: "accepting" }));
    const data = await apiAction(
      `/customer/api/notifications/${id}/accept-price`,
    );
    if (data.success) {
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === id
            ? {
                ...n,
                read: true,
                priceApproval: { ...n.priceApproval, status: "accepted" },
              }
            : n,
        ),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setActionLoading((s) => ({ ...s, [id]: null }));
  }

  async function handleRejectPrice(id) {
    setActionLoading((s) => ({ ...s, [id]: "rejecting" }));
    const data = await apiAction(
      `/customer/api/notifications/${id}/reject-price`,
    );
    if (data.success) {
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === id
            ? {
                ...n,
                read: true,
                priceApproval: { ...n.priceApproval, status: "rejected" },
              }
            : n,
        ),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setActionLoading((s) => ({ ...s, [id]: null }));
  }

  async function handleCancelService(id) {
    if (
      !window.confirm("Are you sure you want to cancel this service booking?")
    )
      return;
    setActionLoading((s) => ({ ...s, [id]: "cancelling" }));
    const data = await apiAction(
      `/customer/api/notifications/${id}/cancel-service`,
    );
    if (data.success) {
      fetchNotifications(page);
    }
    setActionLoading((s) => ({ ...s, [id]: null }));
  }

  async function handleDelete(id) {
    await apiAction(`/customer/api/notifications/${id}`, "DELETE");
    setNotifications((prev) => prev.filter((n) => n._id !== id));
  }

  function goToReference(notif) {
    if (!notif.referenceId) return;
    if (notif.referenceModel === "Order") {
      navigate(`/customer/order/${notif.referenceId}`);
    } else if (notif.referenceModel === "ServiceBooking") {
      navigate(`/customer/service/${notif.referenceId}`);
    }
  }

  /* ─── filtered list ─── */
  const filtered = notifications.filter((n) => matchesFilter(n.type, filter));

  /* ─── render ─── */
  return (
    <div className="customer-page">
      <CustomerNav />
      <main className="customer-main">
        {/* Header */}
        <div className="alerts-header">
          <div className="alerts-header-left">
            <h1 className="customer-title">Alerts</h1>
            <p className="customer-description">
              Stay updated with your orders, services, and price approvals.
            </p>
          </div>
          <div className="alerts-header-right">
            {unreadCount > 0 && (
              <span className="alerts-unread-badge">{unreadCount} unread</span>
            )}
            {unreadCount > 0 && (
              <button
                className="alerts-btn alerts-btn-secondary"
                onClick={handleMarkAllRead}
              >
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Filter bar */}
        <div className="alerts-filters">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.value}
              className={`alerts-filter-chip ${filter === f.value ? "active" : ""}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="alerts-loading">
            <div className="alerts-spinner" />
            <p>Loading alerts...</p>
          </div>
        ) : error ? (
          <div className="alerts-error">
            <p>{error}</p>
            <button
              className="alerts-btn alerts-btn-primary"
              onClick={() => fetchNotifications(1)}
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="alerts-empty">
            <div className="alerts-empty-icon">🔔</div>
            <h3>No alerts yet</h3>
            <p>
              You'll see notifications here when there are updates to your
              orders and services.
            </p>
          </div>
        ) : (
          <>
            <div className="alerts-list">
              {filtered.map((notif) => {
                const meta = TYPE_META[notif.type] || TYPE_META.new_order;
                const isPriceAction =
                  notif.type === "price_finalized" &&
                  notif.priceApproval?.status === "pending";
                const isRejected =
                  (notif.type === "price_finalized" &&
                    notif.priceApproval?.status === "rejected") ||
                  notif.type === "price_rejected";
                const busy = actionLoading[notif._id];

                return (
                  <div
                    key={notif._id}
                    className={`alerts-card ${notif.read ? "" : "unread"}`}
                  >
                    {/* Left icon */}
                    <div
                      className="alerts-card-icon"
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      {meta.icon}
                    </div>

                    {/* Content */}
                    <div className="alerts-card-body">
                      <div className="alerts-card-top">
                        <span
                          className="alerts-type-badge"
                          style={{ background: meta.bg, color: meta.color }}
                        >
                          {meta.label}
                        </span>
                        <span className="alerts-time">
                          {timeAgo(notif.createdAt)}
                        </span>
                      </div>
                      <h4 className="alerts-card-title">{notif.title}</h4>
                      <p className="alerts-card-message">{notif.message}</p>

                      {/* Price approval actions */}
                      {isPriceAction && (
                        <div className="alerts-price-actions">
                          <div className="alerts-price-info">
                            <span className="alerts-price-label">
                              Proposed Price:
                            </span>
                            <span className="alerts-price-amount">
                              ₹{notif.priceApproval.proposedPrice}
                            </span>
                            {notif.priceApproval.previousPrice != null && (
                              <span className="alerts-price-prev">
                                (was ₹{notif.priceApproval.previousPrice})
                              </span>
                            )}
                          </div>
                          <div className="alerts-action-buttons">
                            <button
                              className="alerts-btn alerts-btn-success"
                              disabled={!!busy}
                              onClick={() => handleAcceptPrice(notif._id)}
                            >
                              {busy === "accepting"
                                ? "Accepting..."
                                : "Accept Price"}
                            </button>
                            <button
                              className="alerts-btn alerts-btn-danger"
                              disabled={!!busy}
                              onClick={() => handleRejectPrice(notif._id)}
                            >
                              {busy === "rejecting"
                                ? "Rejecting..."
                                : "Reject Price"}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Price already decided */}
                      {notif.type === "price_finalized" &&
                        notif.priceApproval?.status === "accepted" && (
                          <div className="alerts-price-decided accepted">
                            ✅ You accepted ₹{notif.priceApproval.proposedPrice}
                          </div>
                        )}
                      {notif.type === "price_finalized" &&
                        notif.priceApproval?.status === "rejected" && (
                          <div className="alerts-price-decided rejected">
                            ❌ You rejected ₹{notif.priceApproval.proposedPrice}
                          </div>
                        )}

                      {/* Cancel service option after rejection */}
                      {isRejected &&
                        notif.referenceModel === "ServiceBooking" && (
                          <div className="alerts-cancel-section">
                            <p className="alerts-cancel-hint">
                              You can cancel this service booking if you no
                              longer wish to proceed.
                            </p>
                            <button
                              className="alerts-btn alerts-btn-outline-danger"
                              disabled={!!busy}
                              onClick={() => handleCancelService(notif._id)}
                            >
                              {busy === "cancelling"
                                ? "Cancelling..."
                                : "Cancel Service Booking"}
                            </button>
                          </div>
                        )}

                      {/* Footer actions */}
                      <div className="alerts-card-footer">
                        {notif.referenceId && (
                          <button
                            className="alerts-btn alerts-btn-link"
                            onClick={() => goToReference(notif)}
                          >
                            View Details →
                          </button>
                        )}
                        {!notif.read && (
                          <button
                            className="alerts-btn alerts-btn-ghost"
                            onClick={() => handleMarkRead(notif._id)}
                          >
                            Mark as read
                          </button>
                        )}
                        <button
                          className="alerts-btn alerts-btn-ghost alerts-btn-delete"
                          onClick={() => handleDelete(notif._id)}
                          title="Delete notification"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* Unread dot */}
                    {!notif.read && <div className="alerts-unread-dot" />}
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="alerts-pagination">
                <button
                  className="alerts-btn alerts-btn-secondary"
                  disabled={page <= 1}
                  onClick={() => fetchNotifications(page - 1)}
                >
                  ← Previous
                </button>
                <span className="alerts-page-info">
                  Page {page} of {totalPages}
                </span>
                <button
                  className="alerts-btn alerts-btn-secondary"
                  disabled={page >= totalPages}
                  onClick={() => fetchNotifications(page + 1)}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </main>
      <CustomerFooter />
    </div>
  );
}
