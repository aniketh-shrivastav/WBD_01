import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CustomerNav from "../../components/CustomerNav";
import CustomerFooter from "../../components/CustomerFooter";
import "../../Css/customer.css";
import "../../Css/productDetails.css";

function useLink(href) {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, [href]);
}

// Star Rating Component for selecting rating
function StarRatingInput({ rating, onChange }) {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="pd-star-input">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHoverRating(star)}
          onMouseLeave={() => setHoverRating(0)}
          className={`pd-star ${star <= (hoverRating || rating) ? "active" : ""}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

// Star Rating Display Component
function StarRatingDisplay({ rating }) {
  return (
    <span className="pd-star-display">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= rating ? "filled" : ""}>
          {star <= rating ? "★" : "☆"}
        </span>
      ))}
    </span>
  );
}

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  useLink("/styles/styles.css");
  useLink(
    "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css",
  );

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [ratingSummary, setRatingSummary] = useState({
    avgRating: 0,
    totalReviews: 0,
  });
  const [canReview, setCanReview] = useState(false);
  const [userReview, setUserReview] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, review: "" });
  const [reviewStatus, setReviewStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Image carousel state
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHoveringImage, setIsHoveringImage] = useState(false);
  const [showFullScreen, setShowFullScreen] = useState(false);

  // Get all images (use images array if available, fallback to single image)
  const productImages =
    product?.images?.length > 0
      ? product.images.map((img) => img.url || img)
      : [product?.image || "/images/placeholder.jpg"];

  const nextImage = (e) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % productImages.length);
  };

  const prevImage = (e) => {
    e?.stopPropagation();
    setCurrentImageIndex(
      (prev) => (prev - 1 + productImages.length) % productImages.length,
    );
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`/customer/product/${id}`, {
          headers: { Accept: "application/json" },
          credentials: "include",
        });
        if (res.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        if (!res.ok) throw new Error("Failed to load product details");
        const j = await res.json();
        if (!cancelled) {
          setProduct(j.product || null);
          setReviews(j.reviews || []);
          setRatingSummary(
            j.ratingSummary || { avgRating: 0, totalReviews: 0 },
          );
          setCanReview(Boolean(j.canReview));
          setUserReview(j.userReview || null);
          if (j.userReview) {
            setReviewForm({
              rating: j.userReview.rating || 5,
              review: j.userReview.review || "",
            });
          }
        }
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load product");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, navigate]);

  const submitReview = async (e) => {
    e.preventDefault();
    setReviewStatus("");
    try {
      const res = await fetch(`/customer/product/${id}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          rating: reviewForm.rating,
          review: reviewForm.review,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.success) {
        throw new Error(j.message || "Failed to submit review");
      }

      // Refresh product details to show updated review list
      const refresh = await fetch(`/customer/product/${id}`, {
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      const refreshed = await refresh.json();
      setProduct(refreshed.product || null);
      setReviews(refreshed.reviews || []);
      setRatingSummary(
        refreshed.ratingSummary || { avgRating: 0, totalReviews: 0 },
      );
      setCanReview(Boolean(refreshed.canReview));
      setUserReview(refreshed.userReview || null);
      setReviewStatus("Review saved successfully.");
    } catch (err) {
      setReviewStatus(err.message || "Failed to submit review");
    }
  };

  return (
    <>
      <CustomerNav />

      <div className="pd-page">
        <div className="pd-container">
          {/* Breadcrumb */}
          <div className="pd-breadcrumb">
            <a href="/customer/index">Products</a>
            <span className="separator">›</span>
            <span>{product?.name || "Loading..."}</span>
          </div>

          {loading && (
            <div className="pd-loading">
              <div className="pd-loading-spinner"></div>
              <p>Loading product details...</p>
            </div>
          )}

          {error && <div className="pd-error">⚠️ {error}</div>}

          {!loading && !error && product && (
            <div className="pd-main-grid">
              {/* Image Gallery */}
              <div className="pd-gallery-card">
                <div
                  className="pd-main-image-container"
                  onMouseEnter={() => setIsHoveringImage(true)}
                  onMouseLeave={() => setIsHoveringImage(false)}
                >
                  <img
                    src={productImages[currentImageIndex]}
                    alt={product.name || "Product"}
                    onClick={() => setShowFullScreen(true)}
                    className="pd-main-image"
                  />

                  {productImages.length > 1 && (
                    <>
                      <button onClick={prevImage} className="pd-nav-btn prev">
                        ‹
                      </button>
                      <button onClick={nextImage} className="pd-nav-btn next">
                        ›
                      </button>
                    </>
                  )}
                </div>

                {/* Thumbnail Strip */}
                {productImages.length > 1 && (
                  <div className="pd-thumbnails">
                    {productImages.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`${product.name} - ${idx + 1}`}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`pd-thumbnail ${idx === currentImageIndex ? "active" : ""}`}
                      />
                    ))}
                  </div>
                )}

                {/* Indicators */}
                {productImages.length > 1 && (
                  <div className="pd-indicators">
                    {productImages.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`pd-indicator ${idx === currentImageIndex ? "active" : ""}`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="pd-info-card">
                <h1 className="pd-product-title">{product.name}</h1>

                <div className="pd-rating-row">
                  <div className="pd-rating-stars">
                    <StarRatingDisplay
                      rating={Math.round(ratingSummary.avgRating)}
                    />
                  </div>
                  <span className="pd-rating-text">
                    <strong>{ratingSummary.avgRating.toFixed(1)}</strong> / 5 (
                    {ratingSummary.totalReviews} reviews)
                  </span>
                </div>

                <div className="pd-price-section">
                  <div className="pd-price">
                    <span className="pd-price-symbol">₹</span>
                    {product.price?.toLocaleString()}
                  </div>
                  <div className="pd-price-label">Inclusive of all taxes</div>
                </div>

                <div className="pd-details-grid">
                  <div className="pd-detail-item">
                    <div className="pd-detail-label">Category</div>
                    <div className="pd-detail-value">
                      {product.category || "N/A"}
                    </div>
                  </div>
                  <div className="pd-detail-item">
                    <div className="pd-detail-label">Brand</div>
                    <div className="pd-detail-value">
                      {product.brand || "N/A"}
                    </div>
                  </div>
                  <div className="pd-detail-item">
                    <div className="pd-detail-label">SKU</div>
                    <div className="pd-detail-value">
                      {product.sku || "N/A"}
                    </div>
                  </div>
                  <div className="pd-detail-item">
                    <div className="pd-detail-label">Compatibility</div>
                    <div className="pd-detail-value">
                      {product.compatibility || "Universal"}
                    </div>
                  </div>
                </div>

                {product.seller && (
                  <div className="pd-seller-badge">
                    <div className="pd-seller-icon">
                      {product.seller.name?.charAt(0).toUpperCase() || "S"}
                    </div>
                    <div className="pd-seller-info">
                      <span className="pd-seller-label">Sold by</span>
                      <span className="pd-seller-name">
                        {product.seller.name}
                      </span>
                    </div>
                  </div>
                )}

                <div className="pd-description">{product.description}</div>

                <div className="pd-actions">
                  <button
                    type="button"
                    className="pd-btn pd-btn-secondary"
                    onClick={() => navigate("/customer/index")}
                  >
                    ← Back to Products
                  </button>
                </div>
              </div>

              {/* Reviews Section */}
              <div className="pd-reviews-card">
                <div className="pd-reviews-header">
                  <h3 className="pd-reviews-title">
                    <span className="pd-reviews-title-icon">⭐</span>
                    Reviews
                  </h3>
                  <span className="pd-avg-rating">
                    {ratingSummary.avgRating.toFixed(1)} / 5
                  </span>
                </div>

                {reviews.length === 0 ? (
                  <div className="pd-no-reviews">
                    <div className="pd-no-reviews-icon">💬</div>
                    <p>No reviews yet. Be the first to review!</p>
                  </div>
                ) : (
                  <div className="pd-reviews-list">
                    {reviews.slice(0, 3).map((r) => (
                      <div key={r._id} className="pd-review-item">
                        <div className="pd-review-header">
                          <div className="pd-reviewer-info">
                            <div className="pd-reviewer-avatar">
                              {(r.userId?.name || "C").charAt(0).toUpperCase()}
                            </div>
                            <span className="pd-reviewer-name">
                              {r.userId?.name || "Customer"}
                            </span>
                          </div>
                          {r.verifiedPurchase && (
                            <span className="pd-verified-badge">Verified</span>
                          )}
                        </div>
                        <StarRatingDisplay rating={r.rating} />
                        {r.review ? (
                          <p className="pd-review-text">{r.review}</p>
                        ) : (
                          <p className="pd-no-review-text">No review text.</p>
                        )}
                      </div>
                    ))}
                    {reviews.length > 3 && (
                      <div className="pd-more-reviews">
                        Showing latest 3 of {reviews.length} reviews
                      </div>
                    )}
                  </div>
                )}

                {canReview && (
                  <div className="pd-review-form">
                    <h4 className="pd-review-form-title">
                      {userReview ? "Update Your Review" : "Write a Review"}
                    </h4>
                    <form onSubmit={submitReview}>
                      <div className="pd-form-group">
                        <label className="pd-form-label">Your Rating</label>
                        <StarRatingInput
                          rating={reviewForm.rating}
                          onChange={(value) =>
                            setReviewForm((prev) => ({
                              ...prev,
                              rating: value,
                            }))
                          }
                        />
                      </div>
                      <div className="pd-form-group">
                        <label className="pd-form-label">Your Review</label>
                        <textarea
                          className="pd-form-textarea"
                          rows={3}
                          placeholder="Share your experience with this product..."
                          value={reviewForm.review}
                          onChange={(e) =>
                            setReviewForm((prev) => ({
                              ...prev,
                              review: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <button type="submit" className="pd-submit-btn">
                        {userReview ? "Update Review" : "Submit Review"}
                      </button>
                      {reviewStatus && (
                        <div
                          className={`pd-review-status ${reviewStatus.includes("success") ? "success" : ""}`}
                        >
                          {reviewStatus}
                        </div>
                      )}
                    </form>
                  </div>
                )}

                {!canReview && userReview && (
                  <div className="pd-your-review">
                    <h4 className="pd-your-review-title">Your Review</h4>
                    <StarRatingDisplay rating={userReview.rating} />
                    <p className="pd-review-text">{userReview.review}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <CustomerFooter />

      {/* Full Screen Image Modal */}
      {showFullScreen && (
        <div
          className="pd-fullscreen-modal"
          onClick={() => setShowFullScreen(false)}
        >
          <button
            className="pd-fullscreen-close"
            onClick={() => setShowFullScreen(false)}
          >
            ×
          </button>

          {productImages.length > 1 && (
            <>
              <button onClick={prevImage} className="pd-fullscreen-nav prev">
                ‹
              </button>
              <button onClick={nextImage} className="pd-fullscreen-nav next">
                ›
              </button>
            </>
          )}

          <img
            src={productImages[currentImageIndex]}
            alt={product?.name || "Product"}
            onClick={(e) => e.stopPropagation()}
            className="pd-fullscreen-image"
          />

          {productImages.length > 1 && (
            <div className="pd-fullscreen-indicators">
              {productImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(idx);
                  }}
                  className={`pd-fullscreen-indicator ${idx === currentImageIndex ? "active" : ""}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
