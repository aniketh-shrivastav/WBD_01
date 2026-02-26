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

function Stars({ rating }) {
  const full = Math.floor(rating || 0);
  const half = (rating || 0) % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <div className="rating">
      {Array.from({ length: full }).map((_, i) => (
        <i key={`f${i}`} className="fas fa-star" />
      ))}
      {half ? <i className="fas fa-star-half-alt" /> : null}
      {Array.from({ length: empty }).map((_, i) => (
        <i key={`e${i}`} className="far fa-star" />
      ))}
      <span className="rating-value">{Number(rating || 0).toFixed(1)}</span>
    </div>
  );
}

export default function Reviews() {
  useLink("/styles/reviews.css");
  useLink(
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css"
  );

  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    <>
      <nav className="navbar">
        <div className="logo-brand">
          <img src="/images3/logo2.jpg" alt="Logo" className="logo" />
          <span className="brand">AutoCustomizer</span>
        </div>
        <a
          href="#"
          className="menu-btn"
          onClick={(e) => {
            e.preventDefault();
            setSidebarOpen((s) => !s);
          }}
        >
          ☰
        </a>
        <div className="nav-links" id="navLinks">
          <a href="/service/dashboard">Dashboard</a>
          <a href="/service/profileSettings">Profile Settings</a>
          <a href="/service/bookingManagement">Booking Management</a>
          <a href="/service/reviews" className="active">
            Reviews & Ratings
          </a>
          <a href="/logout">Logout</a>
        </div>
      </nav>

      <div className={`sidebar ${sidebarOpen ? "active" : ""}`} id="sidebar">
        <a className="close-btn" onClick={() => setSidebarOpen(false)}>
          Close ×
        </a>
        <a href="/service/dashboard">
          <i className="fas fa-tachometer-alt" />
        </a>
        <a href="/service/profileSettings">
          <i className="fas fa-user-cog" />
        </a>
        <a href="/service/bookingManagement">
          <i className="fas fa-calendar-alt" />
        </a>
        <a href="/service/customerCommunication">
          <i className="fas fa-comments" />
        </a>
        <a href="/service/earnings">
          <i className="fas fa-money-bill-wave" />
        </a>
        <a href="/service/reviews" className="active">
          <i className="fas fa-star" />
        </a>
      </div>

      <div className="container">
        <h1>Reviews & Ratings</h1>
        <div className="reviews-container">
          {loading ? (
            <p style={{ textAlign: "center" }}>Loading...</p>
          ) : error ? (
            <p style={{ textAlign: "center", color: "#e74c3c" }}>{error}</p>
          ) : reviews.length === 0 ? (
            <p style={{ textAlign: "center", color: "#555" }}>
              No reviews yet.
            </p>
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
    </>
  );
}
