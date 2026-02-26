import React, { useEffect, useMemo, useState } from "react";
import CustomerNav from "../../components/CustomerNav";
import CustomerFooter from "../../components/CustomerFooter";
import "../../Css/customer.css";
import "../../Css/booking.css";

function useLink(href) {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, [href]);
}

export default function CustomerBooking() {
  // Match legacy CSS
  useLink("/styles/styles.css");
  function backendBase() {
    const { protocol, hostname, port } = window.location;
    if (port === "5173") return `${protocol}//${hostname}:3000`;
    return "";
  }
  function handleLogout(e) {
    e.preventDefault();
    const next = encodeURIComponent(`${window.location.origin}/`);
    window.location.href = `${backendBase()}/logout?next=${next}`;
  }

  const [uniqueDistricts, setUniqueDistricts] = useState([]);
  const [providers, setProviders] = useState([]);
  const [serviceCostMap, setServiceCostMap] = useState({});
  const [ratingsMap, setRatingsMap] = useState({});
  const [providerReviews, setProviderReviews] = useState([]);
  const [providerReviewsLoading, setProviderReviewsLoading] = useState(false);
  const [providerReviewsError, setProviderReviewsError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form state
  const [district, setDistrict] = useState("");
  const [providerId, setProviderId] = useState("");
  const [services, setServices] = useState([]); // selected
  const [date, setDate] = useState("");
  const [carModel, setCarModel] = useState("");
  const [phone, setPhone] = useState("");
  const [carYear, setCarYear] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");

  // Car Painting selection
  const [paintColor, setPaintColor] = useState("");

  // Validation errors
  const [errors, setErrors] = useState({});

  // Summary visibility
  const [showSummary, setShowSummary] = useState(false);

  // Min date = today + 7 days
  const minDate = useMemo(() => {
    const t = new Date();
    t.setDate(t.getDate() + 7);
    return t.toISOString().split("T")[0];
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch("/customer/api/booking", {
          headers: { Accept: "application/json" },
        });
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!res.ok) throw new Error("Failed to load booking data");
        const j = await res.json();
        if (cancelled) return;
        setProviders(j.serviceProviders || []);
        setUniqueDistricts(
          (j.uniqueDistricts || []).sort((a, b) => a.localeCompare(b)),
        );
        setServiceCostMap(j.serviceCostMap || {});
        setRatingsMap(j.ratingsMap || {});
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load booking data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const providersForDistrict = useMemo(() => {
    return providers.filter((p) => p.district === district);
  }, [providers, district]);

  const provider = useMemo(
    () => providers.find((p) => String(p._id) === String(providerId)),
    [providers, providerId],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadProviderReviews() {
      if (!providerId) {
        setProviderReviews([]);
        setProviderReviewsError("");
        return;
      }
      try {
        setProviderReviewsLoading(true);
        setProviderReviewsError("");
        const res = await fetch(
          `/customer/api/provider/${providerId}/reviews`,
          {
            headers: { Accept: "application/json" },
            credentials: "include",
          },
        );
        if (!res.ok) throw new Error("Failed to load provider reviews");
        const j = await res.json();
        if (!j.success) throw new Error(j.message || "Failed to load reviews");
        if (!cancelled) setProviderReviews(j.reviews || []);
      } catch (e) {
        if (!cancelled)
          setProviderReviewsError(e.message || "Failed to load reviews");
      } finally {
        if (!cancelled) setProviderReviewsLoading(false);
      }
    }
    loadProviderReviews();
    return () => {
      cancelled = true;
    };
  }, [providerId]);

  const offeredServices = useMemo(() => {
    return provider?.servicesOffered?.map((s) => s.name) || [];
  }, [provider]);

  const isCarPaintingSelected = useMemo(() => {
    return (services || []).some((s) => {
      const name = String(s || "").toLowerCase();
      return (
        name.includes("car") &&
        (name.includes("paint") || name.includes("painting"))
      );
    });
  }, [services]);

  const providerPaintColors = useMemo(() => {
    const list = Array.isArray(provider?.paintColors)
      ? provider.paintColors
      : [];
    return list
      .map((c) =>
        String(c || "")
          .trim()
          .toLowerCase(),
      )
      .filter((c) => /^#[0-9a-f]{6}$/.test(c))
      .slice(0, 24);
  }, [provider]);

  useEffect(() => {
    if (!isCarPaintingSelected) return;
    if (providerPaintColors.length === 0) return;
    const requested = String(paintColor || "")
      .trim()
      .toLowerCase();
    if (!requested || !providerPaintColors.includes(requested)) {
      setPaintColor(providerPaintColors[0]);
      setFieldError("paintColor", "");
    }
  }, [isCarPaintingSelected, providerPaintColors]);

  function validatePaintColor() {
    if (!isCarPaintingSelected) {
      setFieldError("paintColor", "");
      return true;
    }

    if (providerPaintColors.length === 0) {
      return (
        setFieldError(
          "paintColor",
          "This provider hasn't configured paint colors. Please choose a different provider for Car Painting.",
        ),
        false
      );
    }
    const requested = String(paintColor || "")
      .trim()
      .toLowerCase();
    if (!requested)
      return (
        setFieldError("paintColor", "Please select a paint color"),
        false
      );
    if (!/^#[0-9a-f]{6}$/.test(requested))
      return (setFieldError("paintColor", "Please pick a valid color"), false);
    if (!providerPaintColors.includes(requested))
      return (
        setFieldError("paintColor", "Select one of the offered colors"),
        false
      );
    setFieldError("paintColor", "");
    return true;
  }

  const startingCost = useMemo(() => {
    if (!provider?.servicesOffered?.length) return null;
    const costs = provider.servicesOffered
      .map((s) => Number(s.cost || 0))
      .filter((n) => !isNaN(n) && n > 0);
    if (costs.length === 0) return null;
    return Math.min(...costs);
  }, [provider]);

  function setFieldError(name, msg) {
    setErrors((e) => ({ ...e, [name]: msg || undefined }));
  }

  // Validators mirroring legacy logic
  function validateDistrict() {
    if (!district)
      return (setFieldError("district", "Please select your district"), false);
    setFieldError("district", "");
    return true;
  }
  function validateProvider() {
    if (!providerId)
      return (
        setFieldError("provider", "Please select a service provider"),
        false
      );
    setFieldError("provider", "");
    return true;
  }
  function validateServices() {
    if (!services.length)
      return (setFieldError("services", "Select at least one service"), false);
    setFieldError("services", "");
    return true;
  }
  function validateDate() {
    if (!date) return (setFieldError("date", "Please select a date"), false);
    if (new Date(date) < new Date(minDate))
      return (
        setFieldError("date", "Date must be at least 7 days from today"),
        false
      );
    setFieldError("date", "");
    return true;
  }
  function validatePhone() {
    const val = phone.trim();
    if (!val)
      return (setFieldError("phone", "Phone number is required"), false);
    if (/\s/.test(val))
      return (setFieldError("phone", "Phone cannot contain spaces"), false);
    if (!/^\d+$/.test(val))
      return (setFieldError("phone", "Phone can only contain digits"), false);
    if (val.length !== 10)
      return (
        setFieldError("phone", "Phone number must be exactly 10 digits"),
        false
      );
    setFieldError("phone", "");
    return true;
  }
  function validateCarYear() {
    const val = String(carYear).trim();
    const yearNum = Number(val);
    const currentYear = new Date().getFullYear();
    if (!val)
      return (setFieldError("carYear", "Year purchased is required"), false);
    if (!/^[0-9]{4}$/.test(val))
      return (setFieldError("carYear", "Enter a valid 4-digit year"), false);
    if (yearNum < 1980 || yearNum > currentYear)
      return (
        setFieldError(
          "carYear",
          `Year must be between 1980 and ${currentYear}`,
        ),
        false
      );
    setFieldError("carYear", "");
    return true;
  }
  function validateCarModel() {
    const val = carModel.trim();
    if (!val)
      return (setFieldError("carModel", "Car Model is required"), false);
    if (val.length < 2)
      return (setFieldError("carModel", "Car Model seems too short"), false);
    setFieldError("carModel", "");
    return true;
  }
  function validateAddress() {
    const val = address.trim();
    if (!val) return (setFieldError("address", "Address is required"), false);
    if (val.length < 10)
      return (
        setFieldError(
          "address",
          "Please provide a more detailed address (min 10 chars)",
        ),
        false
      );
    setFieldError("address", "");
    return true;
  }
  function validateDescription() {
    const val = description.trim();
    if (!val)
      return (
        setFieldError("description", "Please describe your service needs"),
        false
      );
    if (val.length < 10)
      return (
        setFieldError("description", "Description is too short (min 10 chars)"),
        false
      );
    setFieldError("description", "");
    return true;
  }

  function validateAll() {
    const validations = [
      { ok: validateDistrict(), elementId: "district" },
      { ok: validateProvider(), elementId: "service-provider" },
      { ok: validateServices(), elementId: "services-section" },
      { ok: validatePaintColor(), elementId: "paint-color-section" },
      { ok: validateDate(), elementId: "date" },
      { ok: validatePhone(), elementId: "phone" },
      { ok: validateCarYear(), elementId: "car-year" },
      { ok: validateCarModel(), elementId: "car-model" },
      { ok: validateAddress(), elementId: "address" },
      { ok: validateDescription(), elementId: "description" },
    ];
    const firstBad = validations.find((v) => !v.ok);
    if (firstBad?.elementId) {
      const el = document.getElementById(firstBad.elementId);
      if (el?.scrollIntoView) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
    return !firstBad;
  }

  function onSubmit(e) {
    e.preventDefault();
    if (!validateAll()) {
      setShowSummary(false);
      return;
    }
    setShowSummary(true);
  }

  useEffect(() => {
    if (!showSummary) return;
    const el = document.getElementById("summary-box");
    if (el?.scrollIntoView) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showSummary]);

  const estimatedTotal = useMemo(() => {
    return services.reduce((sum, s) => sum + (serviceCostMap[s] || 0), 0);
  }, [services, serviceCostMap]);

  async function confirmBooking() {
    try {
      const res = await fetch("/bookings/create-booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          providerId,
          selectedServices: services,
          date,
          phone: phone.trim(),
          carModel: carModel.trim(),
          carYear: Number(carYear),
          address: address.trim(),
          description: description.trim(),
          district,
          paintColor: paintColor
            ? String(paintColor).trim().toLowerCase()
            : undefined,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        alert("Error: " + (j.error || "Unknown error"));
        return;
      }
      alert("Booking successfully submitted!");
      // reset form and summary, or navigate back to this route
      window.location.href = "/customer/booking";
    } catch (e) {
      alert("Failed to submit booking.");
    }
  }

  // Helpers for rendering error and invalid class
  function invalid(name) {
    return errors[name];
  }
  function cls(name) {
    return invalid(name) ? "invalid" : undefined;
  }

  // Reset dependent fields when selections change
  useEffect(() => {
    // Changing district resets provider and services
    setProviderId("");
    setServices([]);
    setPaintColor("");
    setFieldError("provider", "");
    setFieldError("services", "");
    setFieldError("paintColor", "");
  }, [district]);
  useEffect(() => {
    // Changing provider clears selected services
    setServices([]);
    setPaintColor("");
    setFieldError("services", "");
    setFieldError("paintColor", "");
  }, [providerId]);

  useEffect(() => {
    // If Car Painting is deselected, clear paint color
    if (!isCarPaintingSelected && paintColor) {
      setPaintColor("");
      setFieldError("paintColor", "");
    }
  }, [isCarPaintingSelected]);

  return (
    <>
      <CustomerNav />

      <div className="booking-page">
        <div className="booking-container">
          {/* Page Header */}
          <div className="booking-header">
            <h1 className="booking-title">Service Booking</h1>
            <p className="booking-subtitle">
              Choose a service provider and customize your car
            </p>
          </div>

          {loading && (
            <div className="booking-loading">
              <div className="booking-loading-spinner"></div>
              <p>Loading service providers...</p>
            </div>
          )}

          {error && (
            <div className="booking-error">
              <span className="booking-error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Provider Selection Section */}
              <div className="booking-section">
                <div className="booking-section-header">
                  <div className="booking-section-icon">📍</div>
                  <div>
                    <h2 className="booking-section-title">
                      Select Service Provider
                    </h2>
                    <p className="booking-section-subtitle">
                      Choose a provider in your district
                    </p>
                  </div>
                </div>

                {/* District Filter */}
                <div className="booking-district-filter">
                  <label className="booking-district-label" htmlFor="district">
                    🏙️ Your District
                  </label>
                  <select
                    id="district"
                    required
                    className={`booking-district-select ${errors.district ? "invalid" : ""}`}
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    onBlur={validateDistrict}
                  >
                    <option value="">Select your district</option>
                    {uniqueDistricts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  {errors.district && (
                    <span className="booking-error-msg">{errors.district}</span>
                  )}
                </div>

                {/* Provider Cards Grid */}
                <div className="booking-providers-grid">
                  {!district && (
                    <div
                      className="booking-empty-state"
                      style={{ gridColumn: "1/-1" }}
                    >
                      <div className="booking-empty-icon">🔍</div>
                      <p>
                        Select a district above to see available service
                        providers.
                      </p>
                    </div>
                  )}

                  {providersForDistrict.length === 0 && district && (
                    <div
                      className="booking-empty-state"
                      style={{ gridColumn: "1/-1" }}
                    >
                      <div className="booking-empty-icon">😕</div>
                      <p>No service providers available in this district.</p>
                    </div>
                  )}

                  {district &&
                    providersForDistrict.map((p) => {
                      const rating = ratingsMap[String(p._id)]?.avgRating || 0;
                      const reviews =
                        ratingsMap[String(p._id)]?.totalReviews || 0;
                      const minCost = (p.servicesOffered || []).reduce(
                        (m, s) => {
                          const c = Number(s.cost || 0);
                          return !isNaN(c) && c > 0
                            ? m === null
                              ? c
                              : Math.min(m, c)
                            : m;
                        },
                        null,
                      );
                      const selected = String(providerId) === String(p._id);

                      return (
                        <button
                          key={p._id}
                          type="button"
                          onClick={() => setProviderId(String(p._id))}
                          className={`booking-provider-card ${selected ? "selected" : ""}`}
                        >
                          <div className="booking-provider-header">
                            <h3 className="booking-provider-name">{p.name}</h3>
                            <span className="booking-provider-district">
                              {p.district || ""}
                            </span>
                          </div>

                          <div className="booking-provider-services">
                            {(p.servicesOffered || [])
                              .slice(0, 3)
                              .map((s, i) => (
                                <span
                                  key={s.name + i}
                                  className="booking-service-tag"
                                >
                                  {s.name}
                                </span>
                              ))}
                            {(p.servicesOffered || []).length > 3 && (
                              <span className="booking-service-tag more">
                                +{(p.servicesOffered || []).length - 3} more
                              </span>
                            )}
                          </div>

                          <div className="booking-provider-meta">
                            <div className="booking-provider-rating">
                              <span className="booking-rating-stars">⭐</span>
                              <span>
                                {reviews > 0 ? rating.toFixed(1) : "New"}
                              </span>
                              <span className="booking-rating-text">
                                ({reviews} reviews)
                              </span>
                            </div>
                            <span className="booking-provider-price">
                              {minCost != null
                                ? `From ₹${minCost}`
                                : "Contact for pricing"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Provider Reviews */}
              {providerId && (
                <div className="booking-section booking-reviews-section">
                  <div className="booking-section-header">
                    <div className="booking-section-icon">⭐</div>
                    <div>
                      <h2 className="booking-section-title">
                        Customer Reviews
                      </h2>
                      <p className="booking-section-subtitle">
                        for {provider?.name || "Service Provider"}
                      </p>
                    </div>
                  </div>

                  {providerReviewsLoading && (
                    <div
                      className="booking-loading"
                      style={{ padding: "40px" }}
                    >
                      <div className="booking-loading-spinner"></div>
                      <p>Loading reviews...</p>
                    </div>
                  )}

                  {providerReviewsError && (
                    <div className="booking-error">{providerReviewsError}</div>
                  )}

                  {!providerReviewsLoading &&
                    !providerReviewsError &&
                    providerReviews.length === 0 && (
                      <div className="booking-empty-state">
                        <div className="booking-empty-icon">💬</div>
                        <p>No reviews yet for this provider.</p>
                      </div>
                    )}

                  {!providerReviewsLoading &&
                    !providerReviewsError &&
                    providerReviews.length > 0 && (
                      <div className="booking-reviews-grid">
                        {providerReviews.map((r) => (
                          <div key={r._id} className="booking-review-card">
                            <div className="booking-review-header">
                              <span className="booking-reviewer-name">
                                {r.customerName}
                              </span>
                              <span className="booking-review-rating">
                                ⭐ {r.rating}/5
                              </span>
                            </div>
                            {r.review ? (
                              <p className="booking-review-text">{r.review}</p>
                            ) : (
                              <p
                                className="booking-review-text"
                                style={{
                                  color: "#94a3b8",
                                  fontStyle: "italic",
                                }}
                              >
                                No review text provided.
                              </p>
                            )}
                            <span className="booking-review-date">
                              {r.createdAt
                                ? new Date(r.createdAt).toLocaleDateString()
                                : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              )}

              {/* Booking Form Section */}
              <div className="booking-section">
                <div className="booking-section-header">
                  <div className="booking-section-icon">📝</div>
                  <div>
                    <h2 className="booking-section-title">Booking Details</h2>
                    <p className="booking-section-subtitle">
                      Fill in your service requirements
                    </p>
                  </div>
                </div>

                <form
                  id="booking-form"
                  className="booking-form"
                  onSubmit={onSubmit}
                >
                  {/* Selected Provider (hidden for validation) */}
                  <input type="hidden" value={providerId} />
                  {errors.provider && (
                    <div className="booking-error-msg">{errors.provider}</div>
                  )}

                  {/* Services Selection */}
                  <div className="booking-form-group">
                    <label className="booking-form-label">
                      <span className="booking-form-label-icon">🔧</span>
                      Select Services
                    </label>
                    <div
                      id="services-section"
                      className="booking-services-grid"
                    >
                      {offeredServices.length === 0 && (
                        <p style={{ color: "#64748b", gridColumn: "1/-1" }}>
                          {providerId
                            ? "No services available"
                            : "Select a provider to see available services"}
                        </p>
                      )}
                      {offeredServices.map((name) => {
                        const isSelected = services.includes(name);
                        return (
                          <div
                            key={name}
                            onClick={() => {
                              setServices((prev) =>
                                isSelected
                                  ? prev.filter((s) => s !== name)
                                  : [...prev, name],
                              );
                            }}
                            className={`booking-service-option ${isSelected ? "selected" : ""}`}
                          >
                            <div className="booking-service-checkbox"></div>
                            <div className="booking-service-info">
                              <div className="booking-service-name">{name}</div>
                              <div className="booking-service-price">
                                From ₹{serviceCostMap[name] || "N/A"}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {errors.services && (
                      <span className="booking-error-msg">
                        {errors.services}
                      </span>
                    )}
                  </div>

                  {/* Paint Color Selection */}
                  {isCarPaintingSelected && (
                    <div
                      id="paint-color-section"
                      className="booking-paint-section"
                    >
                      <label className="booking-paint-title">
                        🎨 Choose Paint Color
                      </label>

                      {providerPaintColors.length > 0 ? (
                        <div className="booking-paint-grid">
                          {providerPaintColors.map((c) => {
                            const selected =
                              String(paintColor || "").toLowerCase() === c;
                            return (
                              <button
                                type="button"
                                key={c}
                                onClick={() => {
                                  setPaintColor(c);
                                  setFieldError("paintColor", "");
                                }}
                                title={c}
                                className={`booking-paint-color ${selected ? "selected" : ""}`}
                                style={{ background: c }}
                              />
                            );
                          })}
                        </div>
                      ) : (
                        <p className="booking-paint-empty">
                          This provider hasn't configured paint colors. Please
                          choose a different provider.
                        </p>
                      )}
                      {errors.paintColor && (
                        <span className="booking-error-msg">
                          {errors.paintColor}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Cost Display */}
                  {services.length > 0 && (
                    <div className="booking-cost-display">
                      <div>
                        <div className="booking-cost-label">
                          Estimated Starting Cost
                        </div>
                        <div className="booking-cost-value">
                          ₹{estimatedTotal.toLocaleString()}
                        </div>
                      </div>
                      <div className="booking-cost-note">
                        * Final cost may vary based on service requirements
                      </div>
                    </div>
                  )}

                  {/* Form Row - Date & Car Info */}
                  <div className="booking-form-row">
                    <div className="booking-form-group">
                      <label className="booking-form-label" htmlFor="date">
                        <span className="booking-form-label-icon">📅</span>
                        Preferred Date
                        <span className="booking-form-hint">
                          (min 7 days from today)
                        </span>
                      </label>
                      <input
                        type="date"
                        id="date"
                        required
                        min={minDate}
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        onBlur={validateDate}
                        className={`booking-form-input ${errors.date ? "invalid" : ""}`}
                      />
                      {errors.date && (
                        <span className="booking-error-msg">{errors.date}</span>
                      )}
                    </div>

                    <div className="booking-form-group">
                      <label className="booking-form-label" htmlFor="car-model">
                        <span className="booking-form-label-icon">🚗</span>
                        Car Model
                        <span className="booking-form-hint">
                          (Company & Model)
                        </span>
                      </label>
                      <input
                        type="text"
                        id="car-model"
                        required
                        placeholder="e.g., Maruti Swift, Honda City"
                        value={carModel}
                        onChange={(e) => setCarModel(e.target.value)}
                        onBlur={validateCarModel}
                        className={`booking-form-input ${errors.carModel ? "invalid" : ""}`}
                      />
                      {errors.carModel && (
                        <span className="booking-error-msg">
                          {errors.carModel}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Form Row - Year & Phone */}
                  <div className="booking-form-row">
                    <div className="booking-form-group">
                      <label className="booking-form-label" htmlFor="car-year">
                        <span className="booking-form-label-icon">📆</span>
                        Year Purchased
                      </label>
                      <input
                        type="number"
                        id="car-year"
                        required
                        placeholder="e.g., 2020"
                        value={carYear}
                        min="1980"
                        max={new Date().getFullYear()}
                        onChange={(e) => setCarYear(e.target.value)}
                        onBlur={validateCarYear}
                        className={`booking-form-input ${errors.carYear ? "invalid" : ""}`}
                      />
                      {errors.carYear && (
                        <span className="booking-error-msg">
                          {errors.carYear}
                        </span>
                      )}
                    </div>

                    <div className="booking-form-group">
                      <label className="booking-form-label" htmlFor="phone">
                        <span className="booking-form-label-icon">📞</span>
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        required
                        placeholder="Enter 10-digit number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        onBlur={validatePhone}
                        className={`booking-form-input ${errors.phone ? "invalid" : ""}`}
                      />
                      {errors.phone && (
                        <span className="booking-error-msg">
                          {errors.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Address */}
                  <div className="booking-form-group">
                    <label className="booking-form-label" htmlFor="address">
                      <span className="booking-form-label-icon">📍</span>
                      Your Address
                    </label>
                    <textarea
                      id="address"
                      rows={3}
                      placeholder="Enter your complete address for service pickup"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      onBlur={validateAddress}
                      className={`booking-form-textarea ${errors.address ? "invalid" : ""}`}
                    />
                    {errors.address && (
                      <span className="booking-error-msg">
                        {errors.address}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  <div className="booking-form-group">
                    <label className="booking-form-label" htmlFor="description">
                      <span className="booking-form-label-icon">💬</span>
                      Service Requirements
                      <span className="booking-form-hint">
                        (Include vehicle number)
                      </span>
                    </label>
                    <textarea
                      id="description"
                      rows={4}
                      placeholder="Describe your service needs in detail. Include your vehicle registration number..."
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      onBlur={validateDescription}
                      className={`booking-form-textarea ${errors.description ? "invalid" : ""}`}
                    />
                    {errors.description && (
                      <span className="booking-error-msg">
                        {errors.description}
                      </span>
                    )}
                  </div>

                  <button type="submit" className="booking-submit-btn">
                    📋 Review Booking
                  </button>
                </form>

                {showSummary && (
                  <div id="summary-box" className="booking-summary">
                    <div className="booking-summary-header">
                      <div className="booking-summary-icon">📋</div>
                      <h3 className="booking-summary-title">Booking Summary</h3>
                    </div>

                    <div className="booking-summary-grid">
                      <div className="booking-summary-item">
                        <div className="booking-summary-label">
                          🚗 Car Model
                        </div>
                        <div className="booking-summary-value">
                          {carModel.trim()}
                        </div>
                      </div>

                      <div className="booking-summary-item">
                        <div className="booking-summary-label">📆 Year</div>
                        <div className="booking-summary-value">{carYear}</div>
                      </div>

                      <div className="booking-summary-item full-width">
                        <div className="booking-summary-label">
                          🔧 Services Selected
                        </div>
                        <div className="booking-summary-value">
                          {services.join(", ")}
                        </div>
                      </div>

                      {isCarPaintingSelected && paintColor && (
                        <div className="booking-summary-item">
                          <div className="booking-summary-label">
                            🎨 Paint Color
                          </div>
                          <div
                            className="booking-summary-value"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                            }}
                          >
                            <span
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: "50%",
                                background: paintColor,
                                border: "2px solid #fff",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                              }}
                            ></span>
                            {String(paintColor).trim()}
                          </div>
                        </div>
                      )}

                      <div className="booking-summary-item">
                        <div className="booking-summary-label">👤 Provider</div>
                        <div className="booking-summary-value">
                          {provider?.name || ""}
                        </div>
                      </div>

                      <div className="booking-summary-item">
                        <div className="booking-summary-label">📍 District</div>
                        <div className="booking-summary-value">{district}</div>
                      </div>

                      <div className="booking-summary-item">
                        <div className="booking-summary-label">📅 Date</div>
                        <div className="booking-summary-value">{date}</div>
                      </div>

                      <div className="booking-summary-item">
                        <div className="booking-summary-label">📞 Phone</div>
                        <div className="booking-summary-value">
                          {phone.trim()}
                        </div>
                      </div>

                      <div className="booking-summary-item full-width">
                        <div className="booking-summary-label">🏠 Address</div>
                        <div className="booking-summary-value">
                          {address.trim()}
                        </div>
                      </div>

                      <div className="booking-summary-item full-width">
                        <div className="booking-summary-label">
                          💬 Description
                        </div>
                        <div className="booking-summary-value">
                          {description.trim()}
                        </div>
                      </div>
                    </div>

                    <div className="booking-summary-total">
                      <div className="booking-summary-total-label">
                        Estimated Total
                      </div>
                      <div className="booking-summary-total-value">
                        ₹{estimatedTotal.toLocaleString()}
                      </div>
                    </div>
                    <p className="booking-summary-note">
                      * Costs shown are starting estimates and subject to change
                      based on actual service requirements.
                    </p>

                    <button
                      type="button"
                      id="confirm-booking"
                      className="booking-confirm-btn"
                      onClick={confirmBooking}
                    >
                      ✅ Confirm Booking
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <CustomerFooter />
    </>
  );
}
