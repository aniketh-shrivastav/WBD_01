import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import Chart from "chart.js/auto";
import SellerNav from "../../components/SellerNav";
import SellerFooter from "../../components/SellerFooter";
import "../../Css/seller.css";
import { fetchSellerDashboard } from "../../store/sellerSlice";

const STALE_AFTER_MS = 1000 * 60 * 5;

export default function SellerDashboard() {
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
                "#4f46e5",
                "#6366f1",
                "#ef4444",
                "#10b981",
                "#f59e0b",
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
    <div className="seller-page">
      <SellerNav />

      <main className="seller-main">
        <div className="seller-flex seller-items-center seller-justify-between seller-flex-wrap seller-gap-2 seller-mb-3">
          <div>
            <h1 className="seller-title">Seller Dashboard</h1>
            <p className="seller-subtitle">{lastUpdatedText}</p>
          </div>
          <button
            className="seller-btn seller-btn-primary seller-btn-sm"
            onClick={handleRefresh}
            disabled={status === "loading"}
          >
            {status === "loading" ? "Refreshing..." : "↻ Refresh Data"}
          </button>
        </div>

        {loading && (
          <div className="seller-loading">
            <div className="seller-spinner" />
            <span className="seller-loading-text">Loading dashboard...</span>
          </div>
        )}

        {error && hasData && (
          <div className="seller-alert seller-alert-error">{error}</div>
        )}
        {error && !hasData && (
          <div className="seller-alert seller-alert-error">
            Failed to load dashboard: {error}
          </div>
        )}

        {/* Stat Cards */}
        <div className="seller-stats-grid">
          <div className="seller-stat-card">
            <div className="seller-stat-icon">📦</div>
            <span className="seller-stat-label">Total Sales</span>
            <span className="seller-stat-value">{stats.totalSales}</span>
          </div>
          <div className="seller-stat-card">
            <div className="seller-stat-icon">💰</div>
            <span className="seller-stat-label">Total Earnings</span>
            <span className="seller-stat-value">₹{stats.totalEarnings}</span>
          </div>
          <div className="seller-stat-card">
            <div className="seller-stat-icon">🛒</div>
            <span className="seller-stat-label">Total Orders</span>
            <span className="seller-stat-value">{stats.totalOrders}</span>
          </div>
        </div>

        {/* Stock Alerts */}
        <div className="seller-alerts-card">
          <h3 className="seller-table-title seller-mt-0 seller-mb-2">
            ⚠ Stock Alerts
          </h3>
          {stockAlerts.length ? (
            stockAlerts.map((a, i) => (
              <div className="seller-alert-item" key={i}>
                <strong>{a.product}</strong> — Only {a.stock} left!
              </div>
            ))
          ) : (
            <p className="seller-text-muted seller-mb-0">
              All products are well-stocked.
            </p>
          )}
        </div>

        {/* Orders + Chart Grid */}
        <div className="seller-dashboard-grid">
          <div className="seller-chart-card">
            <h3>Recent Orders</h3>
            {recentOrders.length ? (
              <div className="seller-table-wrap">
                <table className="seller-table">
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
                        <td style={{ fontWeight: 600 }}>{o.orderId}</td>
                        <td>{o.customer}</td>
                        <td>
                          <span
                            className={`seller-status-badge seller-status-${String(o.status).toLowerCase()}`}
                          >
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="seller-text-muted">No recent orders.</p>
            )}
          </div>

          <div className="seller-chart-card">
            <h3>Order Status Distribution</h3>
            <div style={{ position: "relative", height: 300 }}>
              {Object.keys(statusDistribution).length ? (
                <canvas ref={pieRef} />
              ) : (
                <p className="seller-text-center seller-text-muted">
                  No order distribution data yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      <SellerFooter />
    </div>
  );
}
