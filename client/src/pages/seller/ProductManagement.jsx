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
  const [stockProductId, setStockProductId] = useState(null);
  const [stockAmount, setStockAmount] = useState("");
  const [stockError, setStockError] = useState("");
  const [stockLoading, setStockLoading] = useState(false);

  // Edit product state
  const [editProduct, setEditProduct] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editImages, setEditImages] = useState([]);
  const [editErrors, setEditErrors] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const editImageRef = useRef(null);

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

  // Add Stock
  function openStockModal(id) {
    setStockProductId(id);
    setStockAmount("");
    setStockError("");
  }

  async function handleAddStock() {
    const qty = Number(stockAmount);
    if (!Number.isInteger(qty) || qty < 1) {
      setStockError("Enter a positive whole number");
      return;
    }
    setStockLoading(true);
    try {
      const res = await fetch(`/seller/update-stock/${stockProductId}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ quantity: qty }),
      });
      const data = await res.json();
      if (!data.success)
        throw new Error(data.message || "Failed to update stock");
      setStockProductId(null);
      await loadProducts();
    } catch (err) {
      console.error(err);
      setStockError(err?.message || "Failed to update stock");
    } finally {
      setStockLoading(false);
    }
  }

  // Open edit modal
  function openEditModal(product) {
    setEditProduct(product);
    setEditForm({
      name: product.name || "",
      price: String(product.price ?? ""),
      description: product.description || "",
      category: product.category || "",
      brand: product.brand || "",
      quantity: String(product.quantity ?? ""),
      sku: product.sku || "",
      compatibility: product.compatibility || "",
    });
    setEditImages([]);
    setEditErrors({});
    setEditLoading(false);
  }

  function setEditField(key, value) {
    setEditForm((prev) => ({ ...prev, [key]: value }));
    setEditErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validateEditForm() {
    const errs = {};
    const d = { ...editForm };
    if (!d.name?.trim()) errs.name = "Product Name required";
    if (!d.category?.trim()) errs.category = "Category required";
    if (!d.brand?.trim()) errs.brand = "Brand required";
    if (!d.description?.trim()) errs.description = "Description required";
    if (d.sku && d.sku.length !== 6)
      errs.sku = "SKU must be exactly 6 characters";
    if (!/^\d+(\.\d{1,2})?$/.test(d.price)) errs.price = "Invalid price format";
    if (String(parseInt(d.quantity, 10)) !== String(d.quantity))
      errs.quantity = "Quantity must be integer";
    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleEditSubmit() {
    if (!validateEditForm()) return;
    setEditLoading(true);
    try {
      const formData = new FormData();
      Object.entries(editForm).forEach(([k, v]) => {
        formData.append(k, v ?? "");
      });
      if (editImages.length > 0) {
        editImages.forEach((file) => formData.append("images", file));
      }
      const res = await fetch(`/seller/edit-product/${editProduct._id}`, {
        method: "PUT",
        body: formData,
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!data.success)
        throw new Error(data.message || "Failed to update product");
      setEditProduct(null);
      setStatus("Product updated successfully!");
      await loadProducts();
    } catch (err) {
      console.error(err);
      setEditErrors((prev) => ({
        ...prev,
        _form: err?.message || "Failed to update product",
      }));
    } finally {
      setEditLoading(false);
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

                    <div
                      style={{
                        padding: "0 20px 20px",
                        display: "flex",
                        gap: "8px",
                      }}
                    >
                      <button
                        className="seller-btn seller-btn-secondary"
                        style={{ flex: 1 }}
                        onClick={() => openEditModal(p)}
                      >
                        Edit
                      </button>
                      <button
                        className="seller-btn seller-btn-primary"
                        style={{ flex: 1 }}
                        onClick={() => openStockModal(p._id)}
                      >
                        Add Stock
                      </button>
                      <button
                        className="seller-btn seller-btn-danger"
                        style={{ flex: 1 }}
                        onClick={() => handleDelete(p._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add Stock Modal */}
        {stockProductId && (
          <div
            className="seller-modal-overlay"
            onClick={() => setStockProductId(null)}
          >
            <div
              className="seller-card"
              style={{ maxWidth: 400, width: "90%", margin: "auto" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="seller-card-header">
                <h2 className="seller-card-title">📦 Add Stock</h2>
              </div>
              <div className="seller-card-body">
                <div className="seller-form-group">
                  <label className="seller-label">Quantity to Add</label>
                  <input
                    className="seller-input"
                    type="number"
                    min="1"
                    value={stockAmount}
                    onChange={(e) => {
                      setStockAmount(e.target.value);
                      setStockError("");
                    }}
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleAddStock()}
                  />
                  {stockError && (
                    <small className="seller-error-text">{stockError}</small>
                  )}
                </div>
                <div className="seller-flex seller-gap-2 seller-mt-2">
                  <button
                    className="seller-btn seller-btn-primary"
                    onClick={handleAddStock}
                    disabled={stockLoading}
                  >
                    {stockLoading ? "Updating..." : "Confirm"}
                  </button>
                  <button
                    className="seller-btn seller-btn-secondary"
                    onClick={() => setStockProductId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Product Modal */}
        {editProduct && (
          <div
            className="seller-modal-overlay"
            onClick={() => setEditProduct(null)}
          >
            <div
              className="seller-card"
              style={{
                maxWidth: 600,
                width: "95%",
                margin: "auto",
                maxHeight: "90vh",
                overflowY: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="seller-card-header">
                <h2 className="seller-card-title">✏️ Edit Product</h2>
              </div>
              <div className="seller-card-body">
                {editErrors._form && (
                  <div
                    className="seller-alert seller-alert-error seller-mb-2"
                    style={{ marginBottom: 12 }}
                  >
                    {editErrors._form}
                  </div>
                )}
                <div className="seller-form-grid">
                  {[
                    { label: "Product Name", key: "name", type: "text" },
                    {
                      label: "Product Price (₹)",
                      key: "price",
                      type: "number",
                      step: "0.01",
                    },
                    {
                      label: "Product Category",
                      key: "category",
                      type: "text",
                    },
                    { label: "Product Brand", key: "brand", type: "text" },
                    {
                      label: "Product Quantity",
                      key: "quantity",
                      type: "number",
                    },
                    {
                      label: "Product SKU",
                      key: "sku",
                      type: "text",
                      maxLength: 6,
                    },
                    {
                      label: "Compatibility",
                      key: "compatibility",
                      type: "text",
                    },
                  ].map((f) => (
                    <div className="seller-form-group" key={f.key}>
                      <label className="seller-label" htmlFor={`edit-${f.key}`}>
                        {f.label}
                      </label>
                      <input
                        className="seller-input"
                        id={`edit-${f.key}`}
                        type={f.type}
                        step={f.step}
                        maxLength={f.maxLength}
                        value={editForm[f.key] || ""}
                        onChange={(e) => setEditField(f.key, e.target.value)}
                      />
                      {editErrors[f.key] && (
                        <small className="seller-error-text">
                          {editErrors[f.key]}
                        </small>
                      )}
                    </div>
                  ))}
                </div>

                <div className="seller-form-group seller-mt-2">
                  <label className="seller-label" htmlFor="edit-description">
                    Product Description
                  </label>
                  <textarea
                    className="seller-input"
                    id="edit-description"
                    rows={3}
                    value={editForm.description || ""}
                    onChange={(e) =>
                      setEditField("description", e.target.value)
                    }
                    style={{ resize: "vertical" }}
                  />
                  {editErrors.description && (
                    <small className="seller-error-text">
                      {editErrors.description}
                    </small>
                  )}
                </div>

                <div className="seller-form-group seller-mt-2">
                  <label className="seller-label" htmlFor="edit-images">
                    Replace Images (optional, up to 5)
                  </label>
                  <input
                    className="seller-input"
                    id="edit-images"
                    type="file"
                    accept="image/*"
                    multiple
                    ref={editImageRef}
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []).slice(
                        0,
                        5,
                      );
                      setEditImages(files);
                    }}
                    style={{ padding: 10 }}
                  />
                  {editImages.length > 0 && (
                    <div className="seller-text-sm seller-text-muted seller-mt-1">
                      {editImages.length} new image(s) selected
                    </div>
                  )}
                </div>

                <p
                  style={{
                    fontSize: 12,
                    color: "#6b7280",
                    marginTop: 8,
                  }}
                >
                  Note: Editing a product will reset its status to "On Hold" for
                  re-approval.
                </p>

                <div className="seller-flex seller-gap-2 seller-mt-2">
                  <button
                    className="seller-btn seller-btn-primary"
                    onClick={handleEditSubmit}
                    disabled={editLoading}
                  >
                    {editLoading ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    className="seller-btn seller-btn-secondary"
                    onClick={() => setEditProduct(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <SellerFooter />
    </div>
  );
}
