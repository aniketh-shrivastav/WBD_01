import React, { useEffect, useMemo, useRef, useState } from "react";
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

/* ── Read-only product table (no action buttons) ── */
function ReadOnlyProductTable({
  title,
  products = [],
  searchTerm = "",
  onSearchChange,
}) {
  const filtered = React.useMemo(() => {
    if (!searchTerm.trim()) return products;
    const q = searchTerm.toLowerCase();
    return products.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.seller?.name || "").toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q) ||
        (p.brand || "").toLowerCase().includes(q),
    );
  }, [products, searchTerm]);

  if (!products.length)
    return <p style={{ padding: 12 }}>No {title.toLowerCase()} products.</p>;

  return (
    <>
      {onSearchChange && (
        <div className="search-bar-wrapper" style={{ margin: "12px 0" }}>
          <input
            type="text"
            className="search-input"
            placeholder={`Search ${title.toLowerCase()} products by name, seller, category, brand...`}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              width: "100%",
              maxWidth: 460,
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              fontSize: "0.9rem",
              outline: "none",
              transition: "border-color 0.2s",
            }}
          />
        </div>
      )}
      {filtered.length === 0 ? (
        <p style={{ padding: 12, color: "#6b7280" }}>
          No products match "{searchTerm}".
        </p>
      ) : (
        <div
          className="table-container"
          style={{ overflowX: "auto", marginTop: 12 }}
        >
          <table className="data-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Seller</th>
                <th>Price</th>
                <th>Category</th>
                <th>Brand</th>
                <th>Description</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p._id}>
                  <td>
                    <img
                      src={p.image}
                      alt={p.name}
                      style={{
                        width: 48,
                        height: 48,
                        objectFit: "cover",
                        borderRadius: 4,
                      }}
                    />
                  </td>
                  <td>{p.name}</td>
                  <td>{p.seller?.name || "N/A"}</td>
                  <td>{formatCurrency(p.price)}</td>
                  <td>{p.category}</td>
                  <td>{p.brand}</td>
                  <td
                    style={{
                      maxWidth: 200,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.description}
                  </td>
                  <td>{p.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function AdminDashboard() {
  const dispatch = useDispatch();
  const {
    dashboard: data,
    status,
    error,
    lastFetched,
  } = useSelector((state) => state.admin);

  // Manager dashboard data (fetched separately)
  const [mgrData, setMgrData] = useState(null);
  const [mgrLoading, setMgrLoading] = useState(true);
  const [mgrError, setMgrError] = useState("");
  const [activeProductTab, setActiveProductTab] = useState("pending");
  const [adminProductSearch, setAdminProductSearch] = useState("");

  const userDistRef = useRef(null);
  const salesRef = useRef(null);
  const profitLossRef = useRef(null);
  const growthRef = useRef(null);
  const ratingsRef = useRef(null);
  const mgrRevenueRef = useRef(null);

  // Category analytics chart refs (from manager data)
  const adminProdCatPieRef = useRef(null);
  const adminProdCatBarRef = useRef(null);
  const adminProdCatLineRef = useRef(null);
  const adminSvcCatPieRef = useRef(null);
  const adminSvcCatBarRef = useRef(null);
  const adminSvcCatLineRef = useRef(null);

  const userDistChart = useRef();
  const salesChart = useRef();
  const profitLossChart = useRef();
  const growthChart = useRef();
  const ratingsChart = useRef();
  const mgrRevenueChart = useRef();
  const adminProdCatPieChart = useRef();
  const adminProdCatBarChart = useRef();
  const adminProdCatLineChart = useRef();
  const adminSvcCatPieChart = useRef();
  const adminSvcCatBarChart = useRef();
  const adminSvcCatLineChart = useRef();

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

    // Also fetch manager dashboard data
    async function loadMgrData() {
      try {
        setMgrLoading(true);
        const res = await fetch("/admin/api/manager-dashboard", {
          headers: { Accept: "application/json" },
        });
        if (res.status === 401 || res.status === 403) return;
        if (!res.ok) throw new Error("Failed to load manager data");
        const j = await res.json();
        setMgrData(j);
      } catch (e) {
        setMgrError(e.message || "Failed to load manager data");
      } finally {
        setMgrLoading(false);
      }
    }
    loadMgrData();

    return () => {
      userDistChart.current?.destroy?.();
      salesChart.current?.destroy?.();
      profitLossChart.current?.destroy?.();
      growthChart.current?.destroy?.();
      ratingsChart.current?.destroy?.();
      mgrRevenueChart.current?.destroy?.();
      adminProdCatPieChart.current?.destroy?.();
      adminProdCatBarChart.current?.destroy?.();
      adminProdCatLineChart.current?.destroy?.();
      adminSvcCatPieChart.current?.destroy?.();
      adminSvcCatBarChart.current?.destroy?.();
      adminSvcCatLineChart.current?.destroy?.();
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

  // Manager revenue & commission chart
  useEffect(() => {
    if (!mgrData) return;
    mgrRevenueChart.current?.destroy?.();

    const mgrChartData = mgrData.charts?.monthlyRevenue || {
      labels: DEFAULT_LABELS,
      totalRevenue: Array(DEFAULT_LABELS.length).fill(0),
      commission: Array(DEFAULT_LABELS.length).fill(0),
    };

    if (mgrRevenueRef.current) {
      mgrRevenueChart.current = new Chart(mgrRevenueRef.current, {
        type: "bar",
        data: {
          labels: mgrChartData.labels,
          datasets: [
            {
              label: "Total Revenue",
              data: mgrChartData.totalRevenue,
              backgroundColor: "#4299e1",
              borderRadius: 5,
            },
            {
              label: "Commission (20%)",
              data: mgrChartData.commission,
              backgroundColor: "#48bb78",
              borderRadius: 5,
            },
          ],
        },
        options: { plugins: { legend: { position: "bottom" } } },
      });
    }
  }, [mgrData]);

  // Category analytics charts (from manager data)
  useEffect(() => {
    if (!mgrData?.charts) return;

    const CAT_COLORS = [
      "#4299e1",
      "#48bb78",
      "#ed8936",
      "#9f7aea",
      "#f56565",
      "#38b2ac",
      "#d69e2e",
      "#e53e3e",
      "#667eea",
      "#fc8181",
    ];

    adminProdCatPieChart.current?.destroy?.();
    adminProdCatBarChart.current?.destroy?.();
    adminProdCatLineChart.current?.destroy?.();
    adminSvcCatPieChart.current?.destroy?.();
    adminSvcCatBarChart.current?.destroy?.();
    adminSvcCatLineChart.current?.destroy?.();

    const pcd = mgrData.charts.productCategoryDistribution;
    const pcr = mgrData.charts.productCategoryRevenue;
    const pcm = mgrData.charts.productCategoryMonthly;
    const scd = mgrData.charts.serviceCategoryDistribution;
    const scr = mgrData.charts.serviceCategoryRevenue;
    const scm = mgrData.charts.serviceCategoryMonthly;

    if (adminProdCatPieRef.current && pcd?.labels?.length) {
      adminProdCatPieChart.current = new Chart(adminProdCatPieRef.current, {
        type: "pie",
        data: {
          labels: pcd.labels,
          datasets: [
            {
              data: pcd.data,
              backgroundColor: pcd.labels.map(
                (_, i) => CAT_COLORS[i % CAT_COLORS.length],
              ),
            },
          ],
        },
        options: { plugins: { legend: { position: "bottom" } } },
      });
    }
    if (adminProdCatBarRef.current && pcr?.labels?.length) {
      adminProdCatBarChart.current = new Chart(adminProdCatBarRef.current, {
        type: "bar",
        data: {
          labels: pcr.labels,
          datasets: [
            {
              label: "Revenue (\u20b9)",
              data: pcr.revenue,
              backgroundColor: "#4299e1",
              borderRadius: 5,
            },
            {
              label: "Units Sold",
              data: pcr.orders,
              backgroundColor: "#48bb78",
              borderRadius: 5,
            },
          ],
        },
        options: {
          plugins: { legend: { position: "top" } },
          scales: { x: { ticks: { maxRotation: 45 } } },
        },
      });
    }
    if (adminProdCatLineRef.current && pcm?.datasets?.length) {
      adminProdCatLineChart.current = new Chart(adminProdCatLineRef.current, {
        type: "line",
        data: {
          labels: pcm.labels,
          datasets: pcm.datasets.map((ds, i) => ({
            label: ds.label,
            data: ds.data,
            borderColor: CAT_COLORS[i % CAT_COLORS.length],
            tension: 0.3,
            fill: false,
          })),
        },
        options: { plugins: { legend: { position: "top" } } },
      });
    }
    if (adminSvcCatPieRef.current && scd?.labels?.length) {
      adminSvcCatPieChart.current = new Chart(adminSvcCatPieRef.current, {
        type: "pie",
        data: {
          labels: scd.labels,
          datasets: [
            {
              data: scd.data,
              backgroundColor: scd.labels.map(
                (_, i) => CAT_COLORS[i % CAT_COLORS.length],
              ),
            },
          ],
        },
        options: { plugins: { legend: { position: "bottom" } } },
      });
    }
    if (adminSvcCatBarRef.current && scr?.labels?.length) {
      adminSvcCatBarChart.current = new Chart(adminSvcCatBarRef.current, {
        type: "bar",
        data: {
          labels: scr.labels,
          datasets: [
            {
              label: "Revenue (\u20b9)",
              data: scr.revenue,
              backgroundColor: "#9f7aea",
              borderRadius: 5,
            },
            {
              label: "Bookings",
              data: scr.bookings,
              backgroundColor: "#38b2ac",
              borderRadius: 5,
            },
          ],
        },
        options: {
          plugins: { legend: { position: "top" } },
          scales: { x: { ticks: { maxRotation: 45 } } },
        },
      });
    }
    if (adminSvcCatLineRef.current && scm?.datasets?.length) {
      adminSvcCatLineChart.current = new Chart(adminSvcCatLineRef.current, {
        type: "line",
        data: {
          labels: scm.labels,
          datasets: scm.datasets.map((ds, i) => ({
            label: ds.label,
            data: ds.data,
            borderColor: CAT_COLORS[i % CAT_COLORS.length],
            tension: 0.3,
            fill: false,
          })),
        },
        options: { plugins: { legend: { position: "top" } } },
      });
    }
  }, [mgrData]);

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

        {/* ── Manager Dashboard Data ── */}
        <hr
          style={{
            margin: "32px 0",
            border: "none",
            borderTop: "2px solid #e5e7eb",
          }}
        />
        <h1>Manager Dashboard Overview</h1>

        {mgrLoading && <p>Loading manager data...</p>}
        {mgrError && <p style={{ color: "#e74c3c" }}>{mgrError}</p>}

        {mgrData && (
          <>
            {/* Manager Stats */}
            <div className="stats-grid" style={{ marginBottom: 24 }}>
              <div className="stat-card">
                <h3>Total Earnings</h3>
                <p className="number">
                  {formatCurrency(mgrData.totalEarnings)}
                </p>
              </div>
              <div className="stat-card">
                <h3>Commission (20%)</h3>
                <p className="number">{formatCurrency(mgrData.commission)}</p>
              </div>
            </div>

            {/* Revenue & Commission Chart */}
            <div className="charts-container" style={{ marginBottom: 24 }}>
              <div className="chart-wrapper">
                <h2>Monthly Revenue &amp; Commission</h2>
                <div className="chart-box">
                  <canvas ref={mgrRevenueRef} />
                </div>
              </div>
            </div>

            {/* Product Category Analytics */}
            <div className="charts-container" style={{ marginBottom: 24 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <h2 style={{ marginBottom: 16 }}>
                  📦 Product Category Analytics
                </h2>
              </div>
              <div className="chart-wrapper">
                <h2>Products by Category</h2>
                <div className="chart-box">
                  <canvas ref={adminProdCatPieRef} />
                </div>
              </div>
              <div className="chart-wrapper">
                <h2>Revenue &amp; Units by Category</h2>
                <div className="chart-box">
                  <canvas ref={adminProdCatBarRef} />
                </div>
              </div>
              <div className="chart-wrapper">
                <h2>Monthly Product Orders by Category</h2>
                <div className="chart-box">
                  <canvas ref={adminProdCatLineRef} />
                </div>
              </div>
            </div>

            {/* Service Category Analytics */}
            <div className="charts-container" style={{ marginBottom: 24 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <h2 style={{ marginBottom: 16 }}>
                  🔧 Service Category Analytics
                </h2>
              </div>
              <div className="chart-wrapper">
                <h2>Bookings by Service</h2>
                <div className="chart-box">
                  <canvas ref={adminSvcCatPieRef} />
                </div>
              </div>
              <div className="chart-wrapper">
                <h2>Revenue &amp; Bookings by Service</h2>
                <div className="chart-box">
                  <canvas ref={adminSvcCatBarRef} />
                </div>
              </div>
              <div className="chart-wrapper">
                <h2>Monthly Bookings by Service</h2>
                <div className="chart-box">
                  <canvas ref={adminSvcCatLineRef} />
                </div>
              </div>
            </div>

            {/* Product Approval (Read-Only) */}
            <div className="product-tabs">
              <h2>Product Approval Overview</h2>
              <div className="tabs">
                <button
                  className={`tab-btn ${activeProductTab === "pending" ? "active" : ""}`}
                  onClick={() => setActiveProductTab("pending")}
                >
                  Pending
                </button>
                <button
                  className={`tab-btn ${activeProductTab === "approved" ? "active" : ""}`}
                  onClick={() => setActiveProductTab("approved")}
                >
                  Approved
                </button>
                <button
                  className={`tab-btn ${activeProductTab === "rejected" ? "active" : ""}`}
                  onClick={() => setActiveProductTab("rejected")}
                >
                  Rejected
                </button>
              </div>

              {activeProductTab === "pending" && (
                <ReadOnlyProductTable
                  title="Pending"
                  products={mgrData.pendingProducts}
                  searchTerm={adminProductSearch}
                  onSearchChange={setAdminProductSearch}
                />
              )}
              {activeProductTab === "approved" && (
                <ReadOnlyProductTable
                  title="Approved"
                  products={mgrData.approvedProducts}
                  searchTerm={adminProductSearch}
                  onSearchChange={setAdminProductSearch}
                />
              )}
              {activeProductTab === "rejected" && (
                <ReadOnlyProductTable
                  title="Rejected"
                  products={mgrData.rejectedProducts}
                  searchTerm={adminProductSearch}
                  onSearchChange={setAdminProductSearch}
                />
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
