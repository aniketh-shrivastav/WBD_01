import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import ManagerNav from "../../components/ManagerNav";
import "../../Css/manager.css";
import Chart from "chart.js/auto";
import {
  fetchManagerDashboard,
  setActiveProductTab,
  clearManagerError,
} from "../../store/managerSlice";

const STALE_AFTER_MS = 1000 * 60 * 5; // 5 minutes

const DEFAULT_REVENUE_CHART = {
  labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  totalRevenue: [8500, 9200, 7800, 10500, 11200, 9800],
  commission: [1700, 1840, 1560, 2100, 2240, 1960],
};

const DEFAULT_USER_GROWTH_CHART = {
  labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  totalUsers: [850, 950, 1050, 1150, 1200, 1234],
  serviceProviders: [200, 230, 260, 290, 320, 340],
  sellers: [100, 120, 150, 180, 210, 230],
};

function formatCurrency(v) {
  return "₹" + Number(v || 0).toFixed(2);
}

function ProductTable({
  title,
  products,
  type,
  onApprove,
  onReject,
  actionState,
}) {
  if (!products || products.length === 0) {
    return (
      <div className="product-tabs">
        <h2>{title}</h2>
        <p className="empty-state">No {type} products.</p>
      </div>
    );
  }
  return (
    <div className="product-tabs">
      <h2>{title}</h2>
      <div className="table-responsive">
        <table className="generic-table">
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p._id}>
                <td>
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.name}
                      style={{ width: 50, height: 50, objectFit: "cover" }}
                    />
                  ) : (
                    "No image"
                  )}
                </td>
                <td>{p.name || ""}</td>
                <td>{(p.seller && p.seller.name) || "N/A"}</td>
                <td>{formatCurrency(p.price)}</td>
                <td>{p.category || "N/A"}</td>
                <td>{p.brand || "N/A"}</td>
                <td>{p.description || "No description"}</td>
                <td>{p.quantity || 0}</td>
                <td>
                  {type === "pending" && (
                    <>
                      <button
                        type="button"
                        className="btn btn-approve"
                        onClick={() => onApprove?.(p._id)}
                        disabled={
                          actionState?.loadingKey === `${p._id}:approve`
                        }
                      >
                        {actionState?.loadingKey === `${p._id}:approve`
                          ? "Approving..."
                          : "Approve"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-suspend"
                        onClick={() => onReject?.(p._id)}
                        disabled={actionState?.loadingKey === `${p._id}:reject`}
                      >
                        {actionState?.loadingKey === `${p._id}:reject`
                          ? "Rejecting..."
                          : "Reject"}
                      </button>
                    </>
                  )}
                  {type === "approved" && (
                    <button
                      type="button"
                      className="btn btn-suspend"
                      onClick={() => onReject?.(p._id)}
                      disabled={actionState?.loadingKey === `${p._id}:reject`}
                    >
                      {actionState?.loadingKey === `${p._id}:reject`
                        ? "Rejecting..."
                        : "Reject"}
                    </button>
                  )}
                  {type === "rejected" && (
                    <button
                      type="button"
                      className="btn btn-approve"
                      onClick={() => onApprove?.(p._id)}
                      disabled={actionState?.loadingKey === `${p._id}:approve`}
                    >
                      {actionState?.loadingKey === `${p._id}:approve`
                        ? "Approving..."
                        : "Approve"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ManagerDashboard() {
  const dispatch = useDispatch();
  const {
    dashboard: data,
    status,
    error,
    activeProductTab,
    lastFetched,
  } = useSelector((state) => state.manager);
  const userDistRef = useRef(null);
  const revenueRef = useRef(null);
  const growthRef = useRef(null);
  const userDistChart = useRef();
  const revenueChart = useRef();
  const growthChart = useRef();
  const [productActionState, setProductActionState] = useState({
    loadingKey: null,
    error: null,
  });
  const [reportState, setReportState] = useState({ loading: false, error: "" });

  const revenueChartData = useMemo(() => {
    if (data?.charts?.monthlyRevenue) {
      return data.charts.monthlyRevenue;
    }
    return DEFAULT_REVENUE_CHART;
  }, [data]);

  const userGrowthChartData = useMemo(() => {
    if (data?.charts?.userGrowth) {
      return data.charts.userGrowth;
    }
    return DEFAULT_USER_GROWTH_CHART;
  }, [data]);

  const highlights = data?.highlights || {};
  const bestSeller = highlights.bestSeller || null;
  const bestProvider = highlights.bestProvider || null;
  const repeatOrders = highlights.repeatOrders || {
    count: 0,
    topCustomers: [],
  };
  const mostOrderedProduct = highlights.mostOrderedProduct || null;
  const topServices = highlights.topServices || [];

  const handleProductAction = async (productId, action) => {
    if (!productId || !["approve", "reject"].includes(action)) return;
    setProductActionState({
      loadingKey: `${productId}:${action}`,
      error: null,
    });
    try {
      const res = await fetch(`/manager/products/${productId}/${action}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "include",
      });

      const ct = res.headers.get("content-type") || "";
      const payload = ct.includes("application/json") ? await res.json() : null;
      if (!res.ok) {
        throw new Error(
          payload?.message || `Failed to ${action} product. Try again.`,
        );
      }

      await dispatch(fetchManagerDashboard()).unwrap();
      setProductActionState({ loadingKey: null, error: null });
    } catch (err) {
      setProductActionState({
        loadingKey: null,
        error: err.message || "Something went wrong.",
      });
    }
  };

  const handleDownloadReport = async () => {
    setReportState({ loading: true, error: "" });
    try {
      const res = await fetch("/manager/api/dashboard/report", {
        headers: { Accept: "application/pdf" },
      });
      if (!res.ok) {
        throw new Error("Failed to generate report");
      }
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `manager-dashboard-report-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
      setReportState({ loading: false, error: "" });
    } catch (err) {
      setReportState({
        loading: false,
        error: err.message || "Unable to download report",
      });
    }
  };

  useEffect(() => {
    // Ensure manager pages render on a light background and not auth gradient
    document.body.classList.add("manager-theme");
    return () => document.body.classList.remove("manager-theme");
  }, []);

  useEffect(() => {
    const shouldFetch =
      status === "idle" ||
      !lastFetched ||
      Date.now() - lastFetched > STALE_AFTER_MS;
    if (shouldFetch) {
      dispatch(fetchManagerDashboard());
    }
    return () => {
      userDistChart.current?.destroy?.();
      revenueChart.current?.destroy?.();
      growthChart.current?.destroy?.();
    };
  }, [dispatch, status, lastFetched]);

  useEffect(() => {
    if (!data) return;
    // Draw charts
    userDistChart.current?.destroy?.();
    revenueChart.current?.destroy?.();
    growthChart.current?.destroy?.();

    if (userDistRef.current) {
      userDistChart.current = new Chart(userDistRef.current, {
        type: "pie",
        data: {
          labels: ["Customers", "Service Providers", "Sellers", "Manager"],
          datasets: [
            {
              data: data.userCounts,
              backgroundColor: ["#4299e1", "#48bb78", "#ed8936", "#9f7aea"],
            },
          ],
        },
        options: { plugins: { legend: { position: "bottom" } } },
      });
    }

    if (revenueRef.current) {
      const {
        labels,
        totalRevenue,
        commission: commissionSeries,
      } = revenueChartData;
      revenueChart.current = new Chart(revenueRef.current, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Total Revenue",
              data: totalRevenue,
              backgroundColor: "#4299e1",
              borderRadius: 5,
            },
            {
              label: "Commission (20%)",
              data: commissionSeries,
              backgroundColor: "#48bb78",
              borderRadius: 5,
            },
          ],
        },
      });
    }

    if (growthRef.current) {
      const {
        labels,
        totalUsers: totalUsersSeries,
        serviceProviders: serviceProvidersSeries,
        sellers: sellerSeries,
      } = userGrowthChartData;
      growthChart.current = new Chart(growthRef.current, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Total Users",
              data: totalUsersSeries,
              borderColor: "#4299e1",
              tension: 0.3,
              fill: false,
            },
            {
              label: "Service Providers",
              data: serviceProvidersSeries,
              borderColor: "#48bb78",
              tension: 0.3,
              fill: false,
            },
            {
              label: "Sellers",
              data: sellerSeries,
              borderColor: "#ed8936",
              tension: 0.3,
              fill: false,
            },
          ],
        },
      });
    }
  }, [data, revenueChartData, userGrowthChartData]);

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
          onClick={() => dispatch(fetchManagerDashboard())}
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
          <h2>Manager's Panel</h2>
        </div>
        <div id="manager-nav">
          <ManagerNav />
        </div>
      </div>

      <div className="main-content">
        <h1>Dashboard Overview</h1>
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
              onClick={() => dispatch(fetchManagerDashboard())}
              disabled={status === "loading"}
            >
              {status === "loading" ? "Refreshing" : "Refresh Data"}
            </button>
            <button
              type="button"
              className="btn"
              style={{ background: "#111827" }}
              onClick={handleDownloadReport}
              disabled={reportState.loading}
            >
              {reportState.loading ? "Preparing Report" : "Download Report"}
            </button>
          </div>
        </div>

        {reportState.error && (
          <div
            style={{
              background: "#fef2f2",
              color: "#b91c1c",
              border: "1px solid #fecaca",
              borderRadius: 8,
              padding: "8px 12px",
              marginBottom: 12,
            }}
          >
            {reportState.error}
          </div>
        )}

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
              onClick={() => dispatch(clearManagerError())}
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="stats-grid" id="stats-grid">
          <div className="stat-card">
            <h3>Total Users</h3>
            <p className="number">{data.totalUsers}</p>
          </div>
          <div className="stat-card">
            <h3>Total Earnings</h3>
            <p className="number">{formatCurrency(data.totalEarnings)}</p>
          </div>
          <div className="stat-card">
            <h3>Commission (20%)</h3>
            <p className="number">{formatCurrency(data.commission)}</p>
          </div>
        </div>

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
            <h2>Monthly Revenue & Commission</h2>
            <div className="chart-box">
              <canvas ref={revenueRef} />
            </div>
          </div>
          <div className="chart-wrapper">
            <h2>User Growth</h2>
            <div className="chart-box">
              <canvas ref={growthRef} />
            </div>
          </div>
        </div>

        <div className="product-tabs">
          <h2>Product Approval</h2>
          <div className="tabs">
            <button
              className={`tab-btn ${
                activeProductTab === "pending" ? "active" : ""
              }`}
              onClick={() => dispatch(setActiveProductTab("pending"))}
              data-tab="pending"
            >
              Pending
            </button>
            <button
              className={`tab-btn ${
                activeProductTab === "approved" ? "active" : ""
              }`}
              onClick={() => dispatch(setActiveProductTab("approved"))}
              data-tab="approved"
            >
              Approved
            </button>
            <button
              className={`tab-btn ${
                activeProductTab === "rejected" ? "active" : ""
              }`}
              onClick={() => dispatch(setActiveProductTab("rejected"))}
              data-tab="rejected"
            >
              Rejected
            </button>
          </div>

          {productActionState.error && (
            <div className="error-banner" style={{ marginBottom: 16 }}>
              {productActionState.error}
            </div>
          )}

          {activeProductTab === "pending" && (
            <div className="tab-content" style={{ display: "block" }}>
              <ProductTable
                title="Pending"
                products={data.pendingProducts}
                type="pending"
                onApprove={(id) => handleProductAction(id, "approve")}
                onReject={(id) => handleProductAction(id, "reject")}
                actionState={productActionState}
              />
            </div>
          )}
          {activeProductTab === "approved" && (
            <div className="tab-content" style={{ display: "block" }}>
              <ProductTable
                title="Approved"
                products={data.approvedProducts}
                type="approved"
                onApprove={(id) => handleProductAction(id, "approve")}
                onReject={(id) => handleProductAction(id, "reject")}
                actionState={productActionState}
              />
            </div>
          )}
          {activeProductTab === "rejected" && (
            <div className="tab-content" style={{ display: "block" }}>
              <ProductTable
                title="Rejected"
                products={data.rejectedProducts}
                type="rejected"
                onApprove={(id) => handleProductAction(id, "approve")}
                onReject={(id) => handleProductAction(id, "reject")}
                actionState={productActionState}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
