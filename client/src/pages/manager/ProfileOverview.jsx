import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import ManagerNav from "../../components/ManagerNav";
import "../../Css/manager.css";

function formatDateTime(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return String(d);
  }
}

function formatMoneyINR(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "₹0";
  return `₹${Math.round(num).toLocaleString("en-IN")}`;
}

function Section({ title, children, right }) {
  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid rgba(17,24,39,0.12)",
        borderRadius: 12,
        padding: 16,
        boxShadow: "0 8px 24px rgba(17,24,39,0.06)",
        marginBottom: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 10,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export default function ManagerProfileOverview() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    document.body.classList.add("manager-theme");
    return () => document.body.classList.remove("manager-theme");
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError("");
        const resp = await fetch(`/manager/api/profile-overview/${id}`, {
          headers: { Accept: "application/json" },
        });
        if (resp.status === 401 || resp.status === 403) {
          window.location.href = "/login";
          return;
        }
        const j = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(j?.error || "Failed to load overview");
        if (!cancelled) setData(j);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load overview");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const role = data?.role || "";
  const profile = data?.profile || {};

  const headerRight = useMemo(
    () => (
      <Link
        to="/manager/profiles"
        style={{
          textDecoration: "none",
          padding: "8px 12px",
          borderRadius: 8,
          background: "#111827",
          color: "#fff",
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        Back to Profiles
      </Link>
    ),
    [],
  );

  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");

  const handleVerification = useCallback(
    async (action) => {
      const note =
        action === "reject"
          ? window.prompt("Reason for rejection (optional):") || ""
          : action === "unverify"
            ? window.prompt("Reason for revoking verification (optional):") ||
              ""
            : "";
      if ((action === "reject" || action === "unverify") && note === null)
        return; // cancelled prompt
      setVerifyLoading(true);
      setVerifyMsg("");
      try {
        // Use subject.userId for verification (works for both service providers and sellers)
        const verifyId = data?.subject?.userId || id;
        const resp = await fetch(`/manager/verify-provider/${verifyId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ action, note }),
        });
        const j = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(j?.error || "Failed to update");
        setVerifyMsg(
          j.message ||
            (action === "verify"
              ? "Provider verified!"
              : action === "unverify"
                ? "Verification revoked"
                : "Verification rejected"),
        );
        // Refresh data
        const refreshResp = await fetch(`/manager/api/profile-overview/${id}`, {
          headers: { Accept: "application/json" },
        });
        const refreshData = await refreshResp.json().catch(() => ({}));
        if (refreshResp.ok) setData(refreshData);
      } catch (e) {
        setVerifyMsg(e.message || "Error");
      } finally {
        setVerifyLoading(false);
      }
    },
    [id],
  );

  if (loading)
    return (
      <>
        <div className="navbar">
          <div className="logo">
            <h2>Manager's Panel</h2>
          </div>
          <ManagerNav />
        </div>
        <div className="main-content">
          <p>Loading profile overview...</p>
        </div>
      </>
    );

  if (error)
    return (
      <>
        <div className="navbar">
          <div className="logo">
            <h2>Manager's Panel</h2>
          </div>
          <ManagerNav />
        </div>
        <div className="main-content">
          <p style={{ color: "#e74c3c" }}>{error}</p>
          <div style={{ marginTop: 12 }}>{headerRight}</div>
        </div>
      </>
    );

  return (
    <>
      <div className="navbar">
        <div className="logo">
          <h2>Manager's Panel</h2>
        </div>
        <ManagerNav />
      </div>

      <div className="main-content">
        <Section
          title={`${role} Overview`}
          right={
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#6b7280" }}>ID: {id}</span>
              {headerRight}
            </div>
          }
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "120px 1fr",
              gap: 14,
              alignItems: "start",
            }}
          >
            <img
              src={profile.profilePicture || "https://via.placeholder.com/120"}
              alt="Profile"
              style={{
                width: 120,
                height: 120,
                borderRadius: 12,
                objectFit: "cover",
                border: "1px solid rgba(17,24,39,0.12)",
              }}
            />
            <div>
              <h1 style={{ margin: "0 0 6px", fontSize: 22 }}>
                {profile.name || "(No name)"}
              </h1>
              <div style={{ color: "#374151", fontSize: 14 }}>
                <div>
                  <strong>Email:</strong> {profile.email || "-"}
                </div>
                <div>
                  <strong>Phone:</strong> {profile.phone || "-"}
                </div>
                {profile.district ? (
                  <div>
                    <strong>District:</strong> {profile.district}
                  </div>
                ) : null}
                {profile.address ? (
                  <div>
                    <strong>Address:</strong> {profile.address}
                  </div>
                ) : null}
                {profile.ownerName ? (
                  <div>
                    <strong>Owner:</strong> {profile.ownerName}
                  </div>
                ) : null}
                {profile.vehicleMake || profile.vehicleModel ? (
                  <div>
                    <strong>Vehicle:</strong>{" "}
                    {[
                      profile.vehicleMake,
                      profile.vehicleModel,
                      profile.vehicleVariant,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </div>
                ) : null}
                {profile.registrationNumber ? (
                  <div>
                    <strong>Reg. No:</strong> {profile.registrationNumber}
                  </div>
                ) : null}
                {profile.pickupRate != null &&
                Number(profile.pickupRate) > 0 ? (
                  <div>
                    <strong>Pickup Rate:</strong>{" "}
                    {formatMoneyINR(profile.pickupRate)}
                  </div>
                ) : null}
                {profile.dropoffRate != null &&
                Number(profile.dropoffRate) > 0 ? (
                  <div>
                    <strong>Dropoff Rate:</strong>{" "}
                    {formatMoneyINR(profile.dropoffRate)}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </Section>

        {/* Service Provider */}
        {role === "Service Provider" ? (
          <>
            {/* Verification Documents */}
            <Section
              title="Verification"
              right={
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "4px 12px",
                    borderRadius: 20,
                    color: "#fff",
                    background:
                      data?.verification?.status === "verified"
                        ? "linear-gradient(135deg,#059669,#10b981)"
                        : data?.verification?.status === "pending"
                          ? "linear-gradient(135deg,#d97706,#f59e0b)"
                          : data?.verification?.status === "rejected"
                            ? "linear-gradient(135deg,#dc2626,#ef4444)"
                            : "#94a3b8",
                  }}
                >
                  {data?.verification?.status === "verified"
                    ? "✓ Verified"
                    : data?.verification?.status === "pending"
                      ? "⏳ Pending"
                      : data?.verification?.status === "rejected"
                        ? "✗ Rejected"
                        : "Unverified"}
                </span>
              }
            >
              {(data?.verification?.documents || []).length === 0 ? (
                <p style={{ color: "#6b7280" }}>
                  No verification documents uploaded.
                </p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {(data?.verification?.documents || []).map((doc, idx) => (
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
                      <a
                        href={doc.docUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "6px 14px",
                          borderRadius: 6,
                          background: "#e8f4fd",
                          color: "#2563eb",
                          textDecoration: "none",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        📄 View
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {data?.verification?.note && (
                <div
                  style={{
                    marginTop: 10,
                    padding: 10,
                    borderRadius: 8,
                    background:
                      data.verification.status === "rejected"
                        ? "#fef2f2"
                        : "#f0fdf4",
                    border:
                      data.verification.status === "rejected"
                        ? "1px solid #fecaca"
                        : "1px solid #bbf7d0",
                    fontSize: 13,
                  }}
                >
                  <strong>Note:</strong> {data.verification.note}
                </div>
              )}

              {data?.verification?.verifiedAt && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "#6b7280",
                  }}
                >
                  Verified on:{" "}
                  {new Date(data.verification.verifiedAt).toLocaleString()}
                </div>
              )}

              {/* Verify / Reject / Unverify buttons */}
              {(data?.verification?.documents || []).length > 0 &&
                data?.verification?.status !== "verified" && (
                  <div
                    style={{
                      marginTop: 14,
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      onClick={() => handleVerification("verify")}
                      disabled={verifyLoading}
                      style={{
                        padding: "8px 20px",
                        borderRadius: 8,
                        border: "none",
                        background: "linear-gradient(135deg,#059669,#10b981)",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: verifyLoading ? "not-allowed" : "pointer",
                        opacity: verifyLoading ? 0.6 : 1,
                      }}
                    >
                      ✓ Verify Provider
                    </button>
                    <button
                      onClick={() => handleVerification("reject")}
                      disabled={verifyLoading}
                      style={{
                        padding: "8px 20px",
                        borderRadius: 8,
                        border: "none",
                        background: "linear-gradient(135deg,#dc2626,#ef4444)",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: verifyLoading ? "not-allowed" : "pointer",
                        opacity: verifyLoading ? 0.6 : 1,
                      }}
                    >
                      ✗ Reject
                    </button>
                  </div>
                )}

              {/* Unverify button – only when currently verified */}
              {data?.verification?.status === "verified" && (
                <div
                  style={{
                    marginTop: 14,
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    onClick={() => handleVerification("unverify")}
                    disabled={verifyLoading}
                    style={{
                      padding: "8px 20px",
                      borderRadius: 8,
                      border: "none",
                      background: "linear-gradient(135deg,#d97706,#f59e0b)",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: verifyLoading ? "not-allowed" : "pointer",
                      opacity: verifyLoading ? 0.6 : 1,
                    }}
                  >
                    ⊘ Unverify Provider
                  </button>
                </div>
              )}

              {verifyMsg && (
                <div
                  style={{
                    marginTop: 10,
                    padding: 8,
                    borderRadius: 8,
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {verifyMsg}
                </div>
              )}
            </Section>

            <Section
              title="Totals"
              right={
                <div style={{ fontSize: 13, color: "#6b7280" }}>
                  Completed: {data?.totals?.completedCount || 0}
                </div>
              }
            >
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <div
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    background: "rgba(16,185,129,0.10)",
                    border: "1px solid rgba(16,185,129,0.25)",
                    minWidth: 220,
                    fontWeight: 800,
                  }}
                >
                  Total Earnings: {formatMoneyINR(data?.totals?.totalEarnings)}
                </div>
              </div>
            </Section>

            <Section title="Last 3 Bookings">
              {(data?.recent?.bookings || []).length === 0 ? (
                <p style={{ color: "#6b7280" }}>No bookings found.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="table" style={{ width: "100%" }}>
                    <thead>
                      <tr>
                        <th>Booking ID</th>
                        <th>Customer</th>
                        <th>Services</th>
                        <th>Status</th>
                        <th>Cost</th>
                        <th>Product Cost</th>
                        <th>Pickup</th>
                        <th>Dropoff</th>
                        <th>Booked At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.recent?.bookings || []).map((b) => (
                        <tr key={b._id}>
                          <td>{b._id}</td>
                          <td>
                            {b.customerId?.name || ""}
                            {b.customerId?.email
                              ? ` (${b.customerId.email})`
                              : ""}
                          </td>
                          <td>{(b.selectedServices || []).join(", ")}</td>
                          <td>{b.status || ""}</td>
                          <td>{formatMoneyINR(b.totalCost || 0)}</td>
                          <td>
                            {b.productCost
                              ? formatMoneyINR(b.productCost)
                              : "—"}
                          </td>
                          <td>
                            {b.needsPickup
                              ? `Yes — ${formatMoneyINR(b.pickupCost || 0)}`
                              : "No"}
                          </td>
                          <td>
                            {b.needsDropoff
                              ? `Yes — ${formatMoneyINR(b.dropoffCost || 0)}`
                              : "No"}
                          </td>
                          <td>{formatDateTime(b.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            <Section title="Reviews">
              {(data?.reviews || []).length === 0 ? (
                <p style={{ color: "#6b7280" }}>No reviews yet.</p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {data.reviews.map((r) => (
                    <div
                      key={r._id}
                      style={{
                        border: "1px solid rgba(17,24,39,0.12)",
                        borderRadius: 12,
                        padding: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ fontWeight: 800 }}>
                          {r.customer?.name || "Customer"} • {r.rating}/5
                        </div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>
                          {formatDateTime(r.createdAt)}
                        </div>
                      </div>
                      {r.selectedServices?.length ? (
                        <div style={{ fontSize: 12, color: "#6b7280" }}>
                          {(r.selectedServices || []).join(", ")}
                        </div>
                      ) : null}
                      {r.review ? (
                        <div style={{ marginTop: 8 }}>{r.review}</div>
                      ) : (
                        <div style={{ marginTop: 8, color: "#6b7280" }}>
                          (No comment)
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </>
        ) : null}

        {/* Seller */}
        {role === "Seller" ? (
          <>
            {/* Verification Documents */}
            <Section
              title="Verification"
              right={
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "4px 12px",
                    borderRadius: 20,
                    color: "#fff",
                    background:
                      data?.verification?.status === "verified"
                        ? "linear-gradient(135deg,#059669,#10b981)"
                        : data?.verification?.status === "pending"
                          ? "linear-gradient(135deg,#d97706,#f59e0b)"
                          : data?.verification?.status === "rejected"
                            ? "linear-gradient(135deg,#dc2626,#ef4444)"
                            : "#94a3b8",
                  }}
                >
                  {data?.verification?.status === "verified"
                    ? "✓ Verified"
                    : data?.verification?.status === "pending"
                      ? "⏳ Pending"
                      : data?.verification?.status === "rejected"
                        ? "✗ Rejected"
                        : "Unverified"}
                </span>
              }
            >
              {(data?.verification?.documents || []).length === 0 ? (
                <p style={{ color: "#6b7280" }}>
                  No verification documents uploaded.
                </p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {(data?.verification?.documents || []).map((doc, idx) => (
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
                      <a
                        href={doc.docUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "6px 14px",
                          borderRadius: 6,
                          background: "#e8f4fd",
                          color: "#2563eb",
                          textDecoration: "none",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        📄 View
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {data?.verification?.note && (
                <div
                  style={{
                    marginTop: 10,
                    padding: 10,
                    borderRadius: 8,
                    background:
                      data.verification.status === "rejected"
                        ? "#fef2f2"
                        : "#f0fdf4",
                    border:
                      data.verification.status === "rejected"
                        ? "1px solid #fecaca"
                        : "1px solid #bbf7d0",
                    fontSize: 13,
                  }}
                >
                  <strong>Note:</strong> {data.verification.note}
                </div>
              )}

              {data?.verification?.verifiedAt && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "#6b7280",
                  }}
                >
                  Verified on:{" "}
                  {new Date(data.verification.verifiedAt).toLocaleString()}
                </div>
              )}

              {/* Verify / Reject buttons */}
              {(data?.verification?.documents || []).length > 0 &&
                data?.verification?.status !== "verified" && (
                  <div
                    style={{
                      marginTop: 14,
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      onClick={() => handleVerification("verify")}
                      disabled={verifyLoading}
                      style={{
                        padding: "8px 20px",
                        borderRadius: 8,
                        border: "none",
                        background: "linear-gradient(135deg,#059669,#10b981)",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: verifyLoading ? "not-allowed" : "pointer",
                        opacity: verifyLoading ? 0.6 : 1,
                      }}
                    >
                      ✓ Verify Seller
                    </button>
                    <button
                      onClick={() => handleVerification("reject")}
                      disabled={verifyLoading}
                      style={{
                        padding: "8px 20px",
                        borderRadius: 8,
                        border: "none",
                        background: "linear-gradient(135deg,#dc2626,#ef4444)",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: verifyLoading ? "not-allowed" : "pointer",
                        opacity: verifyLoading ? 0.6 : 1,
                      }}
                    >
                      ✗ Reject
                    </button>
                  </div>
                )}

              {/* Unverify button – only when currently verified */}
              {data?.verification?.status === "verified" && (
                <div
                  style={{
                    marginTop: 14,
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    onClick={() => handleVerification("unverify")}
                    disabled={verifyLoading}
                    style={{
                      padding: "8px 20px",
                      borderRadius: 8,
                      border: "none",
                      background: "linear-gradient(135deg,#d97706,#f59e0b)",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: verifyLoading ? "not-allowed" : "pointer",
                      opacity: verifyLoading ? 0.6 : 1,
                    }}
                  >
                    ⊘ Unverify Seller
                  </button>
                </div>
              )}

              {verifyMsg && (
                <div
                  style={{
                    marginTop: 10,
                    padding: 8,
                    borderRadius: 8,
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {verifyMsg}
                </div>
              )}
            </Section>

            <Section title="Totals">
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <div
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    background: "rgba(59,130,246,0.10)",
                    border: "1px solid rgba(59,130,246,0.25)",
                    minWidth: 220,
                    fontWeight: 800,
                  }}
                >
                  Delivered Earnings:{" "}
                  {formatMoneyINR(data?.totals?.totalEarnings)}
                </div>
                <div
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    background: "rgba(17,24,39,0.06)",
                    border: "1px solid rgba(17,24,39,0.12)",
                    minWidth: 220,
                    fontWeight: 800,
                  }}
                >
                  Delivered Items: {data?.totals?.deliveredItems || 0}
                </div>
              </div>
            </Section>

            <Section title="Last 3 Orders (Seller Items)">
              {(data?.recent?.orders || []).length === 0 ? (
                <p style={{ color: "#6b7280" }}>No orders found.</p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {data.recent.orders.map((o) => (
                    <div
                      key={o._id}
                      style={{
                        border: "1px solid rgba(17,24,39,0.12)",
                        borderRadius: 12,
                        padding: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ fontWeight: 800 }}>Order {o._id}</div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>
                          {formatDateTime(o.placedAt)}
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: "#374151" }}>
                        <div>
                          <strong>Status:</strong> {o.orderStatus || ""}
                        </div>
                        {o.customer?.name ? (
                          <div>
                            <strong>Customer:</strong> {o.customer.name}
                            {o.customer.email ? ` (${o.customer.email})` : ""}
                          </div>
                        ) : null}
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <strong>Items:</strong>
                        <ul style={{ margin: "6px 0 0 18px" }}>
                          {(o.items || []).map((it, idx) => (
                            <li key={idx}>
                              {it.name} × {it.quantity} —{" "}
                              {formatMoneyINR(it.price)}
                              {it.itemStatus ? ` (${it.itemStatus})` : ""}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </>
        ) : null}

        {/* Customer */}
        {role === "Customer" ? (
          <>
            {/* Vehicle Details Section */}
            {(profile.registrationNumber ||
              profile.vehicleMake ||
              profile.vin ||
              profile.fuelType) && (
              <Section title="🚗 Vehicle Details">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px 20px",
                    fontSize: 14,
                  }}
                >
                  {[
                    ["Registration Number", profile.registrationNumber],
                    ["Make", profile.vehicleMake],
                    ["Model", profile.vehicleModel],
                    ["Variant", profile.vehicleVariant],
                    ["Fuel Type", profile.fuelType],
                    ["Transmission", profile.transmission],
                    ["Year of Manufacture", profile.yearOfManufacture],
                    ["VIN", profile.vin],
                    [
                      "Current Mileage",
                      profile.currentMileage
                        ? `${profile.currentMileage} km`
                        : "",
                    ],
                    ["Insurance Provider", profile.insuranceProvider],
                    [
                      "Insurance Valid Till",
                      profile.insuranceValidTill
                        ? new Date(
                            profile.insuranceValidTill,
                          ).toLocaleDateString()
                        : "",
                    ],
                  ]
                    .filter(([, v]) => v)
                    .map(([label, val]) => (
                      <div key={label}>
                        <div
                          style={{
                            fontWeight: 600,
                            color: "#6b7280",
                            fontSize: 12,
                            marginBottom: 2,
                          }}
                        >
                          {label}
                        </div>
                        <div>{val}</div>
                      </div>
                    ))}
                </div>

                {(profile.rcBook || profile.insuranceCopy) && (
                  <div
                    style={{
                      marginTop: 14,
                      display: "flex",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    {profile.rcBook && (
                      <a
                        href={profile.rcBook}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "6px 14px",
                          borderRadius: 6,
                          background: "#e8f4fd",
                          color: "#2563eb",
                          textDecoration: "none",
                          fontSize: 13,
                        }}
                      >
                        📄 View RC Book
                      </a>
                    )}
                    {profile.insuranceCopy && (
                      <a
                        href={profile.insuranceCopy}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "6px 14px",
                          borderRadius: 6,
                          background: "#e8f4fd",
                          color: "#2563eb",
                          textDecoration: "none",
                          fontSize: 13,
                        }}
                      >
                        📄 View Insurance Copy
                      </a>
                    )}
                  </div>
                )}

                {Array.isArray(profile.vehiclePhotos) &&
                  profile.vehiclePhotos.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          marginBottom: 8,
                          fontSize: 13,
                          color: "#6b7280",
                        }}
                      >
                        Vehicle Photos
                      </div>
                      <div
                        style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                      >
                        {profile.vehiclePhotos.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <img
                              src={url}
                              alt={`Vehicle ${i + 1}`}
                              style={{
                                width: 100,
                                height: 75,
                                objectFit: "cover",
                                borderRadius: 8,
                                border: "1px solid rgba(17,24,39,0.12)",
                              }}
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
              </Section>
            )}

            <Section title="Last 3 Orders">
              {(data?.recent?.orders || []).length === 0 ? (
                <p style={{ color: "#6b7280" }}>No orders found.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="table" style={{ width: "100%" }}>
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Status</th>
                        <th>Total</th>
                        <th>Placed At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.recent?.orders || []).map((o) => (
                        <tr key={o._id}>
                          <td>{o._id}</td>
                          <td>{o.orderStatus || ""}</td>
                          <td>{formatMoneyINR(o.totalAmount || 0)}</td>
                          <td>{formatDateTime(o.placedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            <Section title="Last 3 Service Bookings">
              {(data?.recent?.serviceBookings || []).length === 0 ? (
                <p style={{ color: "#6b7280" }}>No service bookings found.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="table" style={{ width: "100%" }}>
                    <thead>
                      <tr>
                        <th>Booking ID</th>
                        <th>Provider</th>
                        <th>Services</th>
                        <th>Status</th>
                        <th>Cost</th>
                        <th>Product Cost</th>
                        <th>Pickup</th>
                        <th>Dropoff</th>
                        <th>Booked At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.recent?.serviceBookings || []).map((b) => (
                        <tr key={b._id}>
                          <td>{b._id}</td>
                          <td>
                            {b.providerId?.name || ""}
                            {b.providerId?.email
                              ? ` (${b.providerId.email})`
                              : ""}
                          </td>
                          <td>{(b.selectedServices || []).join(", ")}</td>
                          <td>{b.status || ""}</td>
                          <td>{formatMoneyINR(b.totalCost || 0)}</td>
                          <td>
                            {b.productCost
                              ? formatMoneyINR(b.productCost)
                              : "—"}
                          </td>
                          <td>
                            {b.needsPickup
                              ? `Yes — ${formatMoneyINR(b.pickupCost || 0)}`
                              : "No"}
                          </td>
                          <td>
                            {b.needsDropoff
                              ? `Yes — ${formatMoneyINR(b.dropoffCost || 0)}`
                              : "No"}
                          </td>
                          <td>{formatDateTime(b.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          </>
        ) : null}

        {/* Provider services list */}
        {role === "Service Provider" &&
        Array.isArray(profile.servicesOffered) ? (
          <Section title="Services Offered">
            {profile.servicesOffered.length === 0 ? (
              <p style={{ color: "#6b7280" }}>No services listed.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {profile.servicesOffered.map((s, idx) => (
                  <li key={idx}>
                    <strong>{s.name}</strong>
                    {s.cost !== undefined && s.cost !== null
                      ? ` — ₹${s.cost}`
                      : ""}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        ) : null}
      </div>
    </>
  );
}
