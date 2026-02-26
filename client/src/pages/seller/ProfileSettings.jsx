import React, { useEffect, useMemo, useState } from "react";

function useLink(href) {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, [href]);
}

export default function SellerProfileSettings() {
  useLink("/Css/CStyle.css");
  useLink("/Css/sellerBase.css");

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
            <a href="/seller/profileSettings" className="active">
              Profile Settings
            </a>
          </li>
          <li>
            <a href="/seller/productmanagement">Products</a>
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
        <h1>{headerTitle}</h1>
      </header>
      <main className="seller-main">
        <section className="profile-section">
          <div className="profile-pic-container" style={{ marginBottom: 16 }}>
            <label className="profile-pic-label">
              <img
                src={
                  profilePreview ||
                  profilePicture ||
                  "/images3/image5.jpg"
                }
                alt="Profile"
                className="profile-pic"
                style={{ width: 96, height: 96, borderRadius: "50%" }}
              />
              <span className="profile-pic-overlay">Change photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setProfileFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>
          <form className="profile-form" onSubmit={onSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="storeName">Store Name:</label>
              <input
                id="storeName"
                type="text"
                maxLength={MAX_LEN}
                value={form.storeName}
                onChange={(e) => setField("storeName", e.target.value)}
              />
              {errors.storeName ? (
                <small
                  className="input-error"
                  style={{ color: "crimson", display: "block", marginTop: 6 }}
                >
                  {errors.storeName}
                </small>
              ) : null}
            </div>
            <div className="form-group">
              <label htmlFor="ownerName">Owner Name:</label>
              <input
                id="ownerName"
                type="text"
                maxLength={MAX_LEN}
                value={form.ownerName}
                onChange={(e) => setField("ownerName", e.target.value)}
              />
              {errors.ownerName ? (
                <small
                  className="input-error"
                  style={{ color: "crimson", display: "block", marginTop: 6 }}
                >
                  {errors.ownerName}
                </small>
              ) : null}
            </div>
            <div className="form-group">
              <label htmlFor="contactEmail">Contact Email:</label>
              <input
                id="contactEmail"
                type="email"
                value={form.contactEmail}
                onChange={(e) => setField("contactEmail", e.target.value)}
              />
              {errors.contactEmail ? (
                <small
                  className="input-error"
                  style={{ color: "crimson", display: "block", marginTop: 6 }}
                >
                  {errors.contactEmail}
                </small>
              ) : null}
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone Number:</label>
              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
              />
              {errors.phone ? (
                <small
                  className="input-error"
                  style={{ color: "crimson", display: "block", marginTop: 6 }}
                >
                  {errors.phone}
                </small>
              ) : null}
            </div>
            <div className="form-group">
              <label htmlFor="address">Store Address:</label>
              <textarea
                id="address"
                rows={3}
                value={form.address}
                onChange={(e) => setField("address", e.target.value)}
              />
              {errors.address ? (
                <small
                  className="input-error"
                  style={{ color: "crimson", display: "block", marginTop: 6 }}
                >
                  {errors.address}
                </small>
              ) : null}
            </div>
            <button type="submit">Update Profile</button>
          </form>
          <p
            id="statusMsg"
            style={{ textAlign: "center", marginTop: 15, fontWeight: 600 }}
          >
            {status}
          </p>
        </section>
      </main>
      <footer className="seller-footer">
        <p>© 2025 AutoCustomizer | All Rights Reserved</p>
      </footer>

      {/* Local CSS overrides to exactly match legacy profileSettings.html visual design */}
      <style>{`
        /* Ensure seller pages don't inherit any fixed nav from other sections */
        .seller-page .navbar { position: static !important; }
        /* Background like legacy (light gradient) */
        .seller-page { background: linear-gradient(135deg, #f5f7fa, #c3cfe2); min-height: 100vh; }
        /* Header gradient bar */
        .seller-page header { background: linear-gradient(135deg, #6a11cb, #2575fc); color:#fff; padding:30px 20px; text-align:center; box-shadow:0 4px 6px rgba(0,0,0,0.1); }
        .seller-page header h1 { margin:0; font-size:2.5em; font-weight:600; }
        /* Main container width uses sellerBase's .seller-main; add safety padding */
        .seller-page .seller-main { padding:20px; margin:0 auto; }
        /* White card with hover lift, same as legacy */
        .seller-page .profile-section { background:#fff; border-radius:12px; box-shadow:0 4px 8px rgba(0,0,0,0.1); padding:25px; max-width:800px; margin:30px auto; transition:.3s; }
        .seller-page .profile-section:hover { transform: translateY(-5px); box-shadow:0 8px 16px rgba(0,0,0,0.2); }
        .seller-page .profile-form .form-group { margin-bottom:20px; }
        .seller-page .profile-form label { display:block; font-weight:600; margin-bottom:8px; color:#6a11cb; }
        .seller-page .profile-form input, .seller-page .profile-form textarea { width:100%; padding:12px; border:1px solid #ddd; border-radius:8px; font-size:1em; transition:border .3s, box-shadow .3s; background:#fff; color:#000; }
        .seller-page .profile-form input:focus, .seller-page .profile-form textarea:focus { outline:none; border-color:#6a11cb; box-shadow:0 0 0 2px rgba(106,17,203,.2); }
        .seller-page .profile-form textarea { resize:vertical; min-height:80px; }
        .seller-page .profile-form button { background: linear-gradient(135deg, #6a11cb, #2575fc); color:#fff; border:none; padding:15px; width:100%; border-radius:8px; cursor:pointer; font-weight:600; font-size:1em; transition:.3s; box-shadow:0 4px 6px rgba(0,0,0,0.1); }
        .seller-page .profile-form button:hover { background: linear-gradient(135deg, #5c0fb3, #2169e8); transform: translateY(-2px); box-shadow:0 6px 8px rgba(0,0,0,0.15); }
        .seller-page .seller-footer { background: linear-gradient(135deg, #6a11cb, #2575fc); color:#fff; text-align:center; padding:15px; box-shadow:0 -4px 6px rgba(0,0,0,0.1); }
        .seller-page .input-error { color:crimson; }
        .seller-page .profile-pic-label{ position:relative; display:inline-block; cursor:pointer; }
        .seller-page .profile-pic-label input{ display:none; }
        .seller-page .profile-pic-overlay{
          position:absolute;
          inset:0;
          display:flex;
          align-items:center;
          justify-content:center;
          background:rgba(0,0,0,0.45);
          color:#fff;
          font-size:0.75rem;
          font-weight:600;
          opacity:0;
          transition:opacity 0.2s ease;
          border-radius:50%;
        }
        .seller-page .profile-pic-label:hover .profile-pic-overlay{ opacity:1; }
        @media (max-width: 768px) { .seller-page .profile-section { margin:20px 15px; } .seller-page header h1 { font-size:2em; } }
      `}</style>
    </div>
  );
}
