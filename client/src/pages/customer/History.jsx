import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import CustomerNav from "../../components/CustomerNav";
import CustomerFooter from "../../components/CustomerFooter";
import { useNavigate } from "react-router-dom";
import { fetchCustomerHistory } from "../../store/customerSlice";
import "../../Css/customer.css";

const STALE_AFTER_MS = 1000 * 60 * 5; // 5 minutes

function useLink(href) {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, [href]);
}

const ORDER_STATUS_STYLES = {
  pending: {
    label: "Pending",
    color: "#b45309",
    background: "#fef3c7",
  },
  confirmed: {
    label: "Confirmed",
    color: "#1d4ed8",
    background: "#dbeafe",
  },
  shipped: {
    label: "Shipped",
    color: "#6d28d9",
    background: "#ede9fe",
  },
  delivered: {
    label: "Delivered",
    color: "#047857",
    background: "#d1fae5",
  },
  cancelled: {
    label: "Cancelled",
    color: "#b91c1c",
    background: "#fee2e2",
  },
  default: {
    label: "Processing",
    color: "#374151",
    background: "#e5e7eb",
  },
};

const SERVICE_STATUS_STYLES = {
  waiting: {
    label: "Waiting for Confirmation",
    color: "#b45309",
    background: "#fef3c7",
  },
  confirmed: {
    label: "Confirmed",
    color: "#1d4ed8",
    background: "#dbeafe",
  },
  delivered: {
    label: "Delivered",
    color: "#047857",
    background: "#d1fae5",
  },
  rejected: {
    label: "Rejected",
    color: "#b91c1c",
    background: "#fee2e2",
  },
  default: {
    label: "In Progress",
    color: "#374151",
    background: "#e5e7eb",
  },
};

const HISTORY_SEEN_SIGNATURES_KEY = "customerHistorySeenSignatures:v1";

function safeJsonParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function signatureForOrder(o) {
  const items = Array.isArray(o?.items) ? o.items : [];
  const orderHistory = Array.isArray(o?.orderStatusHistory)
    ? o.orderStatusHistory
    : [];
  return JSON.stringify({
    placedAt: o?.placedAt || null,
    orderStatus: o?.orderStatus || null,
    totalAmount: o?.totalAmount ?? null,
    // Include status history count and last change to detect updates
    historyCount: orderHistory.length,
    lastHistoryChange:
      orderHistory.length > 0
        ? orderHistory[orderHistory.length - 1]?.changedAt
        : null,
    items: items.map((i) => ({
      productId: i?.productId || null,
      name: i?.name || null,
      price: i?.price ?? null,
      quantity: i?.quantity ?? null,
      itemStatus: i?.itemStatus || null,
      itemHistoryCount: (i?.itemStatusHistory || []).length,
    })),
  });
}

function signatureForBooking(b) {
  const statusHistory = Array.isArray(b?.statusHistory) ? b.statusHistory : [];
  const costHistory = Array.isArray(b?.costHistory) ? b.costHistory : [];
  return JSON.stringify({
    createdAt: b?.createdAt || null,
    status: b?.status || null,
    totalCost: b?.totalCost ?? null,
    selectedServices: Array.isArray(b?.selectedServices)
      ? b.selectedServices
      : [],
    paintColor: b?.paintColor || null,
    // Include history counts and last changes to detect updates
    statusHistoryCount: statusHistory.length,
    lastStatusChange:
      statusHistory.length > 0
        ? statusHistory[statusHistory.length - 1]?.changedAt
        : null,
    costHistoryCount: costHistory.length,
    lastCostChange:
      costHistory.length > 0
        ? costHistory[costHistory.length - 1]?.changedAt
        : null,
  });
}

function renderStatusPill(style) {
  return (
    <span
      className="status-pill"
      style={{
        background: style.background,
        color: style.color,
        borderColor: style.color,
      }}
    >
      <span
        className="status-dot"
        style={{ background: style.color }}
        aria-hidden="true"
      />
      {style.label}
    </span>
  );
}

export default function CustomerHistory() {
  useLink("/styles/styles.css");
  const navigate = useNavigate();
  function handleLogout(e) {
    e.preventDefault();
    const next = encodeURIComponent(`${window.location.origin}/`);
    window.location.href = `${backendBase}/logout?next=${next}`;
  }

  // Compute backend base URL for downloads. In dev (5173) point to 3000; in prod use same-origin.

  const backendBase = useMemo(() => {
    try {
      const hinted = window.__API_BASE__ || process.env.REACT_APP_API_BASE;
      if (hinted) return hinted;
      const { protocol, hostname, port } = window.location;
      if (port === "5173") return `${protocol}//${hostname}:3000`;
      return ""; // same-origin
    } catch {
      return "";
    }
  }, []);

  const dispatch = useDispatch();
  const { history, status, error, lastFetched } = useSelector(
    (state) => state.customer,
  );
  const { upcomingOrders = [], pastOrders = [], bookings = [] } = history || {};
  const loading = status === "loading" || status === "idle";

  // Rating modal state
  const [showRating, setShowRating] = useState(false);
  const [ratingBookingId, setRatingBookingId] = useState("");
  const [ratingValue, setRatingValue] = useState("");
  const [ratingReview, setRatingReview] = useState("");
  const [ratingErrors, setRatingErrors] = useState({});

  // Highlighting state for newly added/updated orders/services
  const [highlightedIds, setHighlightedIds] = useState(() => ({
    orders: {},
    bookings: {},
  }));
  const [fadingIds, setFadingIds] = useState(() => ({
    orders: {},
    bookings: {},
  }));

  // Accordion state for the four history sections.
  const [openPanel, setOpenPanel] = useState("upcomingOrders");

  useEffect(() => {
    const isStale =
      !lastFetched ||
      Date.now() - lastFetched > STALE_AFTER_MS ||
      status === "idle";
    if (isStale && status !== "loading") {
      dispatch(fetchCustomerHistory());
    }
  }, [dispatch, status, lastFetched]);

  // Compute which cards are new/updated since last time user saw them.
  useEffect(() => {
    if (!history) return;

    const allOrders = [...(upcomingOrders || []), ...(pastOrders || [])];
    const allBookings = Array.isArray(bookings) ? bookings : [];

    const current = {
      orders: Object.fromEntries(
        allOrders.map((o) => [String(o._id), signatureForOrder(o)]),
      ),
      bookings: Object.fromEntries(
        allBookings.map((b) => [String(b._id), signatureForBooking(b)]),
      ),
    };

    const raw =
      typeof window !== "undefined"
        ? window.localStorage.getItem(HISTORY_SEEN_SIGNATURES_KEY)
        : null;
    const stored = raw ? safeJsonParse(raw, null) : null;
    const hasStored = stored && (stored.orders || stored.bookings);

    // First visit: initialize without highlighting everything.
    if (!hasStored) {
      try {
        if (typeof window !== "undefined")
          window.localStorage.setItem(
            HISTORY_SEEN_SIGNATURES_KEY,
            JSON.stringify(current),
          );
      } catch {}
      setHighlightedIds({ orders: {}, bookings: {} });
      return;
    }

    const prevOrders = stored.orders || {};
    const prevBookings = stored.bookings || {};

    const nextHighlights = { orders: {}, bookings: {} };
    for (const [id, sig] of Object.entries(current.orders)) {
      if (prevOrders[id] !== sig) nextHighlights.orders[id] = true;
    }
    for (const [id, sig] of Object.entries(current.bookings)) {
      if (prevBookings[id] !== sig) nextHighlights.bookings[id] = true;
    }
    setHighlightedIds(nextHighlights);
  }, [history, upcomingOrders, pastOrders, bookings]);

  function markSeen(kind, id, currentSignature) {
    const k = kind === "orders" ? "orders" : "bookings";
    const key = String(id);
    setHighlightedIds((prev) => {
      if (!prev?.[k]?.[key]) return prev;
      const next = { ...prev, [k]: { ...prev[k] } };
      delete next[k][key];
      return next;
    });
    setFadingIds((prev) => ({
      ...prev,
      [k]: { ...(prev?.[k] || {}), [key]: true },
    }));
    window.setTimeout(() => {
      setFadingIds((prev) => {
        const next = { ...prev, [k]: { ...(prev?.[k] || {}) } };
        delete next[k][key];
        return next;
      });
    }, 2500);

    try {
      const raw = window.localStorage.getItem(HISTORY_SEEN_SIGNATURES_KEY);
      const stored = raw
        ? safeJsonParse(raw, { orders: {}, bookings: {} })
        : { orders: {}, bookings: {} };
      stored[k] = stored[k] || {};
      stored[k][key] = currentSignature;
      window.localStorage.setItem(
        HISTORY_SEEN_SIGNATURES_KEY,
        JSON.stringify(stored),
      );
    } catch {}
  }

  function formatDate(d) {
    if (!d) return "";
    return new Date(d).toLocaleDateString();
  }

  function statusSpan(status) {
    const key = String(status || "").toLowerCase();
    const style = ORDER_STATUS_STYLES[key] || ORDER_STATUS_STYLES.default;
    return renderStatusPill(style);
  }

  function serviceStatusSpan(status, id) {
    const normalized = String(status || "").toLowerCase();
    const style =
      normalized === "open"
        ? SERVICE_STATUS_STYLES.waiting
        : normalized === "confirmed"
          ? SERVICE_STATUS_STYLES.confirmed
          : normalized === "ready"
            ? SERVICE_STATUS_STYLES.delivered
            : normalized === "rejected"
              ? SERVICE_STATUS_STYLES.rejected
              : SERVICE_STATUS_STYLES.default;

    return (
      <>
        {renderStatusPill(style)}
        {normalized === "open" && (
          <>
            <br />
            <button className="cancel-btn" onClick={() => cancelService(id)}>
              Cancel Service
            </button>
          </>
        )}
      </>
    );
  }

  function pastServiceStatusSpan(s) {
    const normalized = String(s.status || "").toLowerCase();
    const style =
      normalized === "ready"
        ? SERVICE_STATUS_STYLES.delivered
        : normalized === "rejected"
          ? SERVICE_STATUS_STYLES.rejected
          : SERVICE_STATUS_STYLES.default;
    return renderStatusPill(style);
  }

  async function cancelOrder(id) {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    try {
      const res = await fetch(`/customer/cancel-order/${id}`, {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        alert("Failed to cancel order");
        return;
      }
      // optionally read JSON; either way we refresh
      refresh();
    } catch (e) {
      alert("Error cancelling order");
    }
  }

  async function cancelService(id) {
    if (!window.confirm("Cancel this service request?")) return;
    try {
      const res = await fetch(`/customer/cancel-service/${id}`, {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        alert("Failed to cancel service");
        return;
      }
      refresh();
    } catch (e) {
      alert("Error cancelling service");
    }
  }

  function openRatingModal(id) {
    setRatingBookingId(id);
    setRatingValue("");
    setRatingReview("");
    setShowRating(true);
  }
  function closeRatingModal() {
    setShowRating(false);
  }

  function handleRateClick(service) {
    const normalizedStatus = String(service?.status || "").toLowerCase();
    if (normalizedStatus !== "ready") {
      alert("You can only rate services that are marked Ready for delivery.");
      return;
    }
    openRatingModal(service._id);
  }

  async function submitRating(e) {
    e.preventDefault();
    const errs = {};
    const numericRating = Number(ratingValue);
    if (
      !Number.isFinite(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      errs.rating = "Please enter a rating between 1 and 5.";
    }
    if (ratingReview.trim() && ratingReview.trim().length < 5) {
      errs.review = "Review must be at least 5 characters if provided.";
    }
    setRatingErrors(errs);
    if (Object.keys(errs).length > 0) return;
    try {
      const res = await fetch(`/customer/rate-service/${ratingBookingId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ rating: numericRating, review: ratingReview }),
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        alert("Failed to submit rating");
        return;
      }
      closeRatingModal();
      refresh();
    } catch (e) {
      alert("Error submitting rating");
    }
  }

  function refresh() {
    dispatch(fetchCustomerHistory());
  }

  const upcomingServices = useMemo(
    () => bookings.filter((b) => ["Open", "Confirmed"].includes(b.status)),
    [bookings],
  );
  const pastServices = useMemo(
    () => bookings.filter((b) => ["Ready", "Rejected"].includes(b.status)),
    [bookings],
  );

  const hasUpcomingOrderChanges = useMemo(
    () =>
      (upcomingOrders || []).some((o) => highlightedIds.orders[String(o?._id)]),
    [upcomingOrders, highlightedIds],
  );
  const hasPastOrderChanges = useMemo(
    () => (pastOrders || []).some((o) => highlightedIds.orders[String(o?._id)]),
    [pastOrders, highlightedIds],
  );
  const hasUpcomingServiceChanges = useMemo(
    () =>
      (upcomingServices || []).some(
        (s) => highlightedIds.bookings[String(s?._id)],
      ),
    [upcomingServices, highlightedIds],
  );
  const hasPastServiceChanges = useMemo(
    () =>
      (pastServices || []).some((s) => highlightedIds.bookings[String(s?._id)]),
    [pastServices, highlightedIds],
  );

  function togglePanel(key) {
    setOpenPanel((prev) => (prev === key ? "" : key));
  }

  return (
    <div className="customer-page">
      <CustomerNav />

      <main className="customer-main" style={{ maxWidth: "1200px" }}>
        <h1
          className="customer-title"
          style={{ textAlign: "center", marginBottom: "24px" }}
        >
          Order & Service History
        </h1>

        <section
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 24,
            alignItems: "center",
            padding: "16px 20px",
            background: "var(--customer-bg-card)",
            borderRadius: "var(--customer-radius)",
            boxShadow: "var(--customer-shadow-sm)",
          }}
        >
          <div
            style={{ color: "var(--customer-text-secondary)", fontSize: 14 }}
          >
            {lastFetched
              ? `Last updated ${new Date(lastFetched).toLocaleString()}`
              : "History loads automatically when you visit this page."}
            {loading && " • Refreshing..."}
          </div>
          <button
            type="button"
            className="customer-btn customer-btn-primary customer-btn-sm"
            disabled={loading}
            onClick={refresh}
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </section>

        <div className="history-accordion">
          <section
            className={`history-panel${openPanel === "upcomingOrders" ? " is-open" : ""}`}
          >
            <button
              type="button"
              className="history-panel-header"
              onClick={() => togglePanel("upcomingOrders")}
              aria-expanded={openPanel === "upcomingOrders"}
            >
              <span className="history-panel-title">Upcoming Orders</span>
              {hasUpcomingOrderChanges ? (
                <span
                  className="history-panel-dot"
                  aria-label="Updates available"
                  title="Updates available"
                />
              ) : null}
              <span className="history-panel-count">
                {upcomingOrders.length}
              </span>
              <span className="history-panel-chevron" aria-hidden="true">
                {openPanel === "upcomingOrders" ? "▴" : "▾"}
              </span>
            </button>
            <div
              className="history-panel-body"
              hidden={openPanel !== "upcomingOrders"}
            >
              <ul id="upcoming-orders" className="parts-list">
                {loading ? (
                  <p className="loading">Loading...</p>
                ) : error ? (
                  <p className="no-items">Failed to load. Refresh page.</p>
                ) : upcomingOrders.length === 0 ? (
                  <p className="no-items">No upcoming orders found.</p>
                ) : (
                  upcomingOrders.map((o) => (
                    <li
                      key={o._id}
                      className={`history-item${
                        highlightedIds.orders[String(o._id)]
                          ? " history-highlight"
                          : ""
                      }${
                        fadingIds.orders[String(o._id)]
                          ? " history-highlight-fade"
                          : ""
                      }`}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        const id = String(o._id);
                        if (highlightedIds.orders[id])
                          markSeen("orders", id, signatureForOrder(o));
                        navigate(`/customer/order/${o._id}`);
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" && e.key !== " ") return;
                        e.preventDefault();
                        const id = String(o._id);
                        if (highlightedIds.orders[id])
                          markSeen("orders", id, signatureForOrder(o));
                        navigate(`/customer/order/${o._id}`);
                      }}
                    >
                      <div className="item-details">
                        <h3>Order ID: {o._id}</h3>
                        <p>
                          <strong>Placed on:</strong> {formatDate(o.placedAt)}
                        </p>
                        <p>
                          <strong>Status:</strong> {statusSpan(o.orderStatus)}
                        </p>
                        <p>
                          <strong>Total Amount:</strong> ₹{o.totalAmount}
                        </p>
                        <p>
                          <strong>Items:</strong>
                        </p>
                        <ul>
                          {(o.items || []).map((i, idx) => (
                            <li
                              key={idx}
                              style={{
                                marginBottom: i.deliveryOtp ? "8px" : "0",
                              }}
                            >
                              {i.name} x {i.quantity} (₹{i.price})
                              {i.itemStatus &&
                                i.itemStatus !== o.orderStatus && (
                                  <> — {statusSpan(i.itemStatus)}</>
                                )}
                              {i.deliveryOtp &&
                                String(i.itemStatus || "").toLowerCase() ===
                                  "shipped" && (
                                  <div
                                    style={{
                                      marginTop: "4px",
                                      padding: "6px 12px",
                                      background: "#ede9fe",
                                      border: "1px dashed #6d28d9",
                                      borderRadius: "6px",
                                      display: "inline-block",
                                    }}
                                  >
                                    <strong
                                      style={{
                                        color: "#6d28d9",
                                        fontSize: "13px",
                                      }}
                                    >
                                      Delivery OTP:
                                    </strong>{" "}
                                    <span
                                      style={{
                                        fontWeight: 700,
                                        fontSize: "16px",
                                        letterSpacing: "3px",
                                        color: "#4c1d95",
                                      }}
                                    >
                                      {i.deliveryOtp}
                                    </span>
                                    <div
                                      style={{
                                        fontSize: "11px",
                                        color: "#6d28d9",
                                        marginTop: "2px",
                                      }}
                                    >
                                      Share this OTP with the seller to confirm
                                      delivery
                                    </div>
                                  </div>
                                )}
                            </li>
                          ))}
                        </ul>
                        <button
                          type="button"
                          className="download-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/customer/order/${o._id}`);
                          }}
                        >
                          View Details
                        </button>
                        {o.orderStatus === "pending" && (
                          <button
                            className="cancel-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelOrder(o._id);
                            }}
                          >
                            Cancel Order
                          </button>
                        )}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </section>

          <section
            className={`history-panel${openPanel === "pastOrders" ? " is-open" : ""}`}
          >
            <button
              type="button"
              className="history-panel-header"
              onClick={() => togglePanel("pastOrders")}
              aria-expanded={openPanel === "pastOrders"}
            >
              <span className="history-panel-title">Past Orders</span>
              {hasPastOrderChanges ? (
                <span
                  className="history-panel-dot"
                  aria-label="Updates available"
                  title="Updates available"
                />
              ) : null}
              <span className="history-panel-count">{pastOrders.length}</span>
              <span className="history-panel-chevron" aria-hidden="true">
                {openPanel === "pastOrders" ? "▴" : "▾"}
              </span>
            </button>
            <div
              className="history-panel-body"
              hidden={openPanel !== "pastOrders"}
            >
              <ul id="past-orders" className="parts-list">
                {loading ? (
                  <p className="loading">Loading...</p>
                ) : error ? (
                  <p className="no-items">Failed to load. Refresh page.</p>
                ) : pastOrders.length === 0 ? (
                  <p className="no-items">No past orders found.</p>
                ) : (
                  pastOrders.map((o) => (
                    <li
                      key={o._id}
                      className={`history-item${
                        highlightedIds.orders[String(o._id)]
                          ? " history-highlight"
                          : ""
                      }${
                        fadingIds.orders[String(o._id)]
                          ? " history-highlight-fade"
                          : ""
                      }`}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        const id = String(o._id);
                        if (highlightedIds.orders[id])
                          markSeen("orders", id, signatureForOrder(o));
                        navigate(`/customer/order/${o._id}`);
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" && e.key !== " ") return;
                        e.preventDefault();
                        const id = String(o._id);
                        if (highlightedIds.orders[id])
                          markSeen("orders", id, signatureForOrder(o));
                        navigate(`/customer/order/${o._id}`);
                      }}
                    >
                      <div className="item-details">
                        <h3>Order ID: {o._id}</h3>
                        <p>
                          <strong>Placed on:</strong> {formatDate(o.placedAt)}
                        </p>
                        <p>
                          <strong>Status:</strong> {statusSpan(o.orderStatus)}
                        </p>
                        <p>
                          <strong>Total Amount:</strong> ₹{o.totalAmount}
                        </p>
                        <p>
                          <strong>Items:</strong>
                        </p>
                        <ul>
                          {(o.items || []).map((i, idx) => (
                            <li key={idx}>
                              {i.name} x {i.quantity} (₹{i.price})
                              {i.itemStatus &&
                                i.itemStatus !== o.orderStatus && (
                                  <> — {statusSpan(i.itemStatus)}</>
                                )}
                            </li>
                          ))}
                        </ul>
                        <button
                          type="button"
                          className="download-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/customer/order/${o._id}`);
                          }}
                        >
                          View Details
                        </button>
                        {!String(o.orderStatus || "")
                          .toLowerCase()
                          .includes("cancel") && (
                          <a
                            href={`${backendBase}/customer/order-receipt/${o._id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="download-btn"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Download Receipt
                          </a>
                        )}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </section>

          <section
            className={`history-panel${openPanel === "upcomingServices" ? " is-open" : ""}`}
          >
            <button
              type="button"
              className="history-panel-header"
              onClick={() => togglePanel("upcomingServices")}
              aria-expanded={openPanel === "upcomingServices"}
            >
              <span className="history-panel-title">Upcoming Services</span>
              {hasUpcomingServiceChanges ? (
                <span
                  className="history-panel-dot"
                  aria-label="Updates available"
                  title="Updates available"
                />
              ) : null}
              <span className="history-panel-count">
                {upcomingServices.length}
              </span>
              <span className="history-panel-chevron" aria-hidden="true">
                {openPanel === "upcomingServices" ? "▴" : "▾"}
              </span>
            </button>
            <div
              className="history-panel-body"
              hidden={openPanel !== "upcomingServices"}
            >
              <ul id="upcoming-services" className="parts-list">
                {loading ? (
                  <p className="loading">Loading...</p>
                ) : error ? (
                  <p className="no-items">Failed to load. Refresh page.</p>
                ) : upcomingServices.length === 0 ? (
                  <p className="no-items">No upcoming services found.</p>
                ) : (
                  upcomingServices.map((s) => (
                    <li
                      key={s._id}
                      className={`history-item${
                        highlightedIds.bookings[String(s._id)]
                          ? " history-highlight"
                          : ""
                      }${
                        fadingIds.bookings[String(s._id)]
                          ? " history-highlight-fade"
                          : ""
                      }`}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        const id = String(s._id);
                        if (highlightedIds.bookings[id])
                          markSeen("bookings", id, signatureForBooking(s));
                        navigate(`/customer/service/${s._id}`);
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" && e.key !== " ") return;
                        e.preventDefault();
                        const id = String(s._id);
                        if (highlightedIds.bookings[id])
                          markSeen("bookings", id, signatureForBooking(s));
                        navigate(`/customer/service/${s._id}`);
                      }}
                    >
                      <div className="item-details">
                        <h3>{(s.selectedServices || []).join(", ")}</h3>
                        <p>
                          <strong>Service ID:</strong> {s._id}
                        </p>
                        <p>
                          <strong>Service Provider:</strong>{" "}
                          {s.providerId?.name || ""} |{" "}
                          {s.providerId?.phone || ""}
                        </p>
                        <p>
                          <strong>Booked on:</strong> {formatDate(s.createdAt)}
                        </p>
                        <p>
                          <strong>Car Model:</strong> {s.carModel || ""}
                        </p>
                        <p>
                          <strong>Description:</strong> {s.description || ""}
                        </p>
                        <p>
                          <strong>Cost:</strong> ₹{s.totalCost || 0}
                        </p>
                        <p>
                          <strong>Status:</strong>{" "}
                          {serviceStatusSpan(s.status, s._id)}
                        </p>
                        <button
                          type="button"
                          className="download-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/customer/service/${s._id}`);
                          }}
                        >
                          View Details
                        </button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </section>

          <section
            className={`history-panel${openPanel === "pastServices" ? " is-open" : ""}`}
          >
            <button
              type="button"
              className="history-panel-header"
              onClick={() => togglePanel("pastServices")}
              aria-expanded={openPanel === "pastServices"}
            >
              <span className="history-panel-title">Past Services</span>
              {hasPastServiceChanges ? (
                <span
                  className="history-panel-dot"
                  aria-label="Updates available"
                  title="Updates available"
                />
              ) : null}
              <span className="history-panel-count">{pastServices.length}</span>
              <span className="history-panel-chevron" aria-hidden="true">
                {openPanel === "pastServices" ? "▴" : "▾"}
              </span>
            </button>
            <div
              className="history-panel-body"
              hidden={openPanel !== "pastServices"}
            >
              <ul id="past-services" className="parts-list">
                {loading ? (
                  <p className="loading">Loading...</p>
                ) : error ? (
                  <p className="no-items">Failed to load. Refresh page.</p>
                ) : pastServices.length === 0 ? (
                  <p className="no-items">No past services found.</p>
                ) : (
                  pastServices.map((s) => {
                    const normalizedStatus = String(
                      s.status || "",
                    ).toLowerCase();
                    const showRateButton =
                      !s.rating && normalizedStatus === "ready";
                    const hasRating = Boolean(s.rating);
                    return (
                      <li
                        key={s._id}
                        className={`history-item${
                          highlightedIds.bookings[String(s._id)]
                            ? " history-highlight"
                            : ""
                        }${
                          fadingIds.bookings[String(s._id)]
                            ? " history-highlight-fade"
                            : ""
                        }`}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          const id = String(s._id);
                          if (highlightedIds.bookings[id])
                            markSeen("bookings", id, signatureForBooking(s));
                          navigate(`/customer/service/${s._id}`);
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" && e.key !== " ") return;
                          e.preventDefault();
                          const id = String(s._id);
                          if (highlightedIds.bookings[id])
                            markSeen("bookings", id, signatureForBooking(s));
                          navigate(`/customer/service/${s._id}`);
                        }}
                      >
                        <div className="item-details">
                          <h3>{(s.selectedServices || []).join(", ")}</h3>
                          <p>
                            <strong>Service ID:</strong> {s._id}
                          </p>
                          <p>
                            <strong>Service Provider:</strong>{" "}
                            {s.providerId?.name || ""} |{" "}
                            {s.providerId?.phone || ""}
                          </p>
                          <p>
                            <strong>Booked on:</strong>{" "}
                            {formatDate(s.createdAt)}
                          </p>
                          <p>
                            <strong>Car Model:</strong> {s.carModel || ""}
                          </p>
                          <p>
                            <strong>Description:</strong> {s.description || ""}
                          </p>
                          <p>
                            <strong>Cost:</strong> ₹{s.totalCost || 0}
                          </p>
                          <p>
                            <strong>Status:</strong> {pastServiceStatusSpan(s)}
                          </p>
                          <button
                            type="button"
                            className="download-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/customer/service/${s._id}`);
                            }}
                          >
                            View Details
                          </button>
                          {showRateButton ? (
                            <button
                              className="rate-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRateClick(s);
                              }}
                            >
                              Rate
                            </button>
                          ) : null}
                          {hasRating ? (
                            <>
                              <p>
                                <strong>Your Rating:</strong> {s.rating}/5
                              </p>
                              {s.review ? (
                                <p>
                                  <strong>Comment:</strong> {s.review}
                                </p>
                              ) : null}
                            </>
                          ) : null}
                          {s.status === "Ready" && (
                            <a
                              href={`${backendBase}/customer/service-receipt/${s._id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="download-btn"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Download Receipt
                            </a>
                          )}
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </section>
        </div>
      </main>

      <CustomerFooter />

      {/* Inline styles to match legacy */}
      <style>{`
        .history-accordion { display:flex; flex-direction:column; gap:14px; }
        .history-panel { width:100%; border:1px solid rgba(17, 24, 39, 0.12); border-radius:12px; overflow:hidden; background:#fff; box-shadow:0 8px 24px rgba(17, 24, 39, 0.06); }
        .history-panel-header { position:relative; width:100%; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:16px 18px; background:linear-gradient(180deg, rgba(249,250,251,1) 0%, rgba(255,255,255,1) 100%); border:none; cursor:pointer; text-align:left; }
        .history-panel-header:hover { background:linear-gradient(180deg, rgba(243,244,246,1) 0%, rgba(255,255,255,1) 100%); }
        .history-panel-title { font-size:18px; font-weight:800; color: var(--text-dark); }
        .history-panel-count { margin-left:auto; padding:4px 10px; border-radius:999px; font-weight:800; font-size:12px; color:#111827; background:rgba(17,24,39,0.08); }
        .history-panel-chevron { font-size:18px; color:#111827; opacity:0.75; }
        .history-panel-body { padding:14px 18px 18px; }
        .history-panel.is-open { border-color: rgba(17, 24, 39, 0.22); box-shadow:0 10px 28px rgba(17, 24, 39, 0.10); }
        .history-panel-dot { position:absolute; top:10px; right:12px; width:10px; height:10px; border-radius:50%; background:#ef4444; box-shadow:0 0 0 3px rgba(239, 68, 68, 0.18); }

        .history-item { display:flex; justify-content:space-between; align-items:flex-start; padding:20px; margin-bottom:15px; transition: var(--transition); }
        .item-details { flex:1; }
        .item-details h3 { font-size:18px; margin-bottom:8px; color: var(--text-dark); }
        .item-details p { color:#666; font-size:14px; }
        .rate-btn, .cancel-btn, .download-btn { background: var(--primary-color); color:#fff; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:600; margin-top:6px; display:inline-block; text-decoration:none; }
        .rate-btn { background: var(--warning-color); }
        .download-btn { background: var(--warning-color); color:#fff; text-decoration:none; line-height:1.2; }
        .download-btn:hover { filter:brightness(0.95); text-decoration:none; }
        .cancel-btn { background:#c0392b; }
        .status-pill { display:inline-flex; align-items:center; gap:8px; font-weight:600; padding:4px 12px; border-radius:999px; border:1px solid transparent; font-size:13px; letter-spacing:0.01em; text-transform:capitalize; }
        .status-dot { width:8px; height:8px; border-radius:50%; display:inline-block; }
        .rate-btn:hover, .cancel-btn:hover, .download-btn:hover { opacity:0.9; }
        .no-items { text-align:center; color:#888; padding:20px; font-style:italic; }
        .modal { position:fixed; z-index:999; left:0; top:0; width:100%; height:100%; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; }
        .modal-content { background:#fff; padding:20px; border-radius:8px; width:400px; box-shadow:0 0 10px #000; }
        .close { float:right; font-size:24px; cursor:pointer; }
        @media screen and (max-width: 768px) { .history-item { flex-direction:column; text-align:center; } .item-details { margin-bottom:15px; } }

        .history-highlight { position:relative; background:linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border:2px solid #f59e0b; box-shadow:0 0 0 4px rgba(245, 158, 11, 0.15); border-radius: var(--customer-radius, 12px); }
        .history-highlight::after {
          content:"NEW / UPDATED";
          position:absolute;
          top:10px;
          right:12px;
          font-size:11px;
          font-weight:800;
          letter-spacing:0.03em;
          color:#7c2d12;
          background:#fffbeb;
          border:1px solid #f59e0b;
          padding:4px 8px;
          border-radius:999px;
        }
        .history-highlight-fade { animation: historyFadeOut 2.5s ease forwards; }
        @keyframes historyFadeOut {
          0% { background:linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); }
          100% { background:transparent; }
        }
      `}</style>

      {/* Rating Modal */}
      {showRating && (
        <div className="customer-modal-overlay" onClick={closeRatingModal}>
          <div className="customer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="customer-modal-header">
              <h3 className="customer-modal-title">⭐ Rate This Service</h3>
              <button
                className="customer-modal-close"
                onClick={closeRatingModal}
              >
                ×
              </button>
            </div>
            <form onSubmit={submitRating}>
              <div className="customer-modal-body">
                <input type="hidden" name="bookingId" value={ratingBookingId} />
                <div className="customer-form-group">
                  <label className="customer-label" htmlFor="rating">
                    Rating (1 to 5)
                  </label>
                  <input
                    type="number"
                    name="rating"
                    id="rating"
                    min={1}
                    max={5}
                    required
                    value={ratingValue}
                    onChange={(e) => {
                      setRatingValue(e.target.value);
                      setRatingErrors((p) => ({ ...p, rating: undefined }));
                    }}
                    className={`customer-input ${ratingErrors.rating ? "customer-input-error" : ""}`}
                    style={{ maxWidth: "120px" }}
                  />
                  {ratingErrors.rating && (
                    <div className="customer-error-text">
                      {ratingErrors.rating}
                    </div>
                  )}
                </div>
                <div className="customer-form-group">
                  <label className="customer-label" htmlFor="review">
                    Comment (optional)
                  </label>
                  <textarea
                    name="review"
                    id="review"
                    rows={4}
                    value={ratingReview}
                    onChange={(e) => {
                      setRatingReview(e.target.value);
                      setRatingErrors((p) => ({ ...p, review: undefined }));
                    }}
                    className={`customer-input ${ratingErrors.review ? "customer-input-error" : ""}`}
                    placeholder="Share your experience..."
                  />
                  {ratingErrors.review && (
                    <div className="customer-error-text">
                      {ratingErrors.review}
                    </div>
                  )}
                </div>
              </div>
              <div className="customer-modal-footer">
                <button
                  type="button"
                  className="customer-btn customer-btn-secondary"
                  onClick={closeRatingModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="customer-btn customer-btn-success"
                >
                  Submit Rating
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
