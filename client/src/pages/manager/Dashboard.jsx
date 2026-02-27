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

// Edit Product Modal Component
function EditProductModal({ isOpen, onClose, product, onSave, loading }) {
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    description: "",
    category: "",
    brand: "",
    quantity: "",
    compatibility: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        price: product.price || "",
        description: product.description || "",
        category: product.category || "",
        brand: product.brand || "",
        quantity: product.quantity || "",
        compatibility: product.compatibility || "",
      });
      setError("");
    }
  }, [product]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Basic validation
    if (!formData.name.trim()) {
      setError("Product name is required");
      return;
    }
    if (!formData.price || parseFloat(formData.price) < 0) {
      setError("Valid price is required");
      return;
    }
    if (!formData.quantity || parseInt(formData.quantity) < 0) {
      setError("Valid quantity is required");
      return;
    }
    if (!formData.description.trim()) {
      setError("Description is required");
      return;
    }
    if (!formData.category.trim()) {
      setError("Category is required");
      return;
    }
    if (!formData.brand.trim()) {
      setError("Brand is required");
      return;
    }

    try {
      await onSave(product._id, formData);
    } catch (err) {
      setError(err.message || "Failed to save changes");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="edit-modal-overlay" onClick={onClose}>
      <div className="edit-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="edit-modal-header">
          <h2>Edit Product</h2>
          <button className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="edit-modal-body">
            {error && <div className="edit-error-banner">{error}</div>}

            <div className="edit-form-row">
              <div className="edit-form-group">
                <label htmlFor="name">Product Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter product name"
                />
              </div>
              <div className="edit-form-group">
                <label htmlFor="brand">Brand *</label>
                <input
                  type="text"
                  id="brand"
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  placeholder="Enter brand"
                />
              </div>
            </div>

            <div className="edit-form-row">
              <div className="edit-form-group">
                <label htmlFor="price">Price (₹) *</label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              <div className="edit-form-group">
                <label htmlFor="quantity">Stock Quantity *</label>
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="edit-form-row">
              <div className="edit-form-group">
                <label htmlFor="category">Category *</label>
                <input
                  type="text"
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  placeholder="Enter category"
                />
              </div>
              <div className="edit-form-group">
                <label htmlFor="compatibility">Compatibility</label>
                <input
                  type="text"
                  id="compatibility"
                  name="compatibility"
                  value={formData.compatibility}
                  onChange={handleChange}
                  placeholder="E.g., Honda Civic 2020+"
                />
              </div>
            </div>

            <div className="edit-form-group full-width">
              <label htmlFor="description">Description *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="4"
                placeholder="Enter product description"
              />
            </div>

            {product && product.image && (
              <div className="edit-form-group full-width">
                <label>Current Image</label>
                <img
                  src={product.image}
                  alt={product.name}
                  style={{
                    maxWidth: 150,
                    maxHeight: 150,
                    objectFit: "cover",
                    borderRadius: 8,
                  }}
                />
              </div>
            )}
          </div>
          <div className="edit-modal-footer">
            <button type="button" className="btn btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-save" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
      <style>{`
        .edit-modal-overlay {
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
        .edit-modal-content {
          background: #fff;
          border-radius: 12px;
          max-width: 700px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }
        .edit-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
          border-radius: 12px 12px 0 0;
        }
        .edit-modal-header h2 {
          margin: 0;
          font-size: 1.25rem;
          color: #111827;
        }
        .modal-close-btn {
          background: none;
          border: none;
          font-size: 1.75rem;
          cursor: pointer;
          color: #6b7280;
          line-height: 1;
          padding: 0;
        }
        .modal-close-btn:hover {
          color: #111827;
        }
        .edit-modal-body {
          padding: 24px;
        }
        .edit-error-banner {
          background: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 16px;
        }
        .edit-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }
        .edit-form-group {
          display: flex;
          flex-direction: column;
        }
        .edit-form-group.full-width {
          grid-column: 1 / -1;
          margin-bottom: 16px;
        }
        .edit-form-group label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 6px;
        }
        .edit-form-group input,
        .edit-form-group textarea {
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.95rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .edit-form-group input:focus,
        .edit-form-group textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .edit-form-group textarea {
          resize: vertical;
          min-height: 80px;
        }
        .edit-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid #e5e7eb;
          background: #f9fafb;
          border-radius: 0 0 12px 12px;
        }
        .btn-cancel {
          background: #fff;
          color: #374151;
          border: 1px solid #d1d5db;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
        }
        .btn-cancel:hover {
          background: #f3f4f6;
        }
        .btn-save {
          background: #3b82f6;
          color: #fff;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
        }
        .btn-save:hover {
          background: #2563eb;
        }
        .btn-save:disabled {
          background: #93c5fd;
          cursor: not-allowed;
        }
        @media (max-width: 640px) {
          .edit-form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function ProductTable({
  title,
  products,
  type,
  onApprove,
  onReject,
  onEdit,
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
                <td
                  style={{
                    maxWidth: 200,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.description || "No description"}
                </td>
                <td>{p.quantity || 0}</td>
                <td>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn btn-edit"
                      onClick={() => onEdit?.(p)}
                      style={{
                        background: "#6366f1",
                        color: "white",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: "0.85rem",
                      }}
                    >
                      Edit
                    </button>
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
                            ? "..."
                            : "Approve"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-suspend"
                          onClick={() => onReject?.(p._id)}
                          disabled={
                            actionState?.loadingKey === `${p._id}:reject`
                          }
                        >
                          {actionState?.loadingKey === `${p._id}:reject`
                            ? "..."
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
                          ? "..."
                          : "Reject"}
                      </button>
                    )}
                    {type === "rejected" && (
                      <button
                        type="button"
                        className="btn btn-approve"
                        onClick={() => onApprove?.(p._id)}
                        disabled={
                          actionState?.loadingKey === `${p._id}:approve`
                        }
                      >
                        {actionState?.loadingKey === `${p._id}:approve`
                          ? "..."
                          : "Approve"}
                      </button>
                    )}
                  </div>
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

  // Edit product state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

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

  // Handle opening edit modal
  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setEditModalOpen(true);
  };

  // Handle saving edited product
  const handleSaveProduct = async (productId, formData) => {
    setEditLoading(true);
    try {
      const res = await fetch(`/manager/products/${productId}/edit`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const ct = res.headers.get("content-type") || "";
      const payload = ct.includes("application/json") ? await res.json() : null;

      if (!res.ok) {
        throw new Error(payload?.message || "Failed to save product changes.");
      }

      // Refresh dashboard data
      await dispatch(fetchManagerDashboard()).unwrap();
      setEditModalOpen(false);
      setEditingProduct(null);
    } catch (err) {
      throw err;
    } finally {
      setEditLoading(false);
    }
  };

  // Handle closing edit modal
  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditingProduct(null);
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
                onEdit={handleEditProduct}
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
                onEdit={handleEditProduct}
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
                onEdit={handleEditProduct}
                actionState={productActionState}
              />
            </div>
          )}
        </div>
      </div>

      {/* Edit Product Modal */}
      <EditProductModal
        isOpen={editModalOpen}
        onClose={handleCloseEditModal}
        product={editingProduct}
        onSave={handleSaveProduct}
        loading={editLoading}
      />
    </>
  );
}
