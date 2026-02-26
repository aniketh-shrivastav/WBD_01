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

export default function ServiceProfileSettings() {
  useLink("/styles/profileSettings.css");
  useLink(
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css"
  );

  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState("");
  const [statusColor, setStatusColor] = useState("#333");

  const [userId, setUserId] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    district: "",
  });
  const [services, setServices] = useState([]); // [{name, cost}]

  // Car Painting color options (hex strings)
  const [paintColors, setPaintColors] = useState([]);
  const [newPaintColor, setNewPaintColor] = useState("#ff0000");

  const [newService, setNewService] = useState("");
  const [newCost, setNewCost] = useState("");
  const [errors, setErrors] = useState({});

  const hasCarPainting = useMemo(() => {
    return services.some((s) => {
      const name = String(s?.name || "").toLowerCase();
      // Matches: "Car Painting", "Car paint", "Car Paint Job", etc.
      return (
        name.includes("car") &&
        (name.includes("paint") || name.includes("painting"))
      );
    });
  }, [services]);

  function normalizeHexColor(v) {
    const c = String(v || "")
      .trim()
      .toLowerCase();
    return /^#[0-9a-f]{6}$/.test(c) ? c : "";
  }

  function addPaintColor(color) {
    const normalized = normalizeHexColor(color);
    if (!normalized) {
      setErrors((e) => ({ ...e, paintColors: "Please pick a valid color" }));
      return;
    }
    setPaintColors((prev) => {
      const next = Array.from(
        new Set([
          ...(prev || []).map(normalizeHexColor).filter(Boolean),
          normalized,
        ])
      );
      return next.slice(0, 24);
    });
    setErrors((e) => ({ ...e, paintColors: undefined }));
  }

  function removePaintColor(idx) {
    setPaintColors((prev) => (prev || []).filter((_, i) => i !== idx));
  }

  const backendBase = useMemo(() => {
    try {
      const hinted = window.__API_BASE__ || process.env.REACT_APP_API_BASE;
      if (hinted) return hinted;
      const { protocol, hostname, port } = window.location;
      if (port === "5173") return `${protocol}//${hostname}:3000`;
      return ""; // same-origin
    } catch {
      return "";
    }
  }, []);

  function handleLogout(e) {
    e.preventDefault();
    const next = encodeURIComponent(`${window.location.origin}/`);
    window.location.href = `${backendBase}/logout?next=${next}`;
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/service/api/profile`, {
          headers: { Accept: "application/json" },
        });
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!res.ok) throw new Error("Failed to load profile");
        const ct = (res.headers.get("content-type") || "").toLowerCase();
        if (!ct.includes("application/json")) {
          const text = await res.text().catch(() => "");
          if (text.startsWith("<!DOCTYPE") || text.includes("<html")) {
            window.location.href = "/login";
            return;
          }
          throw new Error("Unexpected response format from server");
        }
        const data = await res.json();
        if (!data.success)
          throw new Error(data.message || "Profile load failed");
        const u = data.user || {};
        setUserId(u.id);
        setProfilePicture(u.profilePicture || "");
        setForm({
          name: u.name || "",
          email: u.email || "",
          phone: u.phone || "",
          district: u.district || "",
        });
        setServices(
          (u.servicesOffered || []).map((s) => ({
            name: s.name || "",
            cost: s.cost ?? 0,
          }))
        );
        setPaintColors(
          (u.paintColors || [])
            .map((c) => normalizeHexColor(c))
            .filter(Boolean)
            .slice(0, 24)
        );
      } catch (e) {
        setStatus(e.message || "Failed to load");
        setStatusColor("red");
      }
    })();
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

  // If provider removes Car Painting from services, clear colors locally (server also clears)
  useEffect(() => {
    if (!hasCarPainting && paintColors.length) setPaintColors([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCarPainting]);

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => ({ ...e, [name]: undefined }));
  }

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = "Full Name is required";
    const digits = (form.phone || "").replace(/\D/g, "");
    if (!digits) errs.phone = "Phone Number is required";
    else if (digits.length !== 10)
      errs.phone = "Phone number should contain 10 digits";
    if (!form.district.trim()) errs.district = "District is required";
    const bad = services.find(
      (s) => !(s.name || "").trim() || isNaN(parseFloat(s.cost))
    );
    if (bad)
      errs.services = "Please ensure all services have a name and a valid cost";

    if (hasCarPainting) {
      const validColors = (paintColors || [])
        .map(normalizeHexColor)
        .filter(Boolean);
      if (validColors.length === 0) {
        errs.paintColors = "Add at least one paint color for Car Painting";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateNewServiceInputs(show) {
    const nameOk = /^[A-Za-z0-9\s.-]{2,}$/.test((newService || "").trim());
    const costVal = parseFloat((newCost || "").trim());
    const costOk =
      (newCost || "").trim() !== "" && !isNaN(costVal) && costVal > 0;
    if (show) {
      setErrors((e) => ({
        ...e,
        newService: nameOk ? undefined : "Enter at least 2 valid characters",
        newCost: costOk ? undefined : "Enter a valid cost greater than 0",
      }));
    }
    return nameOk && costOk;
  }

  function addService() {
    if (!validateNewServiceInputs(true)) return;
    setServices((list) => [
      ...list,
      { name: newService.trim(), cost: parseFloat(newCost) },
    ]);
    setNewService("");
    setNewCost("");
  }
  function removeService(idx) {
    setServices((list) => list.filter((_, i) => i !== idx));
  }

  async function onSave() {
    if (!validate()) return;
    setStatus("Saving...");
    setStatusColor("#333");
    try {
      const res = await fetch(`/profile/update`, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: (() => {
          const payload = new FormData();
          payload.append("name", form.name.trim());
          payload.append("phone", form.phone.trim());
          payload.append("district", form.district.trim());
          payload.append("servicesOffered", JSON.stringify(services));
          payload.append(
            "paintColors",
            JSON.stringify(
              (paintColors || []).map(normalizeHexColor).filter(Boolean),
            ),
          );
          if (profileFile) payload.append("profilePicture", profileFile);
          return payload;
        })(),
      });
      const out = await res.json().catch(() => ({}));
      if (!out.success) throw new Error(out.message || "Update failed");
      if (profileFile) setProfileFile(null);
      if (out.profilePicture) setProfilePicture(out.profilePicture);
      setStatus("Profile updated successfully!");
      setStatusColor("green");
      setEditing(false);
    } catch (e) {
      setStatus(e.message || "Save failed");
      setStatusColor("red");
    }
  }

  function onCancel() {
    setEditing(false);
    setStatus("");
    setErrors({});
    (async () => {
      try {
        const res = await fetch(`/service/api/profile`, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) return;
        const data = await res.json();
        const u = data.user || {};
        setForm({
          name: u.name || "",
          email: u.email || "",
          phone: u.phone || "",
          district: u.district || "",
        });
        setProfilePicture(u.profilePicture || "");
        setProfileFile(null);
        setServices(
          (u.servicesOffered || []).map((s) => ({
            name: s.name || "",
            cost: s.cost ?? 0,
          }))
        );
        setPaintColors(
          (u.paintColors || [])
            .map((c) => normalizeHexColor(c))
            .filter(Boolean)
            .slice(0, 24)
        );
      } catch {}
    })();
  }

  async function onDeleteAccount() {
    if (!userId) return;
    if (
      !window.confirm(
        "Are you sure you want to permanently delete your account? This action cannot be undone."
      )
    )
      return;
    try {
      const res = await fetch(`/service/profile/delete/${userId}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const out = await res.json().catch(() => ({}));
      if (!out.success) throw new Error(out.message || "Delete failed");
      alert("Account deleted successfully.");
      window.location.href = "/";
    } catch (e) {
      alert(e.message || "Failed to delete account");
    }
  }

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
            document.getElementById("sidebar")?.classList.toggle("active");
          }}
        >
          ☰
        </a>
        <div className="nav-links" id="navLinks">
          <a href="/service/dashboard">Dashboard</a>
          <a href="/service/profileSettings" className="active">
            Profile Settings
          </a>
          <a href="/service/bookingManagement">Booking Management</a>
          <a href="/service/reviews">Reviews & Ratings</a>
          <a href="/logout" onClick={handleLogout}>
            Logout
          </a>
        </div>
      </nav>

      <div className="sidebar" id="sidebar">
        <a
          className="close-btn"
          onClick={() =>
            document.getElementById("sidebar")?.classList.toggle("active")
          }
        >
          Close ×
        </a>
        <a href="/service/dashboard">
          <i className="fas fa-tachometer-alt"></i> Dashboard
        </a>
        <a href="/service/profileSettings" className="active">
          <i className="fas fa-user-cog"></i> Profile Settings
        </a>
        <a href="/service/bookingManagement">
          <i className="fas fa-calendar-alt"></i> Booking Management
        </a>
        <a href="/service/reviews">
          <i className="fas fa-star"></i> Reviews & Ratings
        </a>
        <a href="/logout" onClick={handleLogout}>
          <i className="fas fa-sign-out-alt"></i> Logout
        </a>
      </div>

      <div className="profile-container">
        <div className="profile-pic-container">
          <label
            className={`profile-pic-label${editing ? " is-editing" : ""}`}
          >
            <img
              src={
                profilePreview ||
                profilePicture ||
                "/images3/image5.jpg"
              }
              alt="Profile"
              className="profile-pic"
            />
            {editing ? (
              <>
                <span className="profile-pic-overlay">Change photo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProfileFile(e.target.files?.[0] || null)}
                />
              </>
            ) : null}
          </label>
        </div>
        <h1>Profile Settings</h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
        >
          <label>Name:</label>
          <input
            type="text"
            value={form.name}
            disabled={!editing}
            onChange={(e) => setField("name", e.target.value)}
            className={errors.name ? "error-border" : undefined}
          />
          {errors.name ? (
            <div className="error" style={{ display: "block" }}>
              {errors.name}
            </div>
          ) : (
            <div className="error" />
          )}

          <label>Email:</label>
          <input type="email" value={form.email} disabled readOnly />

          <label>Phone:</label>
          <input
            type="tel"
            value={form.phone}
            disabled={!editing}
            onChange={(e) => setField("phone", e.target.value)}
            className={errors.phone ? "error-border" : undefined}
          />
          {errors.phone ? (
            <div className="error" style={{ display: "block" }}>
              {errors.phone}
            </div>
          ) : (
            <div className="error" />
          )}

          <label>District:</label>
          <input
            type="text"
            value={form.district}
            disabled={!editing}
            onChange={(e) => setField("district", e.target.value)}
            className={errors.district ? "error-border" : undefined}
          />
          {errors.district ? (
            <div className="error" style={{ display: "block" }}>
              {errors.district}
            </div>
          ) : (
            <div className="error" />
          )}

          <div className="services-container">
            <h2>Services Offered</h2>
            <ul className="service-list" id="serviceList">
              {services.map((s, idx) => (
                <li className="service-item" key={`${s.name}-${idx}`}>
                  <input
                    type="text"
                    className="service-name"
                    value={s.name}
                    disabled={!editing}
                    onChange={(e) =>
                      setServices((list) =>
                        list.map((it, i) =>
                          i === idx ? { ...it, name: e.target.value } : it
                        )
                      )
                    }
                    required
                  />
                  <input
                    type="number"
                    className="service-cost"
                    value={s.cost}
                    disabled={!editing}
                    onChange={(e) =>
                      setServices((list) =>
                        list.map((it, i) =>
                          i === idx ? { ...it, cost: e.target.value } : it
                        )
                      )
                    }
                    required
                  />
                  {editing ? (
                    <button
                      type="button"
                      className="delete-btn"
                      onClick={() => removeService(idx)}
                    >
                      Delete
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
            {editing ? (
              <div className="service-input-container">
                <input
                  type="text"
                  id="newService"
                  placeholder="New Service Name"
                  value={newService}
                  onChange={(e) => {
                    setNewService(e.target.value);
                    validateNewServiceInputs(true);
                  }}
                />
                {errors.newService ? (
                  <div className="error" style={{ display: "block" }}>
                    {errors.newService}
                  </div>
                ) : (
                  <div className="error" id="newServiceErr"></div>
                )}
                <input
                  type="number"
                  id="newServiceCost"
                  placeholder="Cost"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={newCost}
                  onChange={(e) => {
                    setNewCost(e.target.value);
                    validateNewServiceInputs(true);
                  }}
                />
                {errors.newCost ? (
                  <div className="error" style={{ display: "block" }}>
                    {errors.newCost}
                  </div>
                ) : (
                  <div className="error" id="newServiceCostErr"></div>
                )}
                <button
                  type="button"
                  className="btn add-service-btn"
                  onClick={addService}
                  disabled={!validateNewServiceInputs(false)}
                >
                  Add Service
                </button>
                <div
                  style={{ fontSize: "0.85em", color: "#555", marginTop: 4 }}
                >
                  Name must be 2+ characters; cost must be a number greater than
                  0.
                </div>
              </div>
            ) : null}
            {errors.services ? (
              <div className="error" style={{ display: "block" }}>
                {errors.services}
              </div>
            ) : null}
          </div>

          {/* Car Painting color options */}
          {hasCarPainting && (
            <div className="services-container" style={{ marginTop: 16 }}>
              <h2>Car Painting Colors Offered</h2>
              <div
                style={{ fontSize: "0.9em", color: "#555", marginBottom: 8 }}
              >
                Customers will be able to select one of these colors while
                booking.
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <input
                  type="color"
                  value={newPaintColor}
                  disabled={!editing}
                  onChange={(e) => setNewPaintColor(e.target.value)}
                  aria-label="Pick a paint color"
                  style={{
                    width: 44,
                    height: 36,
                    padding: 0,
                    border: "1px solid #ccc",
                    borderRadius: 8,
                  }}
                />
                <input
                  type="text"
                  value={newPaintColor}
                  disabled={!editing}
                  onChange={(e) => setNewPaintColor(e.target.value)}
                  placeholder="#rrggbb"
                  style={{ width: 120 }}
                />
                {editing ? (
                  <button
                    type="button"
                    className="btn add-service-btn"
                    onClick={() => addPaintColor(newPaintColor)}
                  >
                    Add Color
                  </button>
                ) : null}
                <div
                  style={{ marginLeft: "auto", fontSize: 12, color: "#666" }}
                >
                  {(paintColors || []).length}/24
                </div>
              </div>

              {errors.paintColors ? (
                <div
                  className="error"
                  style={{ display: "block", marginTop: 6 }}
                >
                  {errors.paintColors}
                </div>
              ) : (
                <div className="error" />
              )}

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  marginTop: 12,
                }}
              >
                {(paintColors || []).map((c, idx) => (
                  <div
                    key={`${c}-${idx}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: "6px 10px",
                      background: "#fff",
                    }}
                  >
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 6,
                        background: c,
                        border: "1px solid #bbb",
                      }}
                    />
                    <span style={{ fontFamily: "monospace", fontSize: 12 }}>
                      {c}
                    </span>
                    {editing ? (
                      <button
                        type="button"
                        className="delete-btn"
                        onClick={() => removePaintColor(idx)}
                        style={{ padding: "4px 10px" }}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="buttons">
            {!editing ? (
              <button
                type="button"
                className="btn edit-btn"
                onClick={() => setEditing(true)}
              >
                Edit
              </button>
            ) : (
              <>
                <button type="button" className="btn save-btn" onClick={onSave}>
                  Save
                </button>
                <button
                  type="button"
                  className="btn cancel-btn"
                  onClick={onCancel}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </form>

        {/* Show Danger Zone only while editing */}
        {editing && (
          <div className="delete-account-section">
            <h3>Danger Zone</h3>
            <p>
              Once you delete your account, there is no going back. Please be
              certain.
            </p>
            <button
              id="delete-account-btn"
              className="delete-btn"
              onClick={onDeleteAccount}
            >
              Delete My Account
            </button>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 8, color: statusColor }}>
          {status}
        </div>
      </div>

      <style>{`
        .error-border{ border:2px solid red; }
        .error{ color:red; font-size:0.8em; }
        .service-input-container{ display:block !important; }
        .add-service-btn{ display:inline-block !important; }
        .save-btn{ display:inline-block !important; }
        .cancel-btn{ display:inline-block !important; }
        .service-item .delete-btn{ display:inline-block !important; }
        .delete-account-section .delete-btn{ display:inline-block !important; }
        .delete-account-section{ margin-top:30px; border-top:1px solid #ccc; padding-top:15px; }
        .profile-pic-label{ position:relative; display:inline-block; cursor:default; }
        .profile-pic-label input{ display:none; }
        .profile-pic-label.is-editing{ cursor:pointer; }
        .profile-pic-overlay{
          position:absolute;
          inset:0;
          display:flex;
          align-items:center;
          justify-content:center;
          background:rgba(0,0,0,0.45);
          color:#fff;
          font-size:0.85rem;
          font-weight:600;
          opacity:0;
          transition:opacity 0.2s ease;
          border-radius:50%;
        }
        .profile-pic-label.is-editing:hover .profile-pic-overlay{ opacity:1; }
      `}</style>
    </>
  );
}
