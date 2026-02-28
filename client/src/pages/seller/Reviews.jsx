import React, { useEffect, useState } from "react";
import SellerNav from "../../components/SellerNav";
import SellerFooter from "../../components/SellerFooter";
import "../../Css/seller.css";

export default function SellerReviews() {
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

  function renderStars(rating) {
    return (
      <span className="seller-stars">
        {Array.from({ length: 5 }, (_, i) => (
          <svg
            key={i}
            className="seller-star-icon"
            viewBox="0 0 20 20"
            fill={i < Math.round(rating) ? "var(--seller-primary)" : "#e2e8f0"}
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.065 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.284-3.957z" />
          </svg>
        ))}
      </span>
    );
  }

  return (
    <div className="seller-page">
      <SellerNav />

      <main className="seller-main">
        <h1 className="seller-title">Product Reviews</h1>
        <p className="seller-subtitle">
          See what customers say about your products
        </p>

        {loading && (
          <div className="seller-loading">
            <div className="seller-spinner" />
          </div>
        )}
        {error && (
          <div className="seller-alert seller-alert-error">{error}</div>
        )}

        {!loading && !error && summaries.length === 0 && (
          <div className="seller-empty">
            <p>No reviews yet.</p>
          </div>
        )}

        {!loading && !error && summaries.length > 0 && (
          <div className="seller-mb-3">
            <h2 className="seller-section-title">Summary by Product</h2>
            <div className="seller-summary-grid">
              {summaries.map((s) => (
                <div className="seller-summary-card" key={s.productId}>
                  {s.productImage && (
                    <img
                      src={s.productImage}
                      alt={s.productName}
                      className="seller-summary-image"
                    />
                  )}
                  <div className="seller-summary-content">
                    <h3 className="seller-summary-name">{s.productName}</h3>
                    <div className="seller-review-rating">
                      {renderStars(s.avgRating)}
                      <span className="seller-rating-value">{s.avgRating}</span>
                      <span className="seller-rating-max">/ 5</span>
                    </div>
                    <div className="seller-review-count">
                      {s.totalReviews} review(s)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && !error && reviews.length > 0 && (
          <div>
            <h2 className="seller-section-title">All Reviews</h2>
            <div className="seller-review-grid">
              {reviews.map((r) => (
                <div className="seller-review-card" key={r._id}>
                  <div className="seller-review-header">
                    <div>
                      <div className="seller-review-product">
                        {r.productId?.name || "Product"}
                      </div>
                      <div className="seller-review-author">
                        by {r.userId?.name || "Customer"}
                      </div>
                    </div>
                    <div className="seller-review-rating">
                      {renderStars(r.rating)}
                    </div>
                  </div>
                  <div className="seller-review-body">
                    {r.review ? (
                      <p>{r.review}</p>
                    ) : (
                      <p className="seller-review-empty">No review text.</p>
                    )}
                  </div>
                  <div className="seller-review-footer">
                    {r.createdAt
                      ? new Date(r.createdAt).toLocaleDateString()
                      : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <SellerFooter />
    </div>
  );
}
