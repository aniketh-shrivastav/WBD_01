import React, { useEffect, useMemo, useState } from "react";
import ManagerNav from "../../components/ManagerNav";
import "../../Css/manager.css";

function StatusBadge({ type, status }) {
  // type: 'order' | 'booking'
  const isDanger =
    type === "order" ? status === "cancelled" : status === "Rejected";
  const isWarn = type === "order" && status === "partial";
  const label =
    type === "order"
      ? isDanger
        ? "Cancelled"
        : isWarn
          ? "Partial"
          : "Active"
      : isDanger
        ? "Rejected"
        : "Active";
  return (
    <span
      className={`badge ${
        isDanger ? "badge-danger" : isWarn ? "badge-warning" : "badge-success"
      }`}
    >
      {label}
    </span>
  );
}

export default function Orders() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [active, setActive] = useState("orders"); // 'orders' | 'services'

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

  const orderRows = useMemo(() => {
    const rows = [];
    orders.forEach((o) => {
      (o.items || []).forEach((it) => {
        const seller = it.seller || {};
        const user = o.userId || {};
        rows.push(
          <tr key={`${o._id}-${it._id || it.name}`}>
            <td>{o._id}</td>
            <td>
              {seller.name || ""} ({seller.email || ""})
            </td>
            <td>
              {user.name || ""} ({user.email || ""})
            </td>
            <td>
              <ul>
                <li>
                  <strong>{it.name || ""}</strong> (x{it.quantity || 0})
                </li>
              </ul>
            </td>
            <td>
              <StatusBadge
                type="order"
                status={o.computedStatus || o.orderStatus}
              />
            </td>
            <td>
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
            </td>
          </tr>,
        );
      });
    });
    return rows;
  }, [orders]);

  const bookingRows = useMemo(() => {
    return (bookings || []).map((b) => {
      const customer = b.customerId || {};
      const provider = b.providerId || {};
      return (
        <tr key={b._id}>
          <td>{b._id}</td>
          <td>
            {Array.isArray(b.selectedServices)
              ? b.selectedServices.join(", ")
              : ""}
          </td>
          <td>{b.description || ""}</td>
          <td>
            {customer.name || ""} ({customer.email || ""})
          </td>
          <td>
            {provider.name || ""} ({provider.email || ""})
          </td>
          <td>
            <StatusBadge type="booking" status={b.status} />
          </td>
          <td>
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
            Orders
          </button>
          <button
            className={`tab-button ${active === "services" ? "active" : ""}`}
            onClick={() => setActive("services")}
          >
            Services Booked
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
                      <th>Products</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>{orderRows}</tbody>
                </table>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="order-table">
                  <thead>
                    <tr>
                      <th>Service ID</th>
                      <th>Service Type</th>
                      <th>Description</th>
                      <th>Customer</th>
                      <th>Provider</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>{bookingRows}</tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
