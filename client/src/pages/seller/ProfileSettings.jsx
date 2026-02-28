import React, { useEffect, useMemo, useState } from "react";
import SellerNav from "../../components/SellerNav";
import SellerFooter from "../../components/SellerFooter";
import "../../Css/seller.css";

export default function SellerProfileSettings() {
  const MAX_LEN = 15;
  const [form, setForm] = useState({
    storeName: "",
    ownerName: "",
    contactEmail: "",
    phone: "",
    address: "",
  });
  const [profilePicture, setProfilePicture] = useState("");
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState("");
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const validators = useMemo(
    () => ({
      storeName: (v) =>
        !v
          ? "Store Name required"
          : v.length > MAX_LEN
            ? `Store Name must be ${MAX_LEN} or fewer characters`
            : "",
      ownerName: (v) =>
        !v
          ? "Owner Name required"
          : v.length > MAX_LEN
            ? `Owner Name must be ${MAX_LEN} or fewer characters`
            : "",
      contactEmail: (v) => {
        if (!v) return "Email required";
        if (!v.includes("@")) return "Email must contain @";
        const re = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$/;
        if (!re.test(v)) return "Email invalid or not lowercase";
        return "";
      },
      phone: (v) => (/^\d{10}$/.test(v) ? "" : "Phone must be 10 digits"),
      address: (v) => (!v ? "Address required" : ""),
    }),
    [],
  );

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  }

  function validateAll() {
    const next = {};
    Object.entries(form).forEach(([k, v]) => {
      const msg = validators[k](String(v).trim());
      if (msg) next[k] = msg;
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setStatus("Loading profile...");
        const res = await fetch("/seller/api/profileSettings", {
          headers: { Accept: "application/json" },
        });
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        const j = await res.json();
        if (!j.success) throw new Error(j.message || "Failed");
        const p = j.profile || {};
        if (!cancelled) {
          setForm({
            storeName: p.storeName || "",
            ownerName: p.ownerName || "",
            contactEmail: p.contactEmail || "",
            phone: p.phone || "",
            address: p.address || "",
          });
          setProfilePicture(p.profilePicture || "");
          setStatus("");
        }
      } catch (e) {
        if (!cancelled) setStatus("Failed to load profile");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!profileFile) {
      setProfilePreview("");
      return undefined;
    }
    const nextUrl = URL.createObjectURL(profileFile);
    setProfilePreview(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [profileFile]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!validateAll()) {
      setStatus("Fix highlighted errors");
      return;
    }
    setStatus("Saving...");
    try {
      const res = await fetch("/seller/api/profileSettings", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: (() => {
          const payload = new FormData();
          Object.entries(form).forEach(([k, v]) => {
            payload.append(k, String(v).trim());
          });
          if (profileFile) payload.append("profilePicture", profileFile);
          return payload;
        })(),
      });
      const out = await res.json().catch(() => ({}));
      if (!out.success) {
        setStatus(out.message || "Update failed");
        return;
      }
      if (profileFile) setProfileFile(null);
      if (out.profilePicture) setProfilePicture(out.profilePicture);
      setStatus("Profile updated successfully");
    } catch (e) {
      setStatus("Update failed");
    }
  }

  const headerTitle = form.storeName
    ? `Profile Settings — ${form.storeName}`
    : "Profile Settings";

  return (
    <div className="seller-page">
      <SellerNav />

      <main className="seller-main">
        <h1 className="seller-title">{headerTitle}</h1>
        <p className="seller-subtitle">
          Manage your store profile and settings
        </p>

        <div className="seller-profile-container">
          {/* Profile Picture */}
          <div className="seller-profile-header">
            <div className="seller-profile-avatar-wrap">
              <img
                src={profilePreview || profilePicture || "/images3/image5.jpg"}
                alt="Profile"
                className="seller-profile-avatar"
              />
              <label className="seller-profile-avatar-overlay">
                Change photo
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => setProfileFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>
            <h2 className="seller-profile-name">
              {form.storeName || "Your Store"}
            </h2>
            <p className="seller-text-muted seller-mb-0">
              {form.contactEmail || "seller@store.com"}
            </p>
          </div>

          {/* Profile Form */}
          <form className="seller-profile-form" onSubmit={onSubmit} noValidate>
            <div className="seller-form-grid">
              <div className="seller-form-group">
                <label className="seller-label" htmlFor="storeName">
                  Store Name
                </label>
                <input
                  className="seller-input"
                  id="storeName"
                  type="text"
                  maxLength={MAX_LEN}
                  value={form.storeName}
                  onChange={(e) => setField("storeName", e.target.value)}
                />
                {errors.storeName && (
                  <small className="seller-error-text">
                    {errors.storeName}
                  </small>
                )}
              </div>
              <div className="seller-form-group">
                <label className="seller-label" htmlFor="ownerName">
                  Owner Name
                </label>
                <input
                  className="seller-input"
                  id="ownerName"
                  type="text"
                  maxLength={MAX_LEN}
                  value={form.ownerName}
                  onChange={(e) => setField("ownerName", e.target.value)}
                />
                {errors.ownerName && (
                  <small className="seller-error-text">
                    {errors.ownerName}
                  </small>
                )}
              </div>
              <div className="seller-form-group">
                <label className="seller-label" htmlFor="contactEmail">
                  Contact Email
                </label>
                <input
                  className="seller-input"
                  id="contactEmail"
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setField("contactEmail", e.target.value)}
                />
                {errors.contactEmail && (
                  <small className="seller-error-text">
                    {errors.contactEmail}
                  </small>
                )}
              </div>
              <div className="seller-form-group">
                <label className="seller-label" htmlFor="phone">
                  Phone Number
                </label>
                <input
                  className="seller-input"
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                />
                {errors.phone && (
                  <small className="seller-error-text">{errors.phone}</small>
                )}
              </div>
            </div>

            <div className="seller-form-group seller-mt-2">
              <label className="seller-label" htmlFor="address">
                Store Address
              </label>
              <textarea
                className="seller-input"
                id="address"
                rows={3}
                value={form.address}
                onChange={(e) => setField("address", e.target.value)}
                style={{ resize: "vertical" }}
              />
              {errors.address && (
                <small className="seller-error-text">{errors.address}</small>
              )}
            </div>

            <button
              type="submit"
              className="seller-btn seller-btn-primary seller-btn-block seller-mt-3"
            >
              Update Profile
            </button>
          </form>

          {status && (
            <div
              className={`seller-alert seller-mt-2 ${status.includes("success") ? "seller-alert-success" : status.includes("Fix") || status.includes("failed") || status.includes("Failed") ? "seller-alert-error" : "seller-alert-info"}`}
            >
              {status}
            </div>
          )}
        </div>
      </main>

      <SellerFooter />
    </div>
  );
}
