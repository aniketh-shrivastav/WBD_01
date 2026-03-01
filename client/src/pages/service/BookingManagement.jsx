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

export default function BookingManagement() {
  useLink("/styles/bookingManagement.css");
  useLink(
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css",
  );

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
    <div className="service-page">
      <ServiceNav />
      <main className="service-main">
        <div className="order-container">
          <div className="sp-instructions">
            <h3>🔔 Please follow these guidelines before taking any action:</h3>
            <ul>
              <li>
                📌 <strong>Description must include the vehicle number</strong>.
                If not present, <strong>reject</strong> the order.
              </li>
              <li>
                📞 <strong>Always call the customer</strong> before confirming,
                rejecting, or changing the price of an order.
              </li>
              <li>
                📦 If the order includes a service{" "}
                <strong>with a product</strong>,{" "}
                <strong>wait for the product to arrive</strong> before
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
              <button
                className="filter-btn"
                onClick={(e) => e.preventDefault()}
              >
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
                <th>Vehicle</th>
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
                    <td>
                      {[o.vehicleMake, o.vehicleModel]
                        .filter(Boolean)
                        .join(" ") ||
                        o.carModel ||
                        "—"}
                    </td>
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
                      <div className="sp-action-cell">
                        <button
                          className="btn btn-view-detail"
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
          <div className="sp-modal-overlay" onClick={() => setViewDetail(null)}>
            <div className="sp-modal" onClick={(e) => e.stopPropagation()}>
              <div className="sp-modal-header">
                <h3>🚗 Vehicle & Booking Details</h3>
                <button
                  className="sp-modal-close"
                  onClick={() => setViewDetail(null)}
                >
                  ×
                </button>
              </div>

              <div className="sp-modal-body">
                <div className="sp-detail-grid">
                  {[
                    ["Customer", viewDetail.customerName],
                    ["Email", viewDetail.customerEmail],
                    ["Phone", viewDetail.phone],
                    ["Address", viewDetail.address],
                    ["District", viewDetail.district],
                    [
                      "Vehicle",
                      [
                        viewDetail.vehicleMake,
                        viewDetail.vehicleModel,
                        viewDetail.vehicleVariant,
                      ]
                        .filter(Boolean)
                        .join(" ") ||
                        viewDetail.carModel ||
                        "—",
                    ],
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
                    ["Service Category", viewDetail.serviceCategory],
                    [
                      "Services",
                      (viewDetail.selectedServices || []).join(", "),
                    ],
                    ["Description", viewDetail.description],
                    [
                      "Pickup",
                      viewDetail.needsPickup
                        ? `Yes — ₹${viewDetail.pickupCost || 0}`
                        : "No",
                    ],
                    [
                      "Dropoff",
                      viewDetail.needsDropoff
                        ? `Yes — ₹${viewDetail.dropoffCost || 0}`
                        : "No",
                    ],
                    [
                      "Product Cost",
                      viewDetail.productCost
                        ? `₹${viewDetail.productCost}`
                        : "—",
                    ],
                    ["Status", viewDetail.status],
                    [
                      "Total Cost",
                      viewDetail.totalCost ? `₹${viewDetail.totalCost}` : "—",
                    ],
                  ]
                    .filter(([, v]) => v)
                    .map(([label, val]) => (
                      <div key={label}>
                        <div className="sp-detail-label">{label}</div>
                        <div className="sp-detail-value">{val}</div>
                      </div>
                    ))}
                </div>

                {/* Product Cost Editor */}
                {viewDetail.status !== "Declined" && (
                  <>
                    <hr className="sp-section-divider" />
                    <div className="sp-product-cost-box">
                      <h4>Add / Update Product Cost</h4>
                      <p>
                        Add the cost of products/parts used for this booking.
                        This will be added to the total cost.
                      </p>
                      <ProductCostEditor
                        bookingId={viewDetail._id || viewDetail.id}
                        currentCost={viewDetail.productCost || 0}
                        onSaved={(newCost, newTotal) => {
                          setViewDetail((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  productCost: newCost,
                                  totalCost: newTotal,
                                }
                              : prev,
                          );
                          setBookings((list) =>
                            list.map((b) =>
                              (b._id || b.id) ===
                              (viewDetail._id || viewDetail.id)
                                ? {
                                    ...b,
                                    productCost: newCost,
                                    totalCost: newTotal,
                                  }
                                : b,
                            ),
                          );
                        }}
                      />
                    </div>

                    {/* Parts Resolution — Link platform products to booking */}
                    <hr className="sp-section-divider" />
                    <PartsResolver
                      bookingId={viewDetail._id || viewDetail.id}
                      linkedProducts={viewDetail.linkedProducts || []}
                      onUpdate={(linkedProducts, totalCost, productCost) => {
                        setViewDetail((prev) =>
                          prev
                            ? {
                                ...prev,
                                linkedProducts,
                                totalCost,
                                productCost,
                              }
                            : prev,
                        );
                        setBookings((list) =>
                          list.map((b) =>
                            (b._id || b.id) ===
                            (viewDetail._id || viewDetail.id)
                              ? { ...b, linkedProducts, totalCost, productCost }
                              : b,
                          ),
                        );
                      }}
                    />
                  </>
                )}

                {/* Document Links */}
                {(viewDetail.rcBook || viewDetail.insuranceCopy) && (
                  <>
                    <hr className="sp-section-divider" />
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      {viewDetail.rcBook && (
                        <a
                          href={viewDetail.rcBook}
                          target="_blank"
                          rel="noreferrer"
                          className="sp-doc-link"
                        >
                          📄 RC Book
                        </a>
                      )}
                      {viewDetail.insuranceCopy && (
                        <a
                          href={viewDetail.insuranceCopy}
                          target="_blank"
                          rel="noreferrer"
                          className="sp-doc-link"
                        >
                          📄 Insurance Copy
                        </a>
                      )}
                    </div>
                  </>
                )}

                {/* Vehicle Photos */}
                {viewDetail.vehiclePhotos &&
                  viewDetail.vehiclePhotos.length > 0 && (
                    <>
                      <hr className="sp-section-divider" />
                      <div
                        className="sp-detail-label"
                        style={{ marginBottom: 10 }}
                      >
                        Vehicle Photos
                      </div>
                      <div className="sp-photo-grid">
                        {viewDetail.vehiclePhotos.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <img src={url} alt={`Vehicle ${i + 1}`} />
                          </a>
                        ))}
                      </div>
                    </>
                  )}
              </div>

              <div className="sp-modal-footer">
                <button
                  className="btn edit-btn"
                  onClick={() => setViewDetail(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {error ? <div className="sp-error-toast">{error}</div> : null}
      </main>
      <ServiceFooter />
    </div>
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
        className="sp-cost-inline-input"
      />
      <button type="submit" disabled={saving}>
        💾
      </button>
    </form>
  );
}

function ProductCostEditor({ bookingId, currentCost, onSaved }) {
  const [val, setVal] = useState(currentCost || 0);
  const [saving, setSaving] = useState(false);
  return (
    <form
      className="sp-cost-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
          const res = await fetch("/service/api/update-product-cost", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ bookingId, productCost: Number(val) }),
          });
          const j = await res.json().catch(() => ({}));
          if (!res.ok) {
            alert("Error: " + (j.error || "Failed to update product cost"));
            return;
          }
          alert("Product cost updated successfully.");
          if (onSaved) onSaved(Number(val), j.totalCost);
        } catch {
          alert("Failed to update product cost.");
        } finally {
          setSaving(false);
        }
      }}
    >
      <span>₹</span>
      <input
        type="number"
        min={0}
        step="0.01"
        value={val}
        onChange={(e) => setVal(e.target.value)}
      />
      <button type="submit" disabled={saving}>
        {saving ? "Saving..." : "Save"}
      </button>
    </form>
  );
}

/* ─────────────────── Parts Resolver Component ─────────────────── */

function PartsResolver({ bookingId, linkedProducts = [], onUpdate }) {
  const [searchQ, setSearchQ] = useState("");
  const [searchCat, setSearchCat] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState(null); // productId being linked
  const [quantities, setQuantities] = useState({}); // productId -> qty
  const [categories, setCategories] = useState([]);
  const [updatingStatus, setUpdatingStatus] = useState(null);

  // Fetch product categories for filter
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/product-categories/active", {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const j = await res.json();
        if (j.success) setCategories(j.categories || []);
      } catch {}
    })();
  }, []);

  async function search() {
    try {
      setSearching(true);
      const params = new URLSearchParams();
      if (searchQ.trim()) params.set("q", searchQ.trim());
      if (searchCat) params.set("category", searchCat);
      const res = await fetch(`/api/parts/search?${params}`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const j = await res.json();
      if (j.success) setResults(j.products || []);
      else alert(j.message || "Search failed");
    } catch (e) {
      alert("Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function linkProduct(productId) {
    try {
      setLinking(productId);
      const qty = quantities[productId] || 1;
      const res = await fetch("/api/parts/link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          bookingId,
          productId,
          quantity: qty,
          installationRequired: true,
        }),
      });
      const j = await res.json();
      if (!j.success) return alert(j.message || "Failed to link product");
      if (onUpdate) onUpdate(j.linkedProducts, j.totalCost, j.productCost);
      alert("Product linked successfully!");
    } catch {
      alert("Failed to link product");
    } finally {
      setLinking(null);
    }
  }

  async function unlinkProduct(productId) {
    if (!window.confirm("Remove this part from the booking?")) return;
    try {
      const res = await fetch("/api/parts/unlink", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ bookingId, productId }),
      });
      const j = await res.json();
      if (!j.success) return alert(j.message || "Failed to unlink");
      if (onUpdate) onUpdate(j.linkedProducts, j.totalCost, j.productCost);
    } catch {
      alert("Failed to unlink product");
    }
  }

  async function changeAllocationStatus(productId, status) {
    try {
      setUpdatingStatus(productId);
      const res = await fetch("/api/parts/allocation-status", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ bookingId, productId, status }),
      });
      const j = await res.json();
      if (!j.success) return alert(j.message || "Failed to update status");
      if (onUpdate) {
        // Refresh from server response
        const refetch = await fetch(`/api/parts/booking/${bookingId}`, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        const rj = await refetch.json();
        if (rj.success)
          onUpdate(rj.linkedProducts, rj.totalCost, rj.productCost);
      }
    } catch {
      alert("Failed to update allocation status");
    } finally {
      setUpdatingStatus(null);
    }
  }

  const statusColors = {
    reserved: { bg: "#fffbeb", color: "#b45309", label: "Reserved" },
    allocated: { bg: "#eff6ff", color: "#2563eb", label: "Allocated" },
    installed: { bg: "#ecfdf5", color: "#059669", label: "Installed" },
    returned: { bg: "#fef2f2", color: "#dc2626", label: "Returned" },
  };

  const nextActions = {
    reserved: [
      { label: "Mark Allocated", status: "allocated", color: "#2563eb" },
      { label: "Return", status: "returned", color: "#dc2626" },
    ],
    allocated: [
      { label: "Mark Installed", status: "installed", color: "#059669" },
      { label: "Return", status: "returned", color: "#dc2626" },
    ],
    installed: [],
    returned: [],
  };

  return (
    <div className="sp-product-cost-box">
      <h4>🔧 Parts Resolution — Link Platform Products</h4>
      <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 12px" }}>
        Search the product catalog, link parts to this booking, and manage
        allocation. Linked parts auto-reserve stock (no shipping triggered).
      </p>

      {/* Currently linked parts */}
      {linkedProducts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <strong style={{ fontSize: 13 }}>
            Linked Parts ({linkedProducts.length})
          </strong>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginTop: 8,
            }}
          >
            {linkedProducts.map((lp, i) => {
              const pid = lp.productId?._id || lp.productId;
              const pName = lp.productId?.name || lp.productName || "Product";
              const sc =
                statusColors[lp.allocationStatus] || statusColors.reserved;
              const actions = nextActions[lp.allocationStatus] || [];
              return (
                <div
                  key={i}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: "10px 14px",
                    background: "#fafafa",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontWeight: 600, flex: "1 1 auto" }}>
                    {pName}
                  </span>
                  <span>×{lp.quantity}</span>
                  <span style={{ fontWeight: 600 }}>₹{lp.totalPrice || 0}</span>
                  <span
                    style={{
                      padding: "2px 10px",
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 700,
                      background: sc.bg,
                      color: sc.color,
                    }}
                  >
                    {sc.label}
                  </span>
                  {lp.installationRequired && (
                    <span style={{ fontSize: 11, color: "#6b7280" }}>
                      🔩 Installation
                    </span>
                  )}
                  {actions.map((a) => (
                    <button
                      key={a.status}
                      disabled={updatingStatus === pid}
                      onClick={() => changeAllocationStatus(pid, a.status)}
                      style={{
                        padding: "3px 10px",
                        borderRadius: 6,
                        border: "none",
                        cursor: "pointer",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#fff",
                        background: a.color,
                        opacity: updatingStatus === pid ? 0.5 : 1,
                      }}
                    >
                      {a.label}
                    </button>
                  ))}
                  {(lp.allocationStatus === "reserved" ||
                    lp.allocationStatus === "allocated") && (
                    <button
                      onClick={() => unlinkProduct(pid)}
                      style={{
                        padding: "3px 10px",
                        borderRadius: 6,
                        border: "none",
                        cursor: "pointer",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#fff",
                        background: "#6b7280",
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search bar */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 12,
          alignItems: "flex-end",
        }}
      >
        <input
          type="text"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder="Search parts (name, brand, SKU)..."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              search();
            }
          }}
          style={{
            flex: "1 1 200px",
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #d1d5db",
            fontSize: 13,
          }}
        />
        <select
          value={searchCat}
          onChange={(e) => setSearchCat(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid #d1d5db",
            fontSize: 13,
          }}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          onClick={search}
          disabled={searching}
          style={{
            padding: "8px 18px",
            borderRadius: 6,
            border: "none",
            background: "#111827",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            opacity: searching ? 0.5 : 1,
          }}
        >
          {searching ? "Searching..." : "🔍 Search"}
        </button>
      </div>

      {/* Search Results */}
      {results.length > 0 && (
        <div
          style={{
            maxHeight: 300,
            overflowY: "auto",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
          }}
        >
          <table
            style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}
          >
            <thead>
              <tr style={{ background: "#f9fafb", position: "sticky", top: 0 }}>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>
                  Product
                </th>
                <th style={{ padding: "8px 10px", textAlign: "left" }}>
                  Category
                </th>
                <th style={{ padding: "8px 10px", textAlign: "right" }}>
                  Price
                </th>
                <th style={{ padding: "8px 10px", textAlign: "right" }}>
                  In Stock
                </th>
                <th style={{ padding: "8px 10px", textAlign: "center" }}>
                  Qty
                </th>
                <th style={{ padding: "8px 10px", textAlign: "center" }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {results.map((p) => {
                const isLinked = linkedProducts.some(
                  (lp) =>
                    String(lp.productId?._id || lp.productId) === String(p._id),
                );
                return (
                  <tr key={p._id} style={{ borderTop: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "8px 10px" }}>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ color: "#6b7280", fontSize: 11 }}>
                        {p.brand} &middot; {p.sku}
                      </div>
                      {p.compatibility && (
                        <div style={{ color: "#9ca3af", fontSize: 11 }}>
                          Fits: {p.compatibility}
                        </div>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "8px 10px",
                        fontSize: 11,
                        color: "#6b7280",
                      }}
                    >
                      {p.category}
                      {p.subcategory ? ` > ${p.subcategory}` : ""}
                    </td>
                    <td
                      style={{
                        padding: "8px 10px",
                        textAlign: "right",
                        fontWeight: 600,
                      }}
                    >
                      ₹{p.price}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right" }}>
                      <span
                        style={{
                          color: p.availableStock > 0 ? "#059669" : "#dc2626",
                          fontWeight: 600,
                        }}
                      >
                        {p.availableStock}
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center" }}>
                      <input
                        type="number"
                        min={1}
                        max={p.availableStock}
                        value={quantities[p._id] || 1}
                        onChange={(e) =>
                          setQuantities((prev) => ({
                            ...prev,
                            [p._id]: parseInt(e.target.value, 10) || 1,
                          }))
                        }
                        style={{
                          width: 50,
                          padding: "4px 6px",
                          borderRadius: 4,
                          border: "1px solid #d1d5db",
                          textAlign: "center",
                          fontSize: 12,
                        }}
                      />
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center" }}>
                      {isLinked ? (
                        <span
                          style={{
                            fontSize: 11,
                            color: "#059669",
                            fontWeight: 600,
                          }}
                        >
                          ✓ Linked
                        </span>
                      ) : p.availableStock <= 0 ? (
                        <span style={{ fontSize: 11, color: "#dc2626" }}>
                          Out of stock
                        </span>
                      ) : (
                        <button
                          disabled={linking === p._id}
                          onClick={() => linkProduct(p._id)}
                          style={{
                            padding: "4px 12px",
                            borderRadius: 6,
                            border: "none",
                            background: "#4f46e5",
                            color: "#fff",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                            opacity: linking === p._id ? 0.5 : 1,
                          }}
                        >
                          {linking === p._id ? "Linking..." : "+ Link"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
