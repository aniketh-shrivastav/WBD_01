import React, { useEffect, useMemo, useState } from "react";
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

export default function ServiceProfileSettings() {
  useLink("/styles/profileSettings.css");
  useLink(
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css",
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

  // Manager-defined service categories
  const [availableCategories, setAvailableCategories] = useState([]);

  // Pickup & drop-off rates
  const [pickupRate, setPickupRate] = useState("");
  const [dropoffRate, setDropoffRate] = useState("");

  // Car Painting color options (hex strings)
  const [paintColors, setPaintColors] = useState([]);
  const [newPaintColor, setNewPaintColor] = useState("#ff0000");

  const [newService, setNewService] = useState("");
  const [newCost, setNewCost] = useState("");
  const [errors, setErrors] = useState({});

  // Verification documents
  const [verificationDocs, setVerificationDocs] = useState([]);
  const [verificationStatus, setVerificationStatus] = useState("unverified");
  const [verificationNote, setVerificationNote] = useState("");
  const [docUploadType, setDocUploadType] = useState("");
  const [docFile, setDocFile] = useState(null);
  const [docUploading, setDocUploading] = useState(false);
  const [docError, setDocError] = useState("");

  const VERIFICATION_DOC_TYPES = [
    "GST Registration Certificate",
    "PAN Card",
    "Business Registration Proof",
    "MSME / Udyam Registration",
    "Shop & Establishment License",
    "Certificate of Incorporation",
    "Aadhaar Card (Masked)",
    "Shop License",
  ];

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
        ]),
      );
      return next.slice(0, 24);
    });
    setErrors((e) => ({ ...e, paintColors: undefined }));
  }

  function removePaintColor(idx) {
    setPaintColors((prev) => (prev || []).filter((_, i) => i !== idx));
  }

  useEffect(() => {
    (async () => {
      try {
        // Load available categories from manager
        const catRes = await fetch("/api/service-categories/active", {
          headers: { Accept: "application/json" },
          credentials: "include",
        });
        if (catRes.ok) {
          const catData = await catRes.json();
          if (catData.success) setAvailableCategories(catData.categories || []);
        }

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
          })),
        );
        setPickupRate(u.pickupRate || "");
        setDropoffRate(u.dropoffRate || "");
        setPaintColors(
          (u.paintColors || [])
            .map((c) => normalizeHexColor(c))
            .filter(Boolean)
            .slice(0, 24),
        );
        setVerificationDocs(u.verificationDocuments || []);
        setVerificationStatus(u.verificationStatus || "unverified");
        setVerificationNote(u.verificationNote || "");
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
      (s) => !(s.name || "").trim() || isNaN(parseFloat(s.cost)),
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
    const nameOk = (newService || "").trim().length > 0;
    const costVal = parseFloat((newCost || "").trim());
    const costOk =
      (newCost || "").trim() !== "" && !isNaN(costVal) && costVal > 0;
    if (show) {
      setErrors((e) => ({
        ...e,
        newService: nameOk ? undefined : "Please select a service category",
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
          payload.append("pickupRate", pickupRate || 0);
          payload.append("dropoffRate", dropoffRate || 0);
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
          })),
        );
        setPickupRate(u.pickupRate || "");
        setDropoffRate(u.dropoffRate || "");
        setPaintColors(
          (u.paintColors || [])
            .map((c) => normalizeHexColor(c))
            .filter(Boolean)
            .slice(0, 24),
        );
      } catch {}
    })();
  }

  // Document upload handler
  async function handleDocUpload() {
    if (!docUploadType || !docFile) {
      setDocError("Please select a document type and file.");
      return;
    }
    setDocUploading(true);
    setDocError("");
    try {
      const fd = new FormData();
      fd.append("docType", docUploadType);
      fd.append("document", docFile);
      const res = await fetch("/profile/upload-document", {
        method: "POST",
        body: fd,
      });
      const out = await res.json().catch(() => ({}));
      if (!out.success) throw new Error(out.message || "Upload failed");
      setVerificationDocs(out.verificationDocuments || []);
      setVerificationStatus(out.verificationStatus || "pending");
      setDocUploadType("");
      setDocFile(null);
      setStatus("Document uploaded successfully!");
      setStatusColor("green");
    } catch (e) {
      setDocError(e.message || "Failed to upload document");
    } finally {
      setDocUploading(false);
    }
  }

  async function handleDocDelete(docType) {
    if (!window.confirm(`Delete ${docType}?`)) return;
    try {
      const res = await fetch(
        `/profile/delete-document/${encodeURIComponent(docType)}`,
        { method: "DELETE", headers: { Accept: "application/json" } },
      );
      const out = await res.json().catch(() => ({}));
      if (!out.success) throw new Error(out.message || "Delete failed");
      setVerificationDocs(out.verificationDocuments || []);
      setVerificationStatus(out.verificationStatus || "unverified");
    } catch (e) {
      setDocError(e.message || "Failed to delete document");
    }
  }

  async function onDeleteAccount() {
    if (!userId) return;
    if (
      !window.confirm(
        "Are you sure you want to permanently delete your account? This action cannot be undone.",
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
    <div className="service-page">
      <ServiceNav />
      <main className="service-main">
        <div className="profile-container">
          <div className="profile-pic-container">
            <label
              className={`profile-pic-label${editing ? " is-editing" : ""}`}
            >
              <img
                src={profilePreview || profilePicture || "/images3/image5.jpg"}
                alt="Profile"
                className="profile-pic"
              />
              {editing ? (
                <>
                  <span className="profile-pic-overlay">Change photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setProfileFile(e.target.files?.[0] || null)
                    }
                  />
                </>
              ) : null}
            </label>
          </div>
          <h1>
            Profile Settings
            {verificationStatus === "verified" && (
              <span
                className="sp-verification-badge sp-badge-verified"
                style={{ marginLeft: 10 }}
              >
                ✓ Verified
              </span>
            )}
            {verificationStatus === "pending" && (
              <span
                className="sp-verification-badge sp-badge-pending"
                style={{ marginLeft: 10 }}
              >
                ⏳ Pending
              </span>
            )}
          </h1>

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
                      disabled
                      readOnly
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
                            i === idx ? { ...it, cost: e.target.value } : it,
                          ),
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
                  <select
                    id="newService"
                    value={newService}
                    onChange={(e) => {
                      setNewService(e.target.value);
                      validateNewServiceInputs(true);
                    }}
                    className="sp-select-service"
                  >
                    <option value="">-- Select Service Category --</option>
                    {availableCategories
                      .filter(
                        (cat) => !services.some((s) => s.name === cat.name),
                      )
                      .map((cat) => (
                        <option key={cat._id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                  </select>
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
                  <div className="sp-hint">
                    Select a category from the list and set your cost.
                  </div>
                </div>
              ) : null}
              {errors.services ? (
                <div className="error" style={{ display: "block" }}>
                  {errors.services}
                </div>
              ) : null}
            </div>

            {/* Pickup / Dropoff Rates */}
            <div className="services-container" style={{ marginTop: 16 }}>
              <h2>Pickup &amp; Dropoff Rates</h2>
              <div className="sp-hint">
                Set the rates you charge for vehicle pickup and dropoff.
                Customers can optionally request these services when booking.
              </div>
              <div className="sp-rate-grid">
                <label className="sp-rate-label">
                  <span>Pickup Rate (₹)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pickupRate}
                    disabled={!editing}
                    onChange={(e) => setPickupRate(e.target.value)}
                  />
                </label>
                <label className="sp-rate-label">
                  <span>Dropoff Rate (₹)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={dropoffRate}
                    disabled={!editing}
                    onChange={(e) => setDropoffRate(e.target.value)}
                  />
                </label>
              </div>
            </div>

            {/* Car Painting color options */}
            {hasCarPainting && (
              <div className="services-container" style={{ marginTop: 16 }}>
                <h2>Car Painting Colors Offered</h2>
                <div className="sp-hint">
                  Customers will be able to select one of these colors while
                  booking.
                </div>

                <div className="sp-paint-row">
                  <input
                    type="color"
                    value={newPaintColor}
                    disabled={!editing}
                    onChange={(e) => setNewPaintColor(e.target.value)}
                    aria-label="Pick a paint color"
                  />
                  <input
                    type="text"
                    value={newPaintColor}
                    disabled={!editing}
                    onChange={(e) => setNewPaintColor(e.target.value)}
                    placeholder="#rrggbb"
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
                  <div className="sp-paint-count">
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

                <div className="sp-paint-swatches">
                  {(paintColors || []).map((c, idx) => (
                    <div key={`${c}-${idx}`} className="sp-paint-chip">
                      <span
                        className="sp-paint-swatch"
                        style={{ background: c }}
                      />
                      <span className="sp-paint-hex">{c}</span>
                      {editing ? (
                        <button
                          type="button"
                          className="delete-btn"
                          onClick={() => removePaintColor(idx)}
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
                  <button
                    type="button"
                    className="btn save-btn"
                    onClick={onSave}
                  >
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

          {/* Verification Documents Section */}
          <div className="services-container sp-verification-section">
            <h2>
              Verification Documents
              <span
                className={`sp-verification-badge sp-badge-${verificationStatus}`}
              >
                {verificationStatus === "verified"
                  ? "✓ Verified"
                  : verificationStatus === "pending"
                    ? "⏳ Pending Verification"
                    : verificationStatus === "rejected"
                      ? "✗ Rejected"
                      : "Unverified"}
              </span>
            </h2>

            {verificationNote && verificationStatus === "rejected" && (
              <div className="sp-verification-note sp-note-rejected">
                <strong>Manager Note:</strong> {verificationNote}
              </div>
            )}

            <div className="sp-hint">
              Upload your business documents for verification. Once verified by
              a manager, a verified badge will appear on your profile.
            </div>

            {/* Uploaded documents list */}
            {verificationDocs.length > 0 && (
              <div className="sp-doc-list">
                {verificationDocs.map((doc, idx) => (
                  <div key={idx} className="sp-doc-item">
                    <div className="sp-doc-info">
                      <span className="sp-doc-type">{doc.docType}</span>
                      <span className="sp-doc-filename">
                        {doc.fileName || "Document"}
                      </span>
                    </div>
                    <div className="sp-doc-actions">
                      <a
                        href={doc.docUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn sp-doc-view-btn"
                      >
                        View
                      </a>
                      {verificationStatus !== "verified" && (
                        <button
                          type="button"
                          className="btn sp-doc-delete-btn"
                          onClick={() => handleDocDelete(doc.docType)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upload new document */}
            {verificationStatus !== "verified" && (
              <div className="sp-doc-upload">
                <select
                  value={docUploadType}
                  onChange={(e) => setDocUploadType(e.target.value)}
                  className="sp-select-service"
                >
                  <option value="">-- Select Document Type --</option>
                  {VERIFICATION_DOC_TYPES.filter(
                    (t) => !verificationDocs.some((d) => d.docType === t),
                  ).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="sp-doc-file-input"
                />
                <button
                  type="button"
                  className="btn add-service-btn"
                  onClick={handleDocUpload}
                  disabled={docUploading || !docUploadType || !docFile}
                >
                  {docUploading ? "Uploading..." : "Upload Document"}
                </button>
                {docError && (
                  <div className="error" style={{ display: "block" }}>
                    {docError}
                  </div>
                )}
              </div>
            )}

            <div className="sp-hint" style={{ marginTop: 12 }}>
              Required: GST Registration Certificate, PAN Card, Business
              Registration Proof (MSME/Udyam, Shop &amp; Establishment, or
              Certificate of Incorporation). Sole Proprietors: Aadhaar (masked),
              PAN, Shop License.
            </div>
          </div>

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

          <div className="sp-status" style={{ color: statusColor }}>
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
      </main>
      <ServiceFooter />
    </div>
  );
}
