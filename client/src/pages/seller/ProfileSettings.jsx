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
    sellerType: "individual",
  });
  const [profilePicture, setProfilePicture] = useState("");
  const [profileFile, setProfileFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState("");
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Verification documents
  const [verificationDocs, setVerificationDocs] = useState([]);
  const [verificationStatus, setVerificationStatus] = useState("unverified");
  const [verificationNote, setVerificationNote] = useState("");
  const [verifiedAt, setVerifiedAt] = useState(null);
  const [docUploadType, setDocUploadType] = useState("");
  const [docFile, setDocFile] = useState(null);
  const [docUploading, setDocUploading] = useState(false);
  const [docError, setDocError] = useState("");
  const [docTypesIndividual, setDocTypesIndividual] = useState([]);
  const [docTypesBusiness, setDocTypesBusiness] = useState([]);

  const currentDocTypes = useMemo(
    () =>
      form.sellerType === "business" ? docTypesBusiness : docTypesIndividual,
    [form.sellerType, docTypesBusiness, docTypesIndividual],
  );

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
            sellerType: p.sellerType || "individual",
          });
          setProfilePicture(p.profilePicture || "");
          setVerificationDocs(p.verificationDocuments || []);
          setVerificationStatus(p.verificationStatus || "unverified");
          setVerificationNote(p.verificationNote || "");
          setVerifiedAt(p.verifiedAt || null);
          setDocTypesIndividual(j.docTypesIndividual || []);
          setDocTypesBusiness(j.docTypesBusiness || []);
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
      const res = await fetch("/seller/upload-document", {
        method: "POST",
        body: fd,
      });
      const out = await res.json().catch(() => ({}));
      if (!out.success) throw new Error(out.message || "Upload failed");
      setVerificationDocs(out.verificationDocuments || []);
      setVerificationStatus(out.verificationStatus || "pending");
      setDocUploadType("");
      setDocFile(null);
      setStatus("Document uploaded successfully");
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
        `/seller/delete-document/${encodeURIComponent(docType)}`,
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

            <div className="seller-form-group seller-mt-2">
              <label className="seller-label" htmlFor="sellerType">
                Seller Type
              </label>
              <select
                className="seller-input"
                id="sellerType"
                value={form.sellerType}
                onChange={(e) => setField("sellerType", e.target.value)}
              >
                <option value="individual">Individual Seller</option>
                <option value="business">Business Seller</option>
              </select>
            </div>

            <button
              type="submit"
              className="seller-btn seller-btn-primary seller-btn-block seller-mt-3"
            >
              Update Profile
            </button>
          </form>

          {/* Verification Status Badge */}
          <div
            style={{
              margin: "18px 0 0",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                fontSize: 13,
                fontWeight: 700,
                padding: "5px 14px",
                borderRadius: 20,
                color: "#fff",
                background:
                  verificationStatus === "verified"
                    ? "linear-gradient(135deg,#059669,#10b981)"
                    : verificationStatus === "pending"
                      ? "linear-gradient(135deg,#d97706,#f59e0b)"
                      : verificationStatus === "rejected"
                        ? "linear-gradient(135deg,#dc2626,#ef4444)"
                        : "#94a3b8",
              }}
            >
              {verificationStatus === "verified"
                ? "✓ Verified Seller"
                : verificationStatus === "pending"
                  ? "⏳ Verification Pending"
                  : verificationStatus === "rejected"
                    ? "✗ Verification Rejected"
                    : "Unverified"}
            </span>
            {verifiedAt && verificationStatus === "verified" && (
              <span style={{ fontSize: 12, color: "#6b7280" }}>
                Verified on: {new Date(verifiedAt).toLocaleDateString()}
              </span>
            )}
          </div>

          {verificationNote && verificationStatus === "rejected" && (
            <div
              style={{
                marginTop: 10,
                padding: 10,
                borderRadius: 8,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                fontSize: 13,
              }}
            >
              <strong>Rejection Note:</strong> {verificationNote}
            </div>
          )}

          {/* Verification Documents */}
          <div className="seller-card seller-mt-3" style={{ padding: 20 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700 }}>
              📄 Verification Documents
              {form.sellerType === "business" ? " (Business)" : " (Individual)"}
            </h3>

            {/* Existing documents */}
            {verificationDocs.length > 0 && (
              <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
                {verificationDocs.map((doc, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: "#f8fafc",
                      border: "1px solid rgba(17,24,39,0.08)",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>
                        {doc.docType}
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        {doc.fileName || "Document"} •{" "}
                        {doc.uploadedAt
                          ? new Date(doc.uploadedAt).toLocaleDateString()
                          : ""}
                      </div>
                    </div>
                    <div
                      style={{ display: "flex", gap: 8, alignItems: "center" }}
                    >
                      <a
                        href={doc.docUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="seller-btn seller-btn-secondary"
                        style={{ padding: "5px 12px", fontSize: 12 }}
                      >
                        📄 View
                      </a>
                      {verificationStatus !== "verified" && (
                        <button
                          type="button"
                          className="seller-btn seller-btn-danger"
                          style={{ padding: "5px 12px", fontSize: 12 }}
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

            {verificationDocs.length === 0 && (
              <p style={{ color: "#6b7280", marginBottom: 14, fontSize: 13 }}>
                No verification documents uploaded yet.
              </p>
            )}

            {/* Upload new document */}
            {verificationStatus !== "verified" && (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <select
                  className="seller-input"
                  value={docUploadType}
                  onChange={(e) => setDocUploadType(e.target.value)}
                  style={{ flex: "1 1 200px", minWidth: 180 }}
                >
                  <option value="">-- Select Document Type --</option>
                  {currentDocTypes
                    .filter(
                      (t) => !verificationDocs.some((d) => d.docType === t),
                    )
                    .map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                </select>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="seller-input"
                  style={{ flex: "1 1 200px", padding: 8 }}
                />
                <button
                  type="button"
                  className="seller-btn seller-btn-primary"
                  onClick={handleDocUpload}
                  disabled={docUploading || !docUploadType || !docFile}
                  style={{ whiteSpace: "nowrap" }}
                >
                  {docUploading ? "Uploading..." : "Upload Document"}
                </button>
              </div>
            )}

            {docError && (
              <div
                style={{
                  marginTop: 8,
                  color: "#dc2626",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {docError}
              </div>
            )}

            <div
              style={{
                marginTop: 12,
                fontSize: 12,
                color: "#6b7280",
                lineHeight: 1.5,
              }}
            >
              {form.sellerType === "individual" ? (
                <>
                  <strong>Individual Seller:</strong> PAN Card, Aadhaar Card
                  (Masked), Selfie Verification (optional).
                </>
              ) : (
                <>
                  <strong>Business Seller:</strong> PAN Card (Business), GST
                  Certificate, Certificate of Incorporation, Shop &amp;
                  Establishment License.
                </>
              )}
            </div>
          </div>

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
