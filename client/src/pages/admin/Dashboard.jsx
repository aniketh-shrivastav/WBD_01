import React, { useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import Chart from "chart.js/auto";
import AdminNav from "../../components/AdminNav";
import "../../Css/manager.css";
import { fetchAdminDashboard, clearAdminError } from "../../store/adminSlice";

const STALE_AFTER_MS = 1000 * 60 * 5; // 5 minutes

const DEFAULT_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export default function AdminDashboard() {
  const dispatch = useDispatch();
  const {
    dashboard: data,
    status,
    error,
    lastFetched,
  } = useSelector((state) => state.admin);

  const userDistRef = useRef(null);
  const salesRef = useRef(null);
  const profitLossRef = useRef(null);
  const growthRef = useRef(null);
  const ratingsRef = useRef(null);

  const userDistChart = useRef();
  const salesChart = useRef();
  const profitLossChart = useRef();
  const growthChart = useRef();
  const ratingsChart = useRef();

  const chartData = useMemo(() => {
    const charts = data?.charts || {};
    return {
      userDistribution: charts.userDistribution || {
        labels: [
          "Customers",
          "Service Providers",
          "Sellers",
          "Managers",
          "Admins",
        ],
        counts: [0, 0, 0, 0, 0],
      },
      monthlySales: charts.monthlySales || {
        labels: DEFAULT_LABELS,
        productSales: Array(DEFAULT_LABELS.length).fill(0),
        serviceSales: Array(DEFAULT_LABELS.length).fill(0),
      },
      monthlyProfitLoss: charts.monthlyProfitLoss || {
        labels: DEFAULT_LABELS,
        profit: Array(DEFAULT_LABELS.length).fill(0),
        loss: Array(DEFAULT_LABELS.length).fill(0),
      },
      userGrowth: charts.userGrowth || {
        labels: DEFAULT_LABELS,
        totalUsers: Array(DEFAULT_LABELS.length).fill(0),
        customers: Array(DEFAULT_LABELS.length).fill(0),
        serviceProviders: Array(DEFAULT_LABELS.length).fill(0),
        sellers: Array(DEFAULT_LABELS.length).fill(0),
      },
      ratingDistribution: charts.ratingDistribution || {
        labels: ["1★", "2★", "3★", "4★", "5★"],
        productRatings: [0, 0, 0, 0, 0],
        serviceRatings: [0, 0, 0, 0, 0],
      },
    };
  }, [data]);

  useEffect(() => {
    document.body.classList.add("manager-theme");
    return () => document.body.classList.remove("manager-theme");
  }, []);

  useEffect(() => {
    const shouldFetch =
      status === "idle" ||
      !lastFetched ||
      Date.now() - lastFetched > STALE_AFTER_MS;
    if (shouldFetch) {
      dispatch(fetchAdminDashboard());
    }
    return () => {
      userDistChart.current?.destroy?.();
      salesChart.current?.destroy?.();
      profitLossChart.current?.destroy?.();
      growthChart.current?.destroy?.();
      ratingsChart.current?.destroy?.();
    };
  }, [dispatch, status, lastFetched]);

  useEffect(() => {
    if (!data) return;

    userDistChart.current?.destroy?.();
    salesChart.current?.destroy?.();
    profitLossChart.current?.destroy?.();
    growthChart.current?.destroy?.();
    ratingsChart.current?.destroy?.();

    if (userDistRef.current) {
      userDistChart.current = new Chart(userDistRef.current, {
        type: "pie",
        data: {
          labels: chartData.userDistribution.labels,
          datasets: [
            {
              data: chartData.userDistribution.counts,
              backgroundColor: [
                "#60a5fa",
                "#34d399",
                "#fb923c",
                "#a78bfa",
                "#f472b6",
              ],
            },
          ],
        },
        options: { plugins: { legend: { position: "bottom" } } },
      });
    }

    if (salesRef.current) {
      salesChart.current = new Chart(salesRef.current, {
        type: "bar",
        data: {
          labels: chartData.monthlySales.labels,
          datasets: [
            {
              label: "Product Sales",
              data: chartData.monthlySales.productSales,
              backgroundColor: "#38bdf8",
              borderRadius: 6,
            },
            {
              label: "Service Sales",
              data: chartData.monthlySales.serviceSales,
              backgroundColor: "#22c55e",
              borderRadius: 6,
            },
          ],
        },
        options: { plugins: { legend: { position: "bottom" } } },
      });
    }

    if (profitLossRef.current) {
      profitLossChart.current = new Chart(profitLossRef.current, {
        type: "bar",
        data: {
          labels: chartData.monthlyProfitLoss.labels,
          datasets: [
            {
              label: "Profit",
              data: chartData.monthlyProfitLoss.profit,
              backgroundColor: "#16a34a",
              borderRadius: 6,
            },
            {
              label: "Loss",
              data: chartData.monthlyProfitLoss.loss,
              backgroundColor: "#ef4444",
              borderRadius: 6,
            },
          ],
        },
        options: { plugins: { legend: { position: "bottom" } } },
      });
    }

    if (growthRef.current) {
      growthChart.current = new Chart(growthRef.current, {
        type: "line",
        data: {
          labels: chartData.userGrowth.labels,
          datasets: [
            {
              label: "Total Users",
              data: chartData.userGrowth.totalUsers,
              borderColor: "#60a5fa",
              tension: 0.3,
              fill: false,
            },
            {
              label: "Customers",
              data: chartData.userGrowth.customers,
              borderColor: "#f97316",
              tension: 0.3,
              fill: false,
            },
            {
              label: "Service Providers",
              data: chartData.userGrowth.serviceProviders,
              borderColor: "#22c55e",
              tension: 0.3,
              fill: false,
            },
            {
              label: "Sellers",
              data: chartData.userGrowth.sellers,
              borderColor: "#a855f7",
              tension: 0.3,
              fill: false,
            },
          ],
        },
        options: { plugins: { legend: { position: "bottom" } } },
      });
    }

    if (ratingsRef.current) {
      ratingsChart.current = new Chart(ratingsRef.current, {
        type: "bar",
        data: {
          labels: chartData.ratingDistribution.labels,
          datasets: [
            {
              label: "Product Reviews",
              data: chartData.ratingDistribution.productRatings,
              backgroundColor: "#3b82f6",
              borderRadius: 6,
            },
            {
              label: "Service Reviews",
              data: chartData.ratingDistribution.serviceRatings,
              backgroundColor: "#10b981",
              borderRadius: 6,
            },
          ],
        },
        options: { plugins: { legend: { position: "bottom" } } },
      });
    }
  }, [data, chartData]);

  const totals = data?.totals || {};
  const reviews = data?.reviews || {};
  const users = data?.users || {};
  const highlights = data?.highlights || {};
  const bestSeller = highlights.bestSeller || null;
  const bestProvider = highlights.bestProvider || null;
  const repeatOrders = highlights.repeatOrders || {
    count: 0,
    topCustomers: [],
  };
  const mostOrderedProduct = highlights.mostOrderedProduct || null;
  const topServices = highlights.topServices || [];

  const hasData = Boolean(data);
  const isInitialLoading =
    !hasData && (status === "loading" || status === "idle");

  if (isInitialLoading) {
    return (
      <div className="main-content">
        <p>Loading...</p>
      </div>
    );
  }

  if (!hasData && error) {
    return (
      <div className="main-content">
        <p style={{ color: "red" }}>{error}</p>
        <button
          type="button"
          className="btn"
          onClick={() => dispatch(fetchAdminDashboard())}
          style={{ marginTop: 12 }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="navbar">
        <div className="logo">
          <h2>Admin Panel</h2>
        </div>
        <div id="admin-nav">
          <AdminNav />
        </div>
      </div>

      <div className="main-content">
        <h1>Admin Analytics Overview</h1>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 14, color: "#6b7280" }}>
            {lastFetched
              ? `Last updated ${new Date(lastFetched).toLocaleString()}`
              : "Data will refresh automatically."}
            {status === "loading" && hasData && " • Refreshing..."}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn"
              onClick={() => dispatch(fetchAdminDashboard())}
              disabled={status === "loading"}
            >
              {status === "loading" ? "Refreshing" : "Refresh Data"}
            </button>
          </div>
        </div>

        {error && hasData && (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              padding: "12px 16px",
              borderRadius: 8,
              marginBottom: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span>{error}</span>
            <button
              type="button"
              className="btn"
              style={{ background: "#fff", color: "#991b1b" }}
              onClick={() => dispatch(clearAdminError())}
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="stats-grid" id="stats-grid">
          <div className="stat-card">
            <h3>Total Users</h3>
            <p className="number">{totals.totalUsers || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Total Revenue</h3>
            <p className="number">{formatCurrency(totals.totalRevenue)}</p>
          </div>
          <div className="stat-card">
            <h3>Product Sales</h3>
            <p className="number">{totals.totalProductSales || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Service Sales</h3>
            <p className="number">{totals.totalServiceSales || 0}</p>
          </div>
          <div className="stat-card">
            <h3>Net Profit</h3>
            <p className="number">{formatCurrency(totals.netProfit)}</p>
          </div>
        </div>

        {/* Executive Highlights Section */}
        <div className="product-tabs" style={{ marginBottom: 24 }}>
          <h2>Executive Highlights</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Best Seller</h3>
              <p className="number">{bestSeller?.name || "N/A"}</p>
              <div style={{ color: "#6b7280", fontSize: 13 }}>
                {bestSeller
                  ? `${formatCurrency(bestSeller.revenue)} • ${bestSeller.units || 0} units`
                  : "No sales yet"}
              </div>
            </div>
            <div className="stat-card">
              <h3>Best Service Provider</h3>
              <p className="number">
                {bestProvider?.workshopName || bestProvider?.name || "N/A"}
              </p>
              <div style={{ color: "#6b7280", fontSize: 13 }}>
                {bestProvider
                  ? `${formatCurrency(bestProvider.revenue)} • ${bestProvider.bookings || 0} bookings`
                  : "No service revenue yet"}
              </div>
            </div>
            <div className="stat-card">
              <h3>Most Ordered Product</h3>
              <p className="number">{mostOrderedProduct?._id?.name || "N/A"}</p>
              <div style={{ color: "#6b7280", fontSize: 13 }}>
                {mostOrderedProduct
                  ? `${mostOrderedProduct.quantity || 0} orders • ${formatCurrency(mostOrderedProduct.revenue)}`
                  : "No product orders yet"}
              </div>
            </div>
            <div className="stat-card">
              <h3>Repeat Customers</h3>
              <p className="number">{repeatOrders.count || 0}</p>
              <div style={{ color: "#6b7280", fontSize: 13 }}>
                Customers with 2+ orders
              </div>
            </div>
            <div className="stat-card">
              <h3>Top Service Preference</h3>
              <p className="number">{topServices[0]?._id || "N/A"}</p>
              <div style={{ color: "#6b7280", fontSize: 13 }}>
                {topServices[0]
                  ? `${topServices[0].count} bookings`
                  : "No service data yet"}
              </div>
            </div>
          </div>

          <div className="charts-container" style={{ marginTop: 16 }}>
            <div className="chart-wrapper">
              <h2>Top Repeat Customers</h2>
              <div className="table-responsive">
                <table className="generic-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(repeatOrders.topCustomers || []).length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ textAlign: "center" }}>
                          No repeat customers yet.
                        </td>
                      </tr>
                    ) : (
                      repeatOrders.topCustomers.map((c) => (
                        <tr key={c._id}>
                          <td>{c.name || "N/A"}</td>
                          <td>{c.email || "N/A"}</td>
                          <td>{c.orders || 0}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="chart-wrapper">
              <h2>Most Preferred Services</h2>
              <div className="table-responsive">
                <table className="generic-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Bookings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topServices.length === 0 ? (
                      <tr>
                        <td colSpan={2} style={{ textAlign: "center" }}>
                          No service preferences yet.
                        </td>
                      </tr>
                    ) : (
                      topServices.map((s) => (
                        <tr key={s._id}>
                          <td>{s._id}</td>
                          <td>{s.count}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="charts-container">
          <div className="chart-wrapper">
            <h2>User Distribution</h2>
            <div className="chart-box">
              <canvas ref={userDistRef} />
            </div>
          </div>
          <div className="chart-wrapper">
            <h2>Monthly Product vs Service Sales</h2>
            <div className="chart-box">
              <canvas ref={salesRef} />
            </div>
          </div>
          <div className="chart-wrapper">
            <h2>Monthly Profit/Loss</h2>
            <div className="chart-box">
              <canvas ref={profitLossRef} />
            </div>
          </div>
          <div className="chart-wrapper">
            <h2>User Growth</h2>
            <div className="chart-box">
              <canvas ref={growthRef} />
            </div>
          </div>
          <div className="chart-wrapper">
            <h2>Ratings Distribution</h2>
            <div className="chart-box">
              <canvas ref={ratingsRef} />
            </div>
          </div>
        </div>

        <div className="product-tabs">
          <h2>Latest Product Reviews</h2>
          <div className="table-responsive">
            <table className="generic-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Reviewer</th>
                  <th>Rating</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {(reviews.product || []).length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center" }}>
                      No product reviews yet.
                    </td>
                  </tr>
                ) : (
                  reviews.product.map((r) => (
                    <tr key={r._id}>
                      <td>{r.productId?.name || "Unknown"}</td>
                      <td>{r.userId?.name || r.userId?.email || "Unknown"}</td>
                      <td>{r.rating || "-"}</td>
                      <td>{r.review || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="product-tabs">
          <h2>Latest Service Reviews</h2>
          <div className="table-responsive">
            <table className="generic-table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Customer</th>
                  <th>Rating</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {(reviews.service || []).length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center" }}>
                      No service reviews yet.
                    </td>
                  </tr>
                ) : (
                  reviews.service.map((r) => (
                    <tr key={r._id}>
                      <td>{r.providerId?.name || "Unknown"}</td>
                      <td>{r.customerId?.name || "Unknown"}</td>
                      <td>{r.rating || "-"}</td>
                      <td>{r.review || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="product-tabs">
          <h2>Recent Users</h2>
          <div className="table-responsive">
            <table className="user-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {(users.recent || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center" }}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.recent.map((u) => (
                    <tr key={u._id}>
                      <td>{u.name || "N/A"}</td>
                      <td>{u.email || "N/A"}</td>
                      <td>{u.role || "N/A"}</td>
                      <td>{u.suspended ? "Suspended" : "Active"}</td>
                      <td>
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString()
                          : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
