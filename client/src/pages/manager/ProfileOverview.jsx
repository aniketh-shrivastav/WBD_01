import React, { useEffect, useMemo, useState } from "react";
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
                {profile.carModel ? (
                  <div>
                    <strong>Car Model:</strong> {profile.carModel}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </Section>

        {/* Service Provider */}
        {role === "Service Provider" ? (
          <>
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
