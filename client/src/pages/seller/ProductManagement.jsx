import React, { useEffect, useRef, useState, useMemo } from "react";
import "../../Css/productManagement.css";

// Utility hook to dynamically link CSS files (for compatibility with old CSS)
function useLink(href) {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, [href]);
}

export default function ProductManagement() {
  // Load external CSS
  useLink("/Css/CStyle.css");
  useLink("/newstyle.css");
  useLink("/Css/sellerBase.css");

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
            <a href="/seller/dashboard">Dashboard</a>
          </li>
          <li>
            <a href="/seller/profileSettings">Profile Settings</a>
          </li>
          <li>
            <a href="/seller/productmanagement" className="active">
              Products
            </a>
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

      <header>
        <h1>Product Management</h1>
      </header>

      <div className="container">
        <a
          href="/Seller/bulk-upload"
          className="btn-add"
          style={{ marginBottom: 20 }}
        >
          Bulk Upload Products
        </a>

        {/* Product Form */}
        <form
          className="product-form"
          onSubmit={handleSubmit}
          encType="multipart/form-data"
        >
          {[
            { label: "Product Name", key: "name", type: "text" },
            {
              label: "Product Price (₹)",
              key: "price",
              type: "number",
              step: "0.01",
            },
            {
              label: "Product Description",
              key: "description",
              type: "textarea",
            },
            { label: "Product Category", key: "category", type: "text" },
            { label: "Product Brand", key: "brand", type: "text" },
            { label: "Product Quantity", key: "quantity", type: "number" },
            { label: "Product SKU", key: "sku", type: "text", maxLength: 6 },
            { label: "Compatibility", key: "compatibility", type: "text" },
          ].map((f) => (
            <div className="form-group" key={f.key}>
              <label htmlFor={f.key}>{f.label}</label>
              {f.type === "textarea" ? (
                <textarea
                  id={f.key}
                  rows={3}
                  value={form[f.key]}
                  onChange={(e) => setField(f.key, e.target.value)}
                />
              ) : (
                <input
                  id={f.key}
                  type={f.type}
                  step={f.step}
                  maxLength={f.maxLength}
                  value={form[f.key]}
                  onChange={(e) => setField(f.key, e.target.value)}
                />
              )}
              {errors[f.key] && (
                <small style={{ color: "crimson" }}>{errors[f.key]}</small>
              )}
            </div>
          ))}

          <div className="form-group">
            <label htmlFor="productImage">Product Images (up to 5):</label>
            <input
              id="productImage"
              type="file"
              accept="image/*"
              multiple
              ref={imageInputRef}
              onChange={(e) => {
                const files = Array.from(e.target.files || []).slice(0, 5);
                setField("images", files);
              }}
            />
            {form.images && form.images.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>
                {form.images.length} image(s) selected
              </div>
            )}
            {errors.images && (
              <small style={{ color: "crimson" }}>{errors.images}</small>
            )}
          </div>

          <button type="submit" className="btn-add">
            Add Product
          </button>
          {status && (
            <p style={{ color: "#6a11cb", marginTop: 10 }}>{status}</p>
          )}
        </form>

        {/* Product List */}
        <div className="product-list">
          <h2>Product List</h2>

          {/* Status Tabs */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginBottom: "20px",
              flexWrap: "wrap",
            }}
          >
            {[
              { key: "all", label: "All Products" },
              { key: "pending", label: "On Hold" },
              { key: "approved", label: "Accepted" },
              { key: "rejected", label: "Rejected" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: activeTab === tab.key ? "600" : "400",
                  background:
                    activeTab === tab.key
                      ? tab.key === "approved"
                        ? "#10b981"
                        : tab.key === "rejected"
                          ? "#ef4444"
                          : tab.key === "pending"
                            ? "#f59e0b"
                            : "#6a11cb"
                      : "#e5e7eb",
                  color: activeTab === tab.key ? "#fff" : "#374151",
                  transition: "all 0.2s ease",
                }}
              >
                {tab.label} ({statusCounts[tab.key]})
              </button>
            ))}
          </div>

          {loading ? (
            <p>Loading products...</p>
          ) : filteredProducts.length === 0 ? (
            <p className="no-products">
              {activeTab === "all"
                ? "No products found."
                : `No ${activeTab === "pending" ? "on hold" : activeTab} products.`}
            </p>
          ) : (
            <div className="product-grid">
              {filteredProducts.map((p) => (
                <div
                  className="product-card"
                  key={p._id}
                  style={{ position: "relative" }}
                >
                  {/* Status Badge */}
                  <div
                    style={{
                      position: "absolute",
                      top: "10px",
                      right: "10px",
                      padding: "4px 12px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      background:
                        p.status === "approved"
                          ? "#10b981"
                          : p.status === "rejected"
                            ? "#ef4444"
                            : "#f59e0b",
                      color: "#fff",
                    }}
                  >
                    {p.status === "pending"
                      ? "On Hold"
                      : p.status === "approved"
                        ? "Accepted"
                        : "Rejected"}
                  </div>
                  <div className="product-details">
                    <h3>{p.name}</h3>
                    <p>
                      <strong>Price:</strong> ₹{p.price}
                    </p>
                    <p>
                      <strong>Description:</strong> {p.description}
                    </p>
                    <p>
                      <strong>Category:</strong> {p.category}
                    </p>
                    <p>
                      <strong>Brand:</strong> {p.brand}
                    </p>
                    <p>
                      <strong>Quantity:</strong> {p.quantity}
                    </p>
                    <p>
                      <strong>SKU:</strong> {p.sku}
                    </p>
                    {p.image && (
                      <img
                        src={p.image}
                        alt={p.name}
                        style={{
                          width: "100%",
                          height: 200,
                          objectFit: "cover",
                          borderRadius: 8,
                          marginBottom: 12,
                        }}
                      />
                    )}
                  </div>
                  <button
                    className="btn-delete"
                    onClick={() => handleDelete(p._id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <footer className="seller-footer">
        <p>© 2025 AutoCustomizer | All Rights Reserved</p>
      </footer>
    </div>
  );
}
