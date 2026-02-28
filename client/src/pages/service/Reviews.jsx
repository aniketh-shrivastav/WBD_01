import React, { useEffect, useState } from "react";
import ServiceNav from "../../components/ServiceNav";
import ServiceFooter from "../../components/ServiceFooter";
import "../../Css/service.css";

function useLink(href) {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, [href]);
}

function Stars({ rating }) {
  const full = Math.floor(rating || 0);
  const half = (rating || 0) % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  const d =
    "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z";
  return (
    <div className="rating">
      {Array.from({ length: full }).map((_, i) => (
        <svg key={`f${i}`} className="star-icon" viewBox="0 0 24 24">
          <path d={d} fill="#f59e0b" />
        </svg>
      ))}
      {half ? (
        <svg className="star-icon" viewBox="0 0 24 24">
          <path d={d} fill="#e2e8f0" />
          <path d={d} fill="#f59e0b" style={{ clipPath: "inset(0 50% 0 0)" }} />
        </svg>
      ) : null}
      {Array.from({ length: empty }).map((_, i) => (
        <svg key={`e${i}`} className="star-icon" viewBox="0 0 24 24">
          <path d={d} fill="#e2e8f0" />
        </svg>
      ))}
      <span className="rating-value">{Number(rating || 0).toFixed(1)}</span>
    </div>
  );
}

export default function Reviews() {
  useLink("/styles/reviews.css");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/service/api/reviews", {
          headers: { Accept: "application/json" },
        });
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        const j = await res.json();
        if (!j.success) throw new Error(j.message || "Failed to load reviews");
        if (!cancelled) setReviews(j.reviews || []);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load reviews");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="service-page">
      <ServiceNav />
      <main className="service-main">
        <div className="container">
          <h1>Reviews & Ratings</h1>
          <div className="reviews-container">
            {loading ? (
              <div className="sp-state-message">
                <div className="sp-spinner"></div>
                <p>Loading reviews...</p>
              </div>
            ) : error ? (
              <div className="sp-state-message sp-state-error">
                <p>⚠️ {error}</p>
              </div>
            ) : reviews.length === 0 ? (
              <div className="sp-state-message">
                <p>📝 No reviews yet.</p>
              </div>
            ) : (
              reviews.map((r) => (
                <div key={r.id} className="review-card">
                  <div className="review-header">
                    <div className="user-info">
                      <span className="user-name">{r.customerName}</span>
                      <Stars rating={r.rating} />
                    </div>
                  </div>
                  <p className="review-text">"{r.reviewText}"</p>
                  <span className="review-date">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
      <ServiceFooter />
    </div>
  );
}
