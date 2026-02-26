import React, { useEffect, useState } from "react";

function useLink(href) {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, [href]);
}

export default function SellerReviews() {
  useLink("/Css/CStyle.css");
  useLink("/newstyle.css");
  useLink("/Css/sellerBase.css");
  useLink("/styles/reviews.css");

  const [reviews, setReviews] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/seller/api/reviews", {
          headers: { Accept: "application/json" },
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to load reviews");
        const j = await res.json();
        if (!j.success) throw new Error(j.message || "Failed to load reviews");
        if (!cancelled) {
          setReviews(j.reviews || []);
          setSummaries(j.summaries || []);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load reviews");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

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
            <a href="/seller/productmanagement">Products</a>
          </li>
          <li>
            <a href="/seller/orders">Orders</a>
          </li>
          <li>
            <a href="/seller/reviews" className="active">
              Reviews
            </a>
          </li>
          <li>
            <a href="/logout">Logout</a>
          </li>
        </ul>
      </nav>

      <header>
        <h1>Product Reviews</h1>
      </header>

      <div className="container" style={{ paddingBottom: 32 }}>
        {loading && <p>Loading reviews...</p>}
        {error && <p style={{ color: "crimson" }}>{error}</p>}

        {!loading && !error && summaries.length === 0 && (
          <p className="no-products">No reviews yet.</p>
        )}

        {!loading && !error && summaries.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h2>Summary by Product</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 16,
              }}
            >
              {summaries.map((s) => (
                <div
                  key={s.productId}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 12,
                    background: "#fff",
                    boxShadow: "0 6px 18px rgba(15, 23, 42, 0.08)",
                  }}
                >
                  {s.productImage ? (
                    <img
                      src={s.productImage}
                      alt={s.productName}
                      style={{
                        width: "100%",
                        height: 140,
                        objectFit: "cover",
                        borderRadius: 8,
                        marginBottom: 10,
                      }}
                    />
                  ) : null}
                  <strong>{s.productName}</strong>
                  <div style={{ marginTop: 6, fontSize: 14 }}>
                    ⭐ {s.avgRating} / 5
                  </div>
                  <div style={{ color: "#6b7280", fontSize: 13 }}>
                    {s.totalReviews} review(s)
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && !error && reviews.length > 0 && (
          <div>
            <h2>All Reviews</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 16,
              }}
            >
              {reviews.map((r) => (
                <div
                  key={r._id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 14,
                    background: "#fff",
                    boxShadow: "0 6px 18px rgba(15, 23, 42, 0.08)",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>
                    {r.productId?.name || "Product"}
                  </div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    by {r.userId?.name || "Customer"}
                  </div>
                  <div style={{ marginTop: 8 }}>⭐ {r.rating} / 5</div>
                  {r.review ? (
                    <p style={{ marginTop: 8 }}>{r.review}</p>
                  ) : (
                    <p style={{ marginTop: 8, color: "#6b7280" }}>
                      No review text.
                    </p>
                  )}
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>
                    {r.createdAt
                      ? new Date(r.createdAt).toLocaleDateString()
                      : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="seller-footer">
        <p>© 2025 AutoCustomizer | All Rights Reserved</p>
      </footer>
    </div>
  );
}
