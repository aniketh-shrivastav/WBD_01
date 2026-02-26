import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CustomerNav from "../../components/CustomerNav";
import CustomerFooter from "../../components/CustomerFooter";
import "../../Css/customer.css";

function useLink(href) {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, [href]);
}

export default function CustomerIndex() {
  function backendBase() {
    const { protocol, hostname, port } = window.location;
    if (port === "5173") return `${protocol}//${hostname}:3000`;
    return ""; // same origin in production
  }
  function handleLogout(e) {
    e.preventDefault();
    const next = encodeURIComponent(`${window.location.origin}/`);
    window.location.href = `${backendBase()}/logout?next=${next}`;
  }
  // Load same CSS as static page (styles.css) and Bootstrap CDN
  useLink("/styles/styles.css");
  useLink(
    "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css",
  );

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/customer/api/index", {
          headers: { Accept: "application/json" },
        });
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!res.ok) throw new Error("Failed to load products");
        const j = await res.json();
        if (!cancelled)
          setProducts(Array.isArray(j.products) ? j.products : []);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load products");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set();
    (products || []).forEach((p) => {
      const c = (p.category || "").trim();
      if (c) set.add(c);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const filtered = useMemo(() => {
    const q = term.toLowerCase().trim();
    const cat = category.toLowerCase();
    return (products || []).filter((p) => {
      const name = (p.name || "").toLowerCase();
      const c = (p.category || "").toLowerCase();
      const matchesText = name.includes(q) || c.includes(q);
      const matchesCat = !cat || c === cat;
      return matchesText && matchesCat;
    });
  }, [products, term, category]);

  async function addToCart(id, button) {
    const original = button.textContent;
    button.disabled = true;
    button.textContent = "Adding...";
    try {
      const res = await fetch("/customer/cart/add", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const j = await res.json();
      if (j && j.success) {
        alert("Product added to cart successfully! 🛒");
      } else {
        alert(
          "Failed to add product: " + ((j && j.message) || "Unknown error"),
        );
      }
    } catch (e) {
      alert("Error adding product to cart. Try again.");
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  function productId(p) {
    return (p && (p._id?.$oid || p._id)) || "";
  }

  return (
    <div className="customer-page">
      <CustomerNav />

      <main className="customer-main">
        {/* Search Section */}
        <div className="customer-search-container">
          <input
            type="text"
            placeholder="Search for car parts..."
            className="customer-search-input"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
          <select
            className="customer-filter-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Info Alert */}
        <div className="customer-alert customer-alert-info">
          <div className="customer-alert-icon">🛠️</div>
          <div className="customer-alert-content">
            <div className="customer-alert-title">
              Important Instructions Before You Order
            </div>
            <ul style={{ margin: "8px 0 0 16px", lineHeight: "1.8" }}>
              <li>
                Please ensure that you <strong>update your profile</strong>{" "}
                before ordering products.
              </li>
              <li>
                If you plan to{" "}
                <strong>book a service along with a product</strong>, book the
                service first.
              </li>
            </ul>
            <p style={{ marginTop: "8px", fontWeight: "500" }}>
              Let's start customizing your car! 🚗
            </p>
          </div>
        </div>

        {/* Section Title */}
        <h1
          className="customer-title"
          style={{ marginTop: "32px", marginBottom: "24px" }}
        >
          Available Car Parts
        </h1>

        {/* Loading State */}
        {loading && (
          <div className="customer-loading">
            <div className="customer-spinner"></div>
            <div className="customer-loading-text">Loading products...</div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="customer-alert customer-alert-error">
            <div className="customer-alert-icon">⚠️</div>
            <div className="customer-alert-content">{error}</div>
          </div>
        )}

        {/* Products Grid */}
        {!loading && !error && (
          <>
            {filtered.length === 0 ? (
              <div className="customer-empty-state">
                <div className="customer-empty-icon">📦</div>
                <h3 className="customer-empty-title">No Products Found</h3>
                <p className="customer-empty-description">
                  We couldn't find any products matching your search. Try
                  adjusting your filters.
                </p>
              </div>
            ) : (
              <div className="customer-product-grid">
                {filtered.map((product) => (
                  <div
                    key={productId(product)}
                    className="customer-product-card"
                  >
                    <div className="customer-product-image-wrapper">
                      <img
                        src={product.image || "/images/placeholder.jpg"}
                        className="customer-product-image"
                        alt={product.name || "Product"}
                      />
                      {product.isNew && (
                        <span className="customer-product-badge new">New</span>
                      )}
                    </div>
                    <div className="customer-product-content">
                      {product.category && (
                        <span className="customer-product-category">
                          {product.category}
                        </span>
                      )}
                      <h3 className="customer-product-name">
                        {product.name || "Unnamed Product"}
                      </h3>
                      <div className="customer-product-price">
                        ₹{product.price || "0"}
                      </div>
                      <div className="customer-product-actions">
                        <Link
                          to={`/customer/product/${productId(product)}`}
                          className="customer-btn customer-btn-outline customer-btn-sm"
                        >
                          View Details
                        </Link>
                        <button
                          className="customer-btn customer-btn-primary customer-btn-sm"
                          style={{ flex: 1 }}
                          onClick={(e) =>
                            addToCart(productId(product), e.currentTarget)
                          }
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <CustomerFooter />
    </div>
  );
}
