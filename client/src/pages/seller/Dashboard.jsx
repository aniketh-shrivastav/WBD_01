import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import Chart from "chart.js/auto";
import "../../Css/sellerDashboard.css";
import { fetchSellerDashboard } from "../../store/sellerSlice";

const STALE_AFTER_MS = 1000 * 60 * 5;

export default function SellerDashboard() {
  // Add class to <body> for dashboard-specific CSS
  useEffect(() => {
    document.body.classList.add("seller-page");
    return () => {
      document.body.classList.remove("seller-page");
    };
  }, []);

  const dispatch = useDispatch();
  const { dashboard, status, error, lastFetched, hydratedFromStorage } =
    useSelector((state) => state.seller);

  const hasData = Boolean(dashboard);
  const loading = !hasData && (status === "loading" || status === "idle");
  const refreshing = hasData && status === "loading";
  const stats = dashboard?.stats || {
    totalSales: 0,
    totalEarnings: 0,
    totalOrders: 0,
  };
  const stockAlerts = dashboard?.stockAlerts || [];
  const recentOrders = dashboard?.recentOrders || [];
  const statusDistribution = dashboard?.statusDistribution || {};
  const lastUpdatedText = lastFetched
    ? `Last updated ${new Date(lastFetched).toLocaleString()}${
        refreshing ? " • Refreshing..." : ""
      }`
    : loading
      ? "Loading dashboard..."
      : "Data refreshes periodically.";

  const pieRef = useRef(null);
  const pieInst = useRef(null);

  useEffect(() => {
    if (hydratedFromStorage) {
      dispatch(fetchSellerDashboard());
    }
  }, [dispatch, hydratedFromStorage]);

  useEffect(() => {
    const shouldFetch =
      status === "idle" ||
      !lastFetched ||
      Date.now() - (lastFetched || 0) > STALE_AFTER_MS;
    if (shouldFetch) {
      dispatch(fetchSellerDashboard());
    }
  }, [dispatch, status, lastFetched]);

  // Pie chart setup
  useEffect(() => {
    if (!pieRef.current) return;
    if (pieInst.current) {
      pieInst.current.destroy();
      pieInst.current = null;
    }

    const labels = Object.keys(statusDistribution);
    const values = Object.values(statusDistribution);
    if (!labels.length) return;

    try {
      pieInst.current = new Chart(pieRef.current.getContext("2d"), {
        type: "pie",
        data: {
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: [
                "#6a11cb",
                "#2575fc",
                "#ff6f61",
                "#2ecc71",
                "#f1c40f",
              ],
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "bottom" } },
        },
      });
    } catch {}

    return () => {
      if (pieInst.current) {
        pieInst.current.destroy();
        pieInst.current = null;
      }
    };
  }, [statusDistribution]);

  const handleRefresh = () => {
    dispatch(fetchSellerDashboard());
  };

  return (
    <div>
      {/* NAVBAR */}
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
            <a href="/seller/dashboard" className="active">
              Dashboard
            </a>
          </li>
          <li>
            <a href="/seller/profileSettings">Profile Settings</a>
          </li>
          <li>
            <a href="/seller/productmanagement">Products</a>
          </li>
          <li>
            <a href="/seller/orders">Orders</a>
          </li>
          <li>
            <a href="/seller/reviews">Reviews</a>
          </li>
          <li>
            <a href="/logout">Logout</a>
          </li>
        </ul>
      </nav>

      {/* HEADER */}
      <header>
        <h1>AutoCustomizer Seller Dashboard</h1>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            marginTop: 8,
          }}
        >
          <span style={{ color: "#6b7280", fontSize: 14 }}>
            {lastUpdatedText}
          </span>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={status === "loading"}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: "1px solid #cbd5f5",
              background: status === "loading" ? "#e5e7eb" : "#111827",
              color: status === "loading" ? "#6b7280" : "#fff",
              cursor: status === "loading" ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {status === "loading" ? "Refreshing" : "Refresh Data"}
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="seller-main">
        {loading ? (
          <p className="loading" style={{ textAlign: "center" }}>
            Loading dashboard...
          </p>
        ) : null}
        {error && hasData ? (
          <p style={{ color: "red", textAlign: "center" }}>{error}</p>
        ) : null}
        {/* Stat Cards */}
        <section className="stats">
          <div className="card">
            <h2>Total Sales</h2>
            <p>{stats.totalSales}</p>
          </div>
          <div className="card">
            <h2>Total Earnings</h2>
            <p>₹{stats.totalEarnings}</p>
          </div>
          <div className="card">
            <h2>Total Orders</h2>
            <p>{stats.totalOrders}</p>
          </div>
        </section>

        {/* Stock Alerts */}
        <section className="alerts" style={{ marginTop: 30 }}>
          <h2>Stock Alerts</h2>
          <div>
            {stockAlerts.length ? (
              <ul>
                {stockAlerts.map((a, i) => (
                  <li key={i}>
                    <strong>{a.product}</strong> — Only {a.stock} left!
                  </li>
                ))}
              </ul>
            ) : (
              <p>All products are well-stocked.</p>
            )}
          </div>
        </section>

        {/* Orders + Chart */}
        <div className="orders-and-chart">
          {/* Orders Table */}
          <section className="orders">
            <h2>Recent Orders</h2>
            {recentOrders.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o, i) => (
                    <tr key={i}>
                      <td>{o.orderId}</td>
                      <td>{o.customer}</td>
                      <td>{o.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No recent orders.</p>
            )}
          </section>

          {/* Pie Chart */}
          <section className="pie-chart">
            <h2>Order Status Distribution</h2>
            <div style={{ position: "relative", height: 300 }}>
              {Object.keys(statusDistribution).length ? (
                <canvas ref={pieRef} />
              ) : (
                <p style={{ textAlign: "center" }}>
                  No order distribution data yet.
                </p>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="seller-footer">
        <p>© 2025 AutoCustomizer | All Rights Reserved</p>
      </footer>

      {error && !hasData && (
        <p style={{ color: "red", textAlign: "center" }}>
          Failed to load dashboard: {error}
        </p>
      )}
    </div>
  );
}
