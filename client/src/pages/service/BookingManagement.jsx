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

export default function BookingManagement() {
  useLink("/styles/bookingManagement.css");
  useLink(
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css",
  );

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookings, setBookings] = useState([]);
  const [viewDetail, setViewDetail] = useState(null);

  // UI filters
  const [activeTab, setActiveTab] = useState("Open");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("Newest Order Sent");
  const [selected, setSelected] = useState(new Set());

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = bookings.filter((b) => {
      const statusOK = b.status === activeTab;
      const searchOK =
        !term ||
        (b.customerName || "").toLowerCase().includes(term) ||
        (b.customerEmail || "").toLowerCase().includes(term);
      return statusOK && searchOK;
    });
    rows.sort((a, b) => {
      const aDate = new Date(a.createdAt).getTime();
      const bDate = new Date(b.createdAt).getTime();
      return sortOrder === "Newest Order Sent" ? bDate - aDate : aDate - bDate;
    });
    return rows;
  }, [bookings, activeTab, search, sortOrder]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/service/api/bookings", {
          headers: { Accept: "application/json" },
        });
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!res.ok) throw new Error("Failed to load bookings");
        const j = await res.json();
        if (!j.success) throw new Error(j.message || "Failed to load");
        if (!cancelled) setBookings(j.bookings || []);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggle(id, checked) {
    setSelected((set) => {
      const next = new Set(set);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function updateBooking(orderId, status, totalCost) {
    try {
      const body = { orderId };
      if (status) body.status = status;
      if (typeof totalCost !== "undefined") body.totalCost = totalCost;
      const res = await fetch("/service/updateBooking", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Update failed");
    } catch (e) {
      alert(e.message || "Error updating booking");
      throw e;
    }
  }

  async function bulkUpdate(newStatus) {
    if (!selected.size) return alert("Please select at least one order.");
    const orderIds = Array.from(selected);
    const res = await fetch("/service/updateMultipleBookingStatus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderIds, newStatus }),
    });
    const out = await res.json().catch(() => ({}));
    if (!out.success) return alert("Bulk update failed");
    // reload
    setSelected(new Set());
    // Quick local update for snappier UI
    setBookings((list) =>
      list.map((b) =>
        orderIds.includes(String(b._id)) || orderIds.includes(b.id)
          ? { ...b, status: newStatus }
          : b,
      ),
    );
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
            setSidebarOpen((s) => !s);
          }}
        >
          ☰
        </a>
        <div className="nav-links" id="navLinks">
          <a href="/service/dashboard">Dashboard</a>
          <a href="/service/profileSettings">Profile Settings</a>
          <a href="/service/bookingManagement" className="active">
            Booking Management
          </a>
          <a href="/service/reviews">Reviews & Ratings</a>
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
        <a href="/service/bookingManagement" className="active">
          <i className="fas fa-calendar-alt" />
        </a>
        <a href="/service/customerCommunication">
          <i className="fas fa-comments" />
        </a>
        <a href="/service/earnings">
          <i className="fas fa-money-bill-wave" />
        </a>
        <a href="/service/reviews">
          <i className="fas fa-star" />
        </a>
      </div>

      <div className="order-container">
        <div
          className="instructions"
          style={{
            background: "#fff4e5",
            border: "1px solid #ffa500",
            padding: 10,
            marginBottom: 15,
            borderRadius: 8,
          }}
        >
          <h3>🔔 Please follow these guidelines before taking any action:</h3>
          <ul style={{ paddingLeft: 20 }}>
            <li>
              📌 <strong>Description must include the vehicle number</strong>.
              If not present, <strong>reject</strong> the order.
            </li>
            <li>
              📞 <strong>Always call the customer</strong> before confirming,
              rejecting, or changing the price of an order.
            </li>
            <li>
              📦 If the order includes a service <strong>with a product</strong>
              , <strong>wait for the product to arrive</strong> before
              confirming.
            </li>
            <li>
              📍 Ensure the{" "}
              <strong>customer’s address is within your service range</strong>{" "}
              before proceeding.
            </li>
          </ul>
        </div>

        <div className="filter-section">
          <div className="filter-left">
            <input
              type="text"
              id="searchInput"
              placeholder="Search by Customer ID or Name"
              className="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="dropdown"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option>Newest Order Sent</option>
              <option>Oldest Order Sent</option>
            </select>
            <button className="filter-btn" onClick={(e) => e.preventDefault()}>
              Filter
            </button>
          </div>
          <div className="filter-info">Showing {filtered.length} orders</div>
        </div>

        <div className="order-header">
          {["Open", "Confirmed", "Ready", "Rejected"].map((tab) => (
            <button
              key={tab}
              className={`tab ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <table className="order-table">
          <thead>
            <tr>
              <th></th>
              <th>Service ID</th>
              <th>Service</th>
              <th>Description</th>
              <th>Car Model</th>
              <th>Customer Name</th>
              <th>Customer email</th>
              <th>Phone Number</th>
              <th>Address</th>
              <th>District</th>
              <th>Status</th>
              <th>Order Sent</th>
              <th>Total Cost</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => {
              const id = String(o.id || o._id);
              const editableCost = o.status === "Open";
              const dateStr = new Date(o.createdAt).toLocaleDateString();
              return (
                <tr key={id}>
                  <td>
                    <input
                      type="checkbox"
                      className="order-checkbox"
                      checked={selected.has(id)}
                      onChange={(e) => toggle(id, e.target.checked)}
                    />
                  </td>
                  <td>{id}</td>
                  <td>{(o.selectedServices || []).join(", ")}</td>
                  <td>{o.description}</td>
                  <td>{o.carModel}</td>
                  <td>{o.customerName}</td>
                  <td>{o.customerEmail}</td>
                  <td>{o.phone}</td>
                  <td>{o.address}</td>
                  <td>{o.district}</td>
                  <td>{o.status}</td>
                  <td>{dateStr}</td>
                  <td>
                    {editableCost ? (
                      <CostEditor
                        value={o.totalCost || 0}
                        onSave={async (val) => {
                          await updateBooking(id, undefined, val);
                        }}
                      />
                    ) : (
                      <>₹{o.totalCost || 0}</>
                    )}
                  </td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        className="btn"
                        style={{
                          background: "#3498db",
                          color: "#fff",
                          padding: "4px 10px",
                          borderRadius: 4,
                          fontSize: 12,
                        }}
                        onClick={() => setViewDetail(o)}
                      >
                        View Details
                      </button>
                      {o.status === "Confirmed" ? (
                        <button
                          className="btn btn-ready"
                          onClick={async () => {
                            await updateBooking(id, "Ready");
                            setBookings((list) =>
                              list.map((b) =>
                                String(b._id) === id || String(b.id) === id
                                  ? { ...b, status: "Ready" }
                                  : b,
                              ),
                            );
                          }}
                        >
                          Mark as Ready
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {activeTab === "Open" ? (
          <div className="action-buttons">
            <button
              className="confirm-btn"
              onClick={() => bulkUpdate("Confirmed")}
            >
              ✅ Confirm
            </button>
            <button
              className="reject-btn"
              onClick={() => bulkUpdate("Rejected")}
            >
              ❌ Reject
            </button>
          </div>
        ) : null}
      </div>

      {/* Vehicle Details Modal */}
      {viewDetail && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setViewDetail(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              width: "90%",
              maxWidth: 600,
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "24px",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setViewDetail(null)}
              style={{
                position: "absolute",
                top: 12,
                right: 16,
                background: "none",
                border: "none",
                fontSize: 22,
                cursor: "pointer",
              }}
            >
              ×
            </button>
            <h3 style={{ marginBottom: 16 }}>🚗 Vehicle & Booking Details</h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px 20px",
                fontSize: 14,
              }}
            >
              {[
                ["Customer", viewDetail.customerName],
                ["Email", viewDetail.customerEmail],
                ["Phone", viewDetail.phone],
                ["Address", viewDetail.address],
                ["District", viewDetail.district],
                ["Car Model", viewDetail.carModel],
                ["Reg. Number", viewDetail.registrationNumber],
                ["Make", viewDetail.vehicleMake],
                ["Model", viewDetail.vehicleModel],
                ["Variant", viewDetail.vehicleVariant],
                ["Fuel Type", viewDetail.fuelType],
                ["Transmission", viewDetail.transmission],
                ["Year of Mfg", viewDetail.yearOfManufacture],
                ["VIN", viewDetail.vin],
                [
                  "Mileage",
                  viewDetail.currentMileage
                    ? `${viewDetail.currentMileage} km`
                    : "",
                ],
                ["Insurance Provider", viewDetail.insuranceProvider],
                [
                  "Insurance Valid Till",
                  viewDetail.insuranceValidTill
                    ? new Date(
                        viewDetail.insuranceValidTill,
                      ).toLocaleDateString()
                    : "",
                ],
                ["Services", (viewDetail.selectedServices || []).join(", ")],
                ["Description", viewDetail.description],
                ["Status", viewDetail.status],
                [
                  "Total Cost",
                  viewDetail.totalCost ? `₹${viewDetail.totalCost}` : "—",
                ],
              ]
                .filter(([, v]) => v)
                .map(([label, val]) => (
                  <div key={label}>
                    <div
                      style={{
                        fontWeight: 600,
                        color: "#555",
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

            {/* Document Links */}
            {(viewDetail.rcBook || viewDetail.insuranceCopy) && (
              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                {viewDetail.rcBook && (
                  <a
                    href={viewDetail.rcBook}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "6px 14px",
                      borderRadius: 6,
                      background: "#e8f4fd",
                      color: "#2980b9",
                      textDecoration: "none",
                      fontSize: 13,
                    }}
                  >
                    📄 RC Book
                  </a>
                )}
                {viewDetail.insuranceCopy && (
                  <a
                    href={viewDetail.insuranceCopy}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "6px 14px",
                      borderRadius: 6,
                      background: "#e8f4fd",
                      color: "#2980b9",
                      textDecoration: "none",
                      fontSize: 13,
                    }}
                  >
                    📄 Insurance Copy
                  </a>
                )}
              </div>
            )}

            {/* Vehicle Photos */}
            {viewDetail.vehiclePhotos &&
              viewDetail.vehiclePhotos.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      marginBottom: 8,
                      fontSize: 13,
                      color: "#555",
                    }}
                  >
                    Vehicle Photos
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {viewDetail.vehiclePhotos.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer">
                        <img
                          src={url}
                          alt={`Vehicle ${i + 1}`}
                          style={{
                            width: 90,
                            height: 70,
                            objectFit: "cover",
                            borderRadius: 6,
                            border: "1px solid #ddd",
                          }}
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

            <div style={{ textAlign: "right", marginTop: 20 }}>
              <button
                onClick={() => setViewDetail(null)}
                style={{
                  padding: "8px 24px",
                  borderRadius: 6,
                  background: "#3498db",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {error ? (
        <div
          style={{
            position: "fixed",
            bottom: 12,
            right: 12,
            background: "#e74c3c",
            color: "#fff",
            padding: "8px 12px",
            borderRadius: 6,
          }}
        >
          {error}
        </div>
      ) : null}
    </>
  );
}

function CostEditor({ value, onSave }) {
  const [val, setVal] = useState(value || 0);
  const [saving, setSaving] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
          await onSave(Number(val));
          alert("Price saved successfully.");
        } finally {
          setSaving(false);
        }
      }}
    >
      <input
        type="number"
        min={0}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        style={{ width: 80 }}
      />
      <button
        type="submit"
        disabled={saving}
        style={{ padding: "2px 5px", marginLeft: 4 }}
      >
        💾
      </button>
    </form>
  );
}
