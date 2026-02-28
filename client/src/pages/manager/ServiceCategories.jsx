import React, { useEffect, useState, useCallback } from "react";
import ManagerNav from "../../components/ManagerNav";
import "../../Css/manager.css";

export default function ServiceCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.body.classList.add("manager-theme");
    return () => document.body.classList.remove("manager-theme");
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/service-categories", {
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      if (res.status === 401 || res.status === 403) {
        window.location.href = "/login";
        return;
      }
      const j = await res.json();
      if (!j.success) throw new Error(j.message || "Failed to load");
      setCategories(j.categories || []);
    } catch (e) {
      setError(e.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addCategory(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/service-categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ name: newName.trim() }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.message || "Failed to add");
      setNewName("");
      load();
    } catch (e) {
      alert(e.message || "Failed to add category");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(cat) {
    try {
      const res = await fetch(`/api/service-categories/${cat._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ active: !cat.active }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.message || "Failed to update");
      setCategories((prev) =>
        prev.map((c) => (c._id === cat._id ? { ...c, active: !c.active } : c)),
      );
    } catch (e) {
      alert(e.message || "Failed to toggle category");
    }
  }

  async function saveEdit() {
    if (!editName.trim() || !editId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/service-categories/${editId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ name: editName.trim() }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.message || "Failed to update");
      setEditId(null);
      setEditName("");
      load();
    } catch (e) {
      alert(e.message || "Failed to update category");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(id) {
    if (!window.confirm("Delete this category permanently?")) return;
    try {
      const res = await fetch(`/api/service-categories/${id}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.message || "Failed to delete");
      setCategories((prev) => prev.filter((c) => c._id !== id));
    } catch (e) {
      alert(e.message || "Failed to delete category");
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
        <section
          style={{
            background: "#fff",
            border: "1px solid rgba(17,24,39,0.12)",
            borderRadius: 12,
            padding: 20,
            boxShadow: "0 8px 24px rgba(17,24,39,0.06)",
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: "0 0 6px", fontSize: 20 }}>
            🛠️ Service Categories
          </h2>
          <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 16px" }}>
            Manage the types of customization services offered on the platform.
            Service providers can only select from these active categories.
          </p>

          {/* Add new category */}
          <form
            onSubmit={addCategory}
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New category name..."
              style={{
                flex: "1 1 250px",
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #d1d5db",
                fontSize: 14,
              }}
            />
            <button
              type="submit"
              disabled={saving || !newName.trim()}
              style={{
                padding: "10px 24px",
                borderRadius: 8,
                background: "#111827",
                color: "#fff",
                border: "none",
                fontWeight: 700,
                cursor: "pointer",
                opacity: saving || !newName.trim() ? 0.5 : 1,
              }}
            >
              {saving ? "Adding..." : "+ Add Category"}
            </button>
          </form>

          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <p style={{ color: "#e74c3c" }}>{error}</p>
          ) : categories.length === 0 ? (
            <p style={{ color: "#6b7280" }}>
              No categories yet. Add one above.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Category Name</th>
                    <th style={{ textAlign: "center", width: 100 }}>Status</th>
                    <th style={{ textAlign: "center", width: 220 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr key={cat._id}>
                      <td>
                        {editId === cat._id ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 6,
                              border: "1px solid #d1d5db",
                              width: "100%",
                              fontSize: 14,
                            }}
                            autoFocus
                          />
                        ) : (
                          <span style={{ fontWeight: 600 }}>{cat.name}</span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 12px",
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 700,
                            background: cat.active
                              ? "rgba(16,185,129,0.12)"
                              : "rgba(239,68,68,0.12)",
                            color: cat.active ? "#059669" : "#dc2626",
                          }}
                        >
                          {cat.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            justifyContent: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          {editId === cat._id ? (
                            <>
                              <button
                                onClick={saveEdit}
                                disabled={saving}
                                style={{
                                  padding: "5px 14px",
                                  borderRadius: 6,
                                  background: "#059669",
                                  color: "#fff",
                                  border: "none",
                                  cursor: "pointer",
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditId(null);
                                  setEditName("");
                                }}
                                style={{
                                  padding: "5px 14px",
                                  borderRadius: 6,
                                  background: "#6b7280",
                                  color: "#fff",
                                  border: "none",
                                  cursor: "pointer",
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setEditId(cat._id);
                                  setEditName(cat.name);
                                }}
                                style={{
                                  padding: "5px 14px",
                                  borderRadius: 6,
                                  background: "#2563eb",
                                  color: "#fff",
                                  border: "none",
                                  cursor: "pointer",
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => toggleActive(cat)}
                                style={{
                                  padding: "5px 14px",
                                  borderRadius: 6,
                                  background: cat.active
                                    ? "#f59e0b"
                                    : "#10b981",
                                  color: "#fff",
                                  border: "none",
                                  cursor: "pointer",
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                {cat.active ? "Deactivate" : "Activate"}
                              </button>
                              <button
                                onClick={() => deleteCategory(cat._id)}
                                style={{
                                  padding: "5px 14px",
                                  borderRadius: 6,
                                  background: "#dc2626",
                                  color: "#fff",
                                  border: "none",
                                  cursor: "pointer",
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
