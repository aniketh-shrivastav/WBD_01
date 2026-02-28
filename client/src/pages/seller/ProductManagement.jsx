import React, { useEffect, useRef, useState, useMemo } from "react";
import SellerNav from "../../components/SellerNav";
import SellerFooter from "../../components/SellerFooter";
import "../../Css/seller.css";

export default function ProductManagement() {
  // Local states
  const [form, setForm] = useState({
    name: "",
    price: "",
    description: "",
    category: "",
    brand: "",
    quantity: "",
    sku: "",
    compatibility: "",
    images: [],
  });
  const [errors, setErrors] = useState({});
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  const imageInputRef = useRef(null);

  // Validation rules (like your JS version)
  const validators = useMemo(
    () => ({
      name: (v) => (!v ? "Product Name required" : ""),
      category: (v) => (!v ? "Category required" : ""),
      brand: (v) => (!v ? "Brand required" : ""),
      description: (v) => (!v ? "Description required" : ""),
      sku: (v) =>
        v && v.length === 6 ? "" : "SKU must be exactly 6 characters",
      price: (v) => (/^\d+(\.\d{1,2})?$/.test(v) ? "" : "Invalid price format"),
      quantity: (v) =>
        String(parseInt(v, 10)) === String(v) ? "" : "Quantity must be integer",
      images: (v) =>
        v && v.length > 0 ? "" : "At least one product image required",
    }),
    [],
  );

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validateForm = () => {
    const newErrors = {};
    const data = { ...form };

    data.name = data.name.trim().toUpperCase();
    data.category = data.category.trim().toUpperCase();

    for (const [key, fn] of Object.entries(validators)) {
      const msg = fn(data[key] ?? "");
      if (msg) newErrors[key] = msg;
    }
    setForm(data);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Fetch products from backend
  async function loadProducts() {
    setLoading(true);
    try {
      const res = await fetch("/seller/api/products", {
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      if (!data.success)
        throw new Error(data.message || "Failed to load products");
      setProducts(data.products || []);
    } catch (err) {
      console.error(err);
      setStatus("Failed to load products");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  // Filter products by status
  const filteredProducts = useMemo(() => {
    if (activeTab === "all") return products;
    return products.filter((p) => p.status === activeTab);
  }, [products, activeTab]);

  // Count products by status
  const statusCounts = useMemo(
    () => ({
      all: products.length,
      pending: products.filter((p) => p.status === "pending").length,
      approved: products.filter((p) => p.status === "approved").length,
      rejected: products.filter((p) => p.status === "rejected").length,
    }),
    [products],
  );

  // Add Product
  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) {
      setStatus("Please correct highlighted errors.");
      return;
    }

    try {
      setStatus("Adding product...");
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === "images" && v && v.length > 0) {
          v.forEach((file) => formData.append("images", file));
        } else if (k !== "images") {
          formData.append(k, v ?? "");
        }
      });

      const res = await fetch("/seller/add-product", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          const data = await res.json();
          throw new Error(data.message || "Failed to add product");
        }
        throw new Error("Failed to add product");
      }
      setStatus("Product added successfully!");
      setForm({
        name: "",
        price: "",
        description: "",
        category: "",
        brand: "",
        quantity: "",
        sku: "",
        compatibility: "",
        images: [],
      });
      if (imageInputRef.current) imageInputRef.current.value = "";
      loadProducts();
    } catch (err) {
      console.error(err);
      setStatus("Failed to add product.");
    }
  }

  // Delete product
  async function handleDelete(id) {
    if (!window.confirm("Delete this product?")) return;
    try {
      const res = await fetch(`/seller/delete-product/${id}`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      // Server currently redirects after delete; handle both JSON and redirect/HTML responses
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const data = await res.json();
        if (!data.success) throw new Error(data.message || "Delete failed");
      } else if (!res.ok) {
        throw new Error("Delete failed");
      }
      await loadProducts();
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to delete product.");
    }
  }

  return (
    <div className="seller-page">
      <SellerNav />

      <main className="seller-main">
        <h1 className="seller-title">Product Management</h1>
        <p className="seller-subtitle">Add, manage, and track your products</p>

        <a
          href="/Seller/bulk-upload"
          className="seller-btn seller-btn-secondary seller-mb-3"
          style={{ display: "inline-block" }}
        >
          Bulk Upload Products
        </a>

        {/* Product Form */}
        <div className="seller-card seller-mb-3">
          <div className="seller-card-header">
            <h2 className="seller-card-title">📦 Add New Product</h2>
          </div>
          <form
            onSubmit={handleSubmit}
            encType="multipart/form-data"
            className="seller-card-body"
          >
            <div className="seller-form-grid">
              {[
                { label: "Product Name", key: "name", type: "text" },
                {
                  label: "Product Price (₹)",
                  key: "price",
                  type: "number",
                  step: "0.01",
                },
                { label: "Product Category", key: "category", type: "text" },
                { label: "Product Brand", key: "brand", type: "text" },
                { label: "Product Quantity", key: "quantity", type: "number" },
                {
                  label: "Product SKU",
                  key: "sku",
                  type: "text",
                  maxLength: 6,
                },
                { label: "Compatibility", key: "compatibility", type: "text" },
              ].map((f) => (
                <div className="seller-form-group" key={f.key}>
                  <label className="seller-label" htmlFor={f.key}>
                    {f.label}
                  </label>
                  <input
                    className="seller-input"
                    id={f.key}
                    type={f.type}
                    step={f.step}
                    maxLength={f.maxLength}
                    value={form[f.key]}
                    onChange={(e) => setField(f.key, e.target.value)}
                  />
                  {errors[f.key] && (
                    <small className="seller-error-text">{errors[f.key]}</small>
                  )}
                </div>
              ))}
            </div>

            <div className="seller-form-group seller-mt-2">
              <label className="seller-label" htmlFor="description">
                Product Description
              </label>
              <textarea
                className="seller-input"
                id="description"
                rows={3}
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                style={{ resize: "vertical" }}
              />
              {errors.description && (
                <small className="seller-error-text">
                  {errors.description}
                </small>
              )}
            </div>

            <div className="seller-form-group seller-mt-2">
              <label className="seller-label" htmlFor="productImage">
                Product Images (up to 5)
              </label>
              <input
                className="seller-input"
                id="productImage"
                type="file"
                accept="image/*"
                multiple
                ref={imageInputRef}
                onChange={(e) => {
                  const files = Array.from(e.target.files || []).slice(0, 5);
                  setField("images", files);
                }}
                style={{ padding: 10 }}
              />
              {form.images && form.images.length > 0 && (
                <div className="seller-text-sm seller-text-muted seller-mt-1">
                  {form.images.length} image(s) selected
                </div>
              )}
              {errors.images && (
                <small className="seller-error-text">{errors.images}</small>
              )}
            </div>

            <div className="seller-flex seller-items-center seller-gap-2 seller-mt-2">
              <button type="submit" className="seller-btn seller-btn-primary">
                Add Product
              </button>
              {status && (
                <span
                  style={{ color: "var(--seller-primary)", fontWeight: 500 }}
                >
                  {status}
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Product List */}
        <div className="seller-card">
          <div className="seller-card-header">
            <h2 className="seller-card-title">📊 Product List</h2>
          </div>
          <div className="seller-card-body">
            {/* Status Tabs */}
            <div className="seller-tabs seller-mb-3">
              {[
                { key: "all", label: "All Products" },
                { key: "pending", label: "On Hold" },
                { key: "approved", label: "Accepted" },
                { key: "rejected", label: "Rejected" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  className={`seller-tab${activeTab === tab.key ? " active" : ""}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label} ({statusCounts[tab.key]})
                </button>
              ))}
            </div>

            {loading ? (
              <div className="seller-loading">
                <div className="seller-spinner" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="seller-empty">
                <p>
                  {activeTab === "all"
                    ? "No products found."
                    : `No ${activeTab === "pending" ? "on hold" : activeTab} products.`}
                </p>
              </div>
            ) : (
              <div className="seller-product-grid">
                {filteredProducts.map((p) => (
                  <div className="seller-product-card" key={p._id}>
                    {/* Status Badge */}
                    <span
                      className={`seller-product-badge seller-product-badge-${p.status === "approved" ? "accepted" : p.status === "rejected" ? "rejected" : "pending"}`}
                    >
                      {p.status === "pending"
                        ? "On Hold"
                        : p.status === "approved"
                          ? "Accepted"
                          : "Rejected"}
                    </span>

                    {p.image && (
                      <img
                        src={p.image}
                        alt={p.name}
                        className="seller-product-image"
                      />
                    )}

                    <div className="seller-product-info">
                      <h3 className="seller-product-name">{p.name}</h3>
                      <p className="seller-product-price">₹{p.price}</p>
                      <p className="seller-product-meta">
                        <strong>Category:</strong> {p.category}
                      </p>
                      <p className="seller-product-meta">
                        <strong>Brand:</strong> {p.brand}
                      </p>
                      <p className="seller-product-meta">
                        <strong>Quantity:</strong> {p.quantity}
                      </p>
                      <p className="seller-product-meta">
                        <strong>SKU:</strong> {p.sku}
                      </p>
                      <p className="seller-product-meta seller-text-sm seller-text-muted">
                        {p.description}
                      </p>
                    </div>

                    <div style={{ padding: "0 20px 20px" }}>
                      <button
                        className="seller-btn seller-btn-danger seller-w-full"
                        onClick={() => handleDelete(p._id)}
                      >
                        Delete Product
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <SellerFooter />
    </div>
  );
}
