import React, { useEffect, useMemo, useState } from "react";
import ManagerNav from "../../components/ManagerNav";
import "../../Css/manager.css";

function formatDate(d) {
  try {
    return new Date(d).toDateString();
  } catch {
    return "N/A";
  }
}

export default function Payments() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState([]);
  const [serviceOrders, setServiceOrders] = useState([]);
  const [active, setActive] = useState("orders"); // 'orders' | 'services'

  useEffect(() => {
    document.body.classList.add("manager-theme");
    return () => document.body.classList.remove("manager-theme");
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/manager/api/payments", {
          headers: { Accept: "application/json" },
        });
        if (res.status === 401 || res.status === 403) {
          window.location.href = "/login";
          return;
        }
        if (!res.ok) throw new Error("Failed to load payments");
        const j = await res.json();
        if (!cancelled) {
          setOrders(Array.isArray(j.orders) ? j.orders : []);
          setServiceOrders(
            Array.isArray(j.serviceOrders) ? j.serviceOrders : [],
          );
        }
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load payments");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const orderRows = useMemo(() => {
    return (orders || []).map((o) => {
      const sellerNames = [
        ...new Set((o.items || []).map((i) => i.seller?.name).filter(Boolean)),
      ].join(", ");
      const products = (o.items || []).map((i, idx) => (
        <div key={idx}>
          {i.name} (x{i.quantity})
        </div>
      ));
      const total = typeof o.totalAmount === "number" ? o.totalAmount : 0;
      const commission = total * 0.2;
      return (
        <tr key={o._id}>
          <td>{o._id}</td>
          <td>{o.userId?.name || "N/A"}</td>
          <td>{sellerNames}</td>
          <td>{products}</td>
          <td>₹{total.toFixed(2)}</td>
          <td>₹{commission.toFixed(2)}</td>
          <td>{formatDate(o.placedAt)}</td>
        </tr>
      );
    });
  }, [orders]);

  const serviceRows = useMemo(() => {
    return (serviceOrders || []).map((s) => {
      const total = typeof s.totalCost === "number" ? s.totalCost : NaN;
      const commission = isNaN(total) ? NaN : total * 0.2;
      return (
        <tr key={s._id}>
          <td>{s._id}</td>
          <td>{s.customerId?.name || "N/A"}</td>
          <td>{s.providerId?.name || "N/A"}</td>
          <td>
            {Array.isArray(s.selectedServices)
              ? s.selectedServices.join(", ")
              : ""}
          </td>
          <td>₹{isNaN(total) ? "N/A" : total.toFixed(2)}</td>
          <td>₹{isNaN(commission) ? "N/A" : commission.toFixed(2)}</td>
          <td>{formatDate(s.date)}</td>
        </tr>
      );
    });
  }, [serviceOrders]);

  return (
    <>
      <div className="navbar">
        <div className="logo">
          <h2>Manager's Panel</h2>
        </div>
        <ManagerNav />
      </div>

      <div className="main-content" style={{ marginTop: 20 }}>
        <h1>Payments Overview</h1>
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
            Service Orders
          </button>
        </div>

        {error && (
          <div
            style={{
              color: "var(--danger-color)",
              marginTop: 15,
              fontWeight: 600,
            }}
          >
            Error loading payments data.
          </div>
        )}
        {loading && (
          <div style={{ marginTop: 20 }}>Loading payments data...</div>
        )}

        {!loading && !error && (
          <>
            {active === "orders" ? (
              <div className="table-responsive">
                <table className="order-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Seller(s)</th>
                      <th>Products</th>
                      <th>Total Cost</th>
                      <th>Commission (20%)</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderRows.length ? (
                      orderRows
                    ) : (
                      <tr>
                        <td colSpan={7}>No orders found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="order-table">
                  <thead>
                    <tr>
                      <th>Booking ID</th>
                      <th>Customer</th>
                      <th>Provider</th>
                      <th>Services</th>
                      <th>Total Cost</th>
                      <th>Commission (20%)</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceRows.length ? (
                      serviceRows
                    ) : (
                      <tr>
                        <td colSpan={7}>No service bookings found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
