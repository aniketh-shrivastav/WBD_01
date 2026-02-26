import React, { useEffect, useMemo, useState } from "react";
import ManagerNav from "../../components/ManagerNav";
import "../../Css/manager.css";

function TicketCard({ t, onRespond }) {
  const verified = t.verifiedUser ? (
    <span className="badge badge-success">Verified</span>
  ) : (
    <span className="badge badge-secondary">Guest</span>
  );
  return (
    <div className="stat-card" data-id={t._id}>
      <h3>#{String(t._id).slice(-6)}</h3>
      <p>
        <strong>Name:</strong> {t.name || "N/A"}
      </p>
      <p>
        <strong>Email:</strong> {t.email || "N/A"} {verified}
      </p>
      <p>
        <strong>Subject:</strong> {t.subject || "N/A"}
      </p>
      <p>
        <strong>Message:</strong> {t.message || ""}
      </p>
      <button className="btn-resolve" onClick={() => onRespond(t._id)}>
        Responded
      </button>
    </div>
  );
}

export default function Support() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tickets, setTickets] = useState([]);
  const [term, setTerm] = useState("");

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
        const res = await fetch("/manager/api/support", {
          headers: { Accept: "application/json" },
        });
        if (res.status === 401 || res.status === 403) {
          window.location.href = "/login";
          return;
        }
        if (!res.ok) throw new Error("Failed to load support tickets");
        const j = await res.json();
        if (!cancelled)
          setTickets(Array.isArray(j.submissions) ? j.submissions : []);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load support tickets");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter(
      (t) =>
        (t.name || "").toLowerCase().includes(q) ||
        (t.email || "").toLowerCase().includes(q) ||
        (t.subject || "").toLowerCase().includes(q),
    );
  }, [tickets, term]);

  async function respond(id) {
    if (!window.confirm("Mark this ticket as responded?")) return;
    const btnState = { ok: false };
    try {
      const res = await fetch(`/support/respond/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setTickets((prev) => prev.filter((t) => t._id !== id));
    } catch (e) {
      alert("Failed to mark as responded");
    }
  }

  return (
    <>
      <div className="navbar">
        <div className="logo">
          <h2>Manager's Panel</h2>
        </div>
        <ManagerNav />
      </div>

      <div className="main-content">
        <h1>Support Center</h1>

        <div
          className="filters"
          style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}
        >
          <input
            type="text"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search (name, email, subject)..."
            style={{
              padding: "8px 12px",
              border: "1px solid #ccc",
              borderRadius: 6,
              minWidth: 280,
            }}
          />
        </div>

        {error && (
          <div
            className="error"
            style={{
              color: "var(--danger-color)",
              fontWeight: 600,
              marginTop: 12,
            }}
          >
            {error}
          </div>
        )}
        {loading && (
          <div className="ticket-meta" style={{ marginTop: 12 }}>
            Loading tickets...
          </div>
        )}

        {!loading && !error && (
          <div
            className="tickets-grid"
            style={{
              display: "grid",
              gap: "1.25rem",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              marginTop: "1rem",
            }}
          >
            {filtered.length ? (
              filtered.map((t) => (
                <TicketCard key={t._id} t={t} onRespond={respond} />
              ))
            ) : (
              <p
                className="empty"
                style={{ gridColumn: "1 / -1", color: "var(--text-secondary)" }}
              >
                No support tickets available.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
