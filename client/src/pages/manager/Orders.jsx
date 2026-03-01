import React, { useEffect, useMemo, useState } from "react";
import ManagerNav from "../../components/ManagerNav";
import "../../Css/manager.css";

const COMMISSION_RATE = 0.2; // 20% manager commission

function formatCurrency(v) {
  return "₹" + Number(v || 0).toFixed(2);
}

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ type, status }) {
  // type: 'order' | 'booking'
  const getStatusInfo = () => {
    if (type === "order") {
      switch (status) {
        case "cancelled":
          return { label: "Cancelled", className: "badge-danger" };
        case "delivered":
          return { label: "Delivered", className: "badge-success" };
        case "shipped":
          return { label: "Shipped", className: "badge-info" };
        case "confirmed":
          return { label: "Confirmed", className: "badge-primary" };
        case "pending":
          return { label: "Pending", className: "badge-warning" };
        case "partial":
          return { label: "Partial", className: "badge-warning" };
        default:
          return { label: status || "Unknown", className: "badge-secondary" };
      }
    } else {
      // booking/service
      switch (status) {
        case "Rejected":
          return { label: "Rejected", className: "badge-danger" };
        case "Ready":
        case "Completed":
          return { label: status, className: "badge-success" };
        case "Confirmed":
          return { label: "Confirmed", className: "badge-primary" };
        case "Open":
          return { label: "Open", className: "badge-warning" };
        default:
          return { label: status || "Unknown", className: "badge-secondary" };
      }
    }
  };

  const { label, className } = getStatusInfo();
  return <span className={`badge ${className}`}>{label}</span>;
}

// Modal Component for displaying details
function DetailsModal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
      <style>{`
        .modal-overlay {
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
        }
        .modal-content {
          background: #fff;
          border-radius: 12px;
          max-width: 800px;
          width: 90%;
          max-height: 85vh;
          overflow-y: auto;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
          border-radius: 12px 12px 0 0;
        }
        .modal-header h2 {
          margin: 0;
          font-size: 1.25rem;
          color: #111827;
        }
        .modal-close {
          background: none;
          border: none;
          font-size: 1.75rem;
          cursor: pointer;
          color: #6b7280;
          line-height: 1;
          padding: 0;
        }
        .modal-close:hover {
          color: #111827;
        }
        .modal-body {
          padding: 24px;
        }
        .detail-section {
          margin-bottom: 24px;
        }
        .detail-section:last-child {
          margin-bottom: 0;
        }
        .detail-section h3 {
          font-size: 1rem;
          color: #374151;
          margin: 0 0 12px 0;
          padding-bottom: 8px;
          border-bottom: 2px solid #e5e7eb;
        }
        .detail-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }
        .detail-item {
          background: #f9fafb;
          padding: 12px;
          border-radius: 8px;
        }
        .detail-item label {
          display: block;
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .detail-item span {
          font-size: 0.95rem;
          color: #111827;
          font-weight: 500;
        }
        .earnings-breakdown {
          background: linear-gradient(135deg, #f0fdf4, #dcfce7);
          padding: 16px;
          border-radius: 12px;
          border: 1px solid #86efac;
        }
        .earnings-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(134, 239, 172, 0.5);
        }
        .earnings-row:last-child {
          border-bottom: none;
          font-weight: 600;
          font-size: 1.1rem;
        }
        .earnings-row.manager {
          color: #059669;
        }
        .status-history {
          max-height: 200px;
          overflow-y: auto;
        }
        .history-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .history-item:last-child {
          border-bottom: none;
        }
        .history-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #4299e1;
          flex-shrink: 0;
        }
        .history-content {
          flex: 1;
        }
        .history-change {
          font-weight: 500;
          color: #111827;
        }
        .history-time {
          font-size: 0.8rem;
          color: #6b7280;
        }
        .items-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .item-card {
          background: #f9fafb;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }
        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .item-name {
          font-weight: 600;
          color: #111827;
        }
        .item-details {
          font-size: 0.85rem;
          color: #6b7280;
        }
        .badge-info { background-color: #3b82f6; color: white; }
        .badge-primary { background-color: #6366f1; color: white; }
        .badge-secondary { background-color: #9ca3af; color: white; }
      `}</style>
    </div>
  );
}

export default function Orders() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [active, setActive] = useState("orders"); // 'orders' | 'services'

  // Modal state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    document.body.classList.add("manager-theme");
    return () => document.body.classList.remove("manager-theme");
  }, []);

  async function load() {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/manager/api/orders", {
        headers: { Accept: "application/json" },
      });
      if (res.status === 401 || res.status === 403) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) throw new Error("Failed to load orders");
      const j = await res.json();
      setOrders(Array.isArray(j.orders) ? j.orders : []);
      setBookings(Array.isArray(j.bookings) ? j.bookings : []);
    } catch (e) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function performAction(kind, action, id) {
    // kind: 'order' | 'booking'; action: 'cancel' | 'restore'
    const confirmMsg =
      action === "cancel" ? `Cancel this ${kind}?` : `Restore this ${kind}?`;
    if (!window.confirm(confirmMsg)) return;
    const endpoint =
      kind === "order"
        ? `/manager/${
            action === "cancel" ? "cancel-order" : "restore-order"
          }/${id}`
        : `/manager/${
            action === "cancel" ? "cancel-booking" : "restore-booking"
          }/${id}`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Accept: "application/json" },
    });
    if (res.status === 401 || res.status === 403) {
      window.location.href = "/login";
      return;
    }
    const j = await res.json().catch(() => ({ success: res.ok }));
    if (!res.ok || (j && j.success === false)) {
      alert((j && j.message) || "Action failed");
      return;
    }
    // re-fetch for accuracy
    await load();
  }

  // Calculate earnings for an order
  function calculateOrderEarnings(order) {
    const totalAmount = order.totalAmount || 0;
    const managerCommission = totalAmount * COMMISSION_RATE;
    const sellerEarnings = totalAmount - managerCommission;
    return {
      total: totalAmount,
      managerCommission,
      sellerEarnings,
    };
  }

  // Calculate earnings for a booking
  function calculateBookingEarnings(booking) {
    const totalCost = booking.totalCost || 0;
    const managerCommission = totalCost * COMMISSION_RATE;
    const providerEarnings = totalCost - managerCommission;
    return {
      total: totalCost,
      managerCommission,
      providerEarnings,
    };
  }

  // View order details
  function handleViewOrderDetails(order) {
    setSelectedOrder(order);
  }

  // View booking details
  function handleViewBookingDetails(booking) {
    setSelectedBooking(booking);
  }

  // Render Order Details Modal Content
  function renderOrderDetails() {
    if (!selectedOrder) return null;
    const order = selectedOrder;
    const earnings = calculateOrderEarnings(order);
    const user = order.userId || {};

    return (
      <>
        <div className="detail-section">
          <h3>Order Information</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Order ID</label>
              <span>{order._id}</span>
            </div>
            <div className="detail-item">
              <label>Order Status</label>
              <span>
                <StatusBadge
                  type="order"
                  status={order.computedStatus || order.orderStatus}
                />
              </span>
            </div>
            <div className="detail-item">
              <label>Payment Status</label>
              <span style={{ textTransform: "capitalize" }}>
                {order.paymentStatus || "N/A"}
              </span>
            </div>
            <div className="detail-item">
              <label>Placed At</label>
              <span>{formatDate(order.placedAt)}</span>
            </div>
            <div className="detail-item">
              <label>Previous Status</label>
              <span style={{ textTransform: "capitalize" }}>
                {order.previousStatus || "N/A"}
              </span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Customer Details</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Name</label>
              <span>{user.name || "N/A"}</span>
            </div>
            <div className="detail-item">
              <label>Email</label>
              <span>{user.email || "N/A"}</span>
            </div>
            <div className="detail-item">
              <label>Delivery Address</label>
              <span>{order.deliveryAddress || "N/A"}</span>
            </div>
            <div className="detail-item">
              <label>District</label>
              <span>{order.district || "N/A"}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Order Items ({(order.items || []).length})</h3>
          <div className="items-list">
            {(order.items || []).map((item, idx) => (
              <div className="item-card" key={idx}>
                <div className="item-header">
                  <span className="item-name">
                    {item.name || "Unknown Item"}
                  </span>
                  <StatusBadge
                    type="order"
                    status={item.itemStatus || order.orderStatus}
                  />
                </div>
                <div className="item-details">
                  <p>
                    <strong>Quantity:</strong> {item.quantity || 0}
                  </p>
                  <p>
                    <strong>Price:</strong> {formatCurrency(item.price)}
                  </p>
                  <p>
                    <strong>Subtotal:</strong>{" "}
                    {formatCurrency((item.price || 0) * (item.quantity || 0))}
                  </p>
                  <p>
                    <strong>Seller:</strong> {item.seller?.name || "N/A"} (
                    {item.seller?.email || "N/A"})
                  </p>
                  {item.deliveryDate && (
                    <p>
                      <strong>Expected Delivery:</strong>{" "}
                      {formatDate(item.deliveryDate)}
                    </p>
                  )}
                </div>
                {item.itemStatusHistory &&
                  item.itemStatusHistory.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <strong>Item Status History:</strong>
                      <div className="status-history" style={{ marginTop: 8 }}>
                        {item.itemStatusHistory.map((h, hIdx) => (
                          <div className="history-item" key={hIdx}>
                            <div className="history-dot"></div>
                            <div className="history-content">
                              <div className="history-change">
                                {h.from || "N/A"} → {h.to || "N/A"}
                              </div>
                              <div className="history-time">
                                {formatDate(h.changedAt)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            ))}
          </div>
        </div>

        <div className="detail-section">
          <h3>Earnings Breakdown</h3>
          <div className="earnings-breakdown">
            <div className="earnings-row">
              <span>Order Total</span>
              <span>{formatCurrency(earnings.total)}</span>
            </div>
            <div className="earnings-row manager">
              <span>Manager Commission (20%)</span>
              <span>{formatCurrency(earnings.managerCommission)}</span>
            </div>
            <div className="earnings-row">
              <span>Seller Earnings</span>
              <span>{formatCurrency(earnings.sellerEarnings)}</span>
            </div>
          </div>
        </div>

        {order.orderStatusHistory && order.orderStatusHistory.length > 0 && (
          <div className="detail-section">
            <h3>Order Status History</h3>
            <div className="status-history">
              {order.orderStatusHistory.map((h, idx) => (
                <div className="history-item" key={idx}>
                  <div className="history-dot"></div>
                  <div className="history-content">
                    <div className="history-change">
                      {h.from || "N/A"} → {h.to || "N/A"}
                    </div>
                    <div className="history-time">
                      {formatDate(h.changedAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  }

  // Render Booking Details Modal Content
  function renderBookingDetails() {
    if (!selectedBooking) return null;
    const booking = selectedBooking;
    const earnings = calculateBookingEarnings(booking);
    const customer = booking.customerId || {};
    const provider = booking.providerId || {};

    return (
      <>
        <div className="detail-section">
          <h3>Booking Information</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Booking ID</label>
              <span>{booking._id}</span>
            </div>
            <div className="detail-item">
              <label>Status</label>
              <span>
                <StatusBadge type="booking" status={booking.status} />
              </span>
            </div>
            <div className="detail-item">
              <label>Previous Status</label>
              <span>{booking.previousStatus || "N/A"}</span>
            </div>
            <div className="detail-item">
              <label>Created At</label>
              <span>{formatDate(booking.createdAt)}</span>
            </div>
            <div className="detail-item">
              <label>Scheduled Date</label>
              <span>{formatDate(booking.date)}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Service Details</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Services</label>
              <span>
                {Array.isArray(booking.selectedServices)
                  ? booking.selectedServices.join(", ")
                  : "N/A"}
              </span>
            </div>
            <div className="detail-item">
              <label>Description</label>
              <span>{booking.description || "N/A"}</span>
            </div>
            <div className="detail-item">
              <label>Vehicle</label>
              <span>
                {[
                  booking.vehicleMake,
                  booking.vehicleModel,
                  booking.vehicleVariant,
                ]
                  .filter(Boolean)
                  .join(" ") ||
                  booking.carModel ||
                  "N/A"}
              </span>
            </div>
            <div className="detail-item">
              <label>Car Year</label>
              <span>{booking.carYear || "N/A"}</span>
            </div>
            {booking.paintColor && (
              <div className="detail-item">
                <label>Paint Color</label>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      backgroundColor: booking.paintColor,
                      border: "1px solid #ccc",
                    }}
                  ></span>
                  {booking.paintColor}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="detail-section">
          <h3>Customer Details</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Name</label>
              <span>{customer.name || "N/A"}</span>
            </div>
            <div className="detail-item">
              <label>Email</label>
              <span>{customer.email || "N/A"}</span>
            </div>
            <div className="detail-item">
              <label>Phone</label>
              <span>{booking.phone || "N/A"}</span>
            </div>
            <div className="detail-item">
              <label>Address</label>
              <span>{booking.address || "N/A"}</span>
            </div>
            <div className="detail-item">
              <label>District</label>
              <span>{booking.district || "N/A"}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Service Provider Details</h3>
          <div className="detail-grid">
            <div className="detail-item">
              <label>Name</label>
              <span>{provider.workshopName || provider.name || "N/A"}</span>
            </div>
            <div className="detail-item">
              <label>Email</label>
              <span>{provider.email || "N/A"}</span>
            </div>
            <div className="detail-item">
              <label>Phone</label>
              <span>{provider.phone || "N/A"}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h3>Earnings Breakdown</h3>
          <div className="earnings-breakdown">
            <div className="earnings-row">
              <span>Total Cost</span>
              <span>{formatCurrency(earnings.total)}</span>
            </div>
            <div className="earnings-row manager">
              <span>Manager Commission (20%)</span>
              <span>{formatCurrency(earnings.managerCommission)}</span>
            </div>
            <div className="earnings-row">
              <span>Provider Earnings</span>
              <span>{formatCurrency(earnings.providerEarnings)}</span>
            </div>
          </div>
        </div>

        {booking.rating && (
          <div className="detail-section">
            <h3>Customer Review</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <label>Rating</label>
                <span>
                  {"★".repeat(booking.rating)}
                  {"☆".repeat(5 - booking.rating)} ({booking.rating}/5)
                </span>
              </div>
              {booking.review && (
                <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
                  <label>Review</label>
                  <span>{booking.review}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {booking.statusHistory && booking.statusHistory.length > 0 && (
          <div className="detail-section">
            <h3>Status History</h3>
            <div className="status-history">
              {booking.statusHistory.map((h, idx) => (
                <div className="history-item" key={idx}>
                  <div className="history-dot"></div>
                  <div className="history-content">
                    <div className="history-change">
                      {h.from || "N/A"} → {h.to || "N/A"}
                    </div>
                    <div className="history-time">
                      {formatDate(h.changedAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  }

  const orderRows = useMemo(() => {
    const rows = [];
    orders.forEach((o) => {
      const user = o.userId || {};
      const earnings = calculateOrderEarnings(o);
      const itemCount = (o.items || []).length;
      const firstSeller = (o.items || [])[0]?.seller || {};

      rows.push(
        <tr key={o._id}>
          <td>
            <div style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
              {o._id.slice(-8)}...
            </div>
          </td>
          <td>
            <div>{firstSeller.name || "N/A"}</div>
            <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
              {itemCount > 1
                ? `+${itemCount - 1} more sellers`
                : firstSeller.email || ""}
            </div>
          </td>
          <td>
            <div>{user.name || "N/A"}</div>
            <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
              {user.email || ""}
            </div>
          </td>
          <td>
            <div>
              {itemCount} item{itemCount !== 1 ? "s" : ""}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
              {formatCurrency(o.totalAmount)}
            </div>
          </td>
          <td>
            <StatusBadge
              type="order"
              status={o.computedStatus || o.orderStatus}
            />
            <div
              style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: 4 }}
            >
              {o.orderStatus}
            </div>
          </td>
          <td style={{ fontSize: "0.8rem", color: "#6b7280" }}>
            {formatDate(o.placedAt)}
          </td>
          <td>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="btn btn-view"
                onClick={() => handleViewOrderDetails(o)}
                style={{
                  background: "#3b82f6",
                  color: "white",
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                View Details
              </button>
              {(o.computedStatus || o.orderStatus) === "cancelled" ? (
                <button className="btn btn-suspend" disabled>
                  Cancelled
                </button>
              ) : (
                <button
                  className="btn btn-suspend"
                  onClick={() => performAction("order", "cancel", o._id)}
                >
                  Cancel
                </button>
              )}
            </div>
          </td>
        </tr>,
      );
    });
    return rows;
  }, [orders]);

  const bookingRows = useMemo(() => {
    return (bookings || []).map((b) => {
      const customer = b.customerId || {};
      const provider = b.providerId || {};
      const earnings = calculateBookingEarnings(b);
      return (
        <tr key={b._id}>
          <td>
            <div style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
              {b._id.slice(-8)}...
            </div>
          </td>
          <td>
            {Array.isArray(b.selectedServices)
              ? b.selectedServices.slice(0, 2).join(", ") +
                (b.selectedServices.length > 2
                  ? ` +${b.selectedServices.length - 2} more`
                  : "")
              : ""}
          </td>
          <td>
            <div>{customer.name || "N/A"}</div>
            <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
              {customer.email || ""}
            </div>
          </td>
          <td>
            <div>{provider.workshopName || provider.name || "N/A"}</div>
            <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
              {provider.email || ""}
            </div>
          </td>
          <td>
            <StatusBadge type="booking" status={b.status} />
            <div
              style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: 4 }}
            >
              {b.status}
            </div>
          </td>
          <td style={{ fontSize: "0.8rem", color: "#6b7280" }}>
            {formatDate(b.createdAt)}
          </td>
          <td>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="btn btn-view"
                onClick={() => handleViewBookingDetails(b)}
                style={{
                  background: "#3b82f6",
                  color: "white",
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                View Details
              </button>
              {b.status === "Rejected" ? (
                <button
                  className="btn btn-restore"
                  onClick={() => performAction("booking", "restore", b._id)}
                >
                  Restore
                </button>
              ) : (
                <button
                  className="btn btn-suspend"
                  onClick={() => performAction("booking", "cancel", b._id)}
                >
                  Cancel
                </button>
              )}
            </div>
          </td>
        </tr>
      );
    });
  }, [bookings]);

  return (
    <>
      <div className="navbar">
        <div className="logo">
          <h2>Manager's Panel</h2>
        </div>
        <ManagerNav />
      </div>

      <div className="main-content">
        <h1>Order &amp; Booking Oversight</h1>
        <div className="tab-bar">
          <button
            className={`tab-button ${active === "orders" ? "active" : ""}`}
            onClick={() => setActive("orders")}
          >
            Orders ({orders.length})
          </button>
          <button
            className={`tab-button ${active === "services" ? "active" : ""}`}
            onClick={() => setActive("services")}
          >
            Services Booked ({bookings.length})
          </button>
        </div>

        {error && (
          <div
            id="error"
            style={{ color: "#b91c1c", fontWeight: 600, margin: "1rem 0" }}
          >
            {error}
          </div>
        )}
        {loading && (
          <div id="loading" style={{ marginTop: "1rem" }}>
            Loading data...
          </div>
        )}

        {!loading && !error && (
          <>
            {active === "orders" ? (
              <div className="table-responsive">
                <table className="order-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Seller</th>
                      <th>Customer</th>
                      <th>Items</th>
                      <th>Status</th>
                      <th>Placed At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>{orderRows}</tbody>
                </table>
                {orders.length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "2rem",
                      color: "#6b7280",
                    }}
                  >
                    No orders found.
                  </div>
                )}
              </div>
            ) : (
              <div className="table-responsive">
                <table className="order-table">
                  <thead>
                    <tr>
                      <th>Service ID</th>
                      <th>Service Type</th>
                      <th>Customer</th>
                      <th>Provider</th>
                      <th>Status</th>
                      <th>Created At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>{bookingRows}</tbody>
                </table>
                {bookings.length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "2rem",
                      color: "#6b7280",
                    }}
                  >
                    No service bookings found.
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Order Details Modal */}
      <DetailsModal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title="Order Details"
      >
        {renderOrderDetails()}
      </DetailsModal>

      {/* Booking Details Modal */}
      <DetailsModal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title="Service Booking Details"
      >
        {renderBookingDetails()}
      </DetailsModal>
    </>
  );
}
