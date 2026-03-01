import React, { useEffect, useState, useCallback } from "react";
import ManagerNav from "../../components/ManagerNav";
import "../../Css/manager.css";

const API = "/api/product-categories";

export default function ProductCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add category form
  const [newName, setNewName] = useState("");
  const [newSubs, setNewSubs] = useState("");
  const [newCompliance, setNewCompliance] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCompliance, setEditCompliance] = useState(false);

  // Subcategory add
  const [addSubId, setAddSubId] = useState(null);
  const [addSubName, setAddSubName] = useState("");

  // Expanded rows
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    document.body.classList.add("manager-theme");
    return () => document.body.classList.remove("manager-theme");
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(API, {
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

  /* ─── Add category ─── */
  async function addCategory(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const subcategories = newSubs
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch(API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: newName.trim(),
          subcategories,
          requiresCompliance: newCompliance,
        }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.message || "Failed to add");
      setNewName("");
      setNewSubs("");
      setNewCompliance(false);
      load();
    } catch (e) {
      alert(e.message || "Failed to add category");
    } finally {
      setSaving(false);
    }
  }

  /* ─── Toggle active ─── */
  async function toggleActive(cat) {
    try {
      const res = await fetch(`${API}/${cat._id}`, {
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

  /* ─── Toggle compliance ─── */
  async function toggleCompliance(cat) {
    try {
      const res = await fetch(`${API}/${cat._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ requiresCompliance: !cat.requiresCompliance }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.message || "Failed to update");
      setCategories((prev) =>
        prev.map((c) =>
          c._id === cat._id
            ? { ...c, requiresCompliance: !c.requiresCompliance }
            : c,
        ),
      );
    } catch (e) {
      alert(e.message || "Failed to toggle compliance");
    }
  }

  /* ─── Rename category ─── */
  async function saveEdit() {
    if (!editName.trim() || !editId) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/${editId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: editName.trim(),
          requiresCompliance: editCompliance,
        }),
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

  /* ─── Delete category ─── */
  async function deleteCategory(id) {
    if (
      !window.confirm(
        "Delete this category and all its subcategories permanently?",
      )
    )
      return;
    try {
      const res = await fetch(`${API}/${id}`, {
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

  /* ─── Add subcategory ─── */
  async function addSubcategory(catId) {
    if (!addSubName.trim()) return;
    try {
      const res = await fetch(`${API}/${catId}/subcategory`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ subcategory: addSubName.trim() }),
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.message || "Failed to add");
      setAddSubId(null);
      setAddSubName("");
      setCategories((prev) =>
        prev.map((c) => (c._id === catId ? j.category : c)),
      );
    } catch (e) {
      alert(e.message || "Failed to add subcategory");
    }
  }

  /* ─── Remove subcategory ─── */
  async function removeSubcategory(catId, subIndex) {
    if (!window.confirm("Remove this subcategory?")) return;
    try {
      const res = await fetch(`${API}/${catId}/subcategory/${subIndex}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      const j = await res.json();
      if (!j.success) throw new Error(j.message || "Failed to remove");
      setCategories((prev) =>
        prev.map((c) => (c._id === catId ? j.category : c)),
      );
    } catch (e) {
      alert(e.message || "Failed to remove subcategory");
    }
  }

  function toggleExpand(id) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  /* ─── Inline styles ─── */
  const cardStyle = {
    background: "#fff",
    border: "1px solid rgba(17,24,39,0.12)",
    borderRadius: 12,
    padding: 20,
    boxShadow: "0 8px 24px rgba(17,24,39,0.06)",
    marginBottom: 16,
  };
  const btnBase = {
    padding: "5px 14px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    color: "#fff",
  };

  return (
    <>
      <div className="navbar">
        <div className="logo">
          <h2>Manager's Panel</h2>
        </div>
        <ManagerNav />
      </div>

      <div className="main-content">
        <section style={cardStyle}>
          <h2 style={{ margin: "0 0 6px", fontSize: 20 }}>
            📦 Product Categories
          </h2>
          <p style={{ color: "#6b7280", fontSize: 14, margin: "0 0 16px" }}>
            Manage categories &amp; subcategories for seller products.
            Categories with the ⚠️ compliance flag require legal approval for
            listed products.
          </p>

          {/* ─── Add new category form ─── */}
          <form
            onSubmit={addCategory}
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 20,
              flexWrap: "wrap",
              alignItems: "flex-end",
            }}
          >
            <div style={{ flex: "1 1 220px" }}>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#374151",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Category Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Exterior Customization"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  fontSize: 14,
                }}
              />
            </div>
            <div style={{ flex: "1 1 300px" }}>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#374151",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Subcategories (comma-separated)
              </label>
              <input
                type="text"
                value={newSubs}
                onChange={(e) => setNewSubs(e.target.value)}
                placeholder="e.g. Body Kits, Spoilers, Car Wraps"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  fontSize: 14,
                }}
              />
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
                color: "#b45309",
                cursor: "pointer",
                padding: "10px 0",
              }}
            >
              <input
                type="checkbox"
                checked={newCompliance}
                onChange={(e) => setNewCompliance(e.target.checked)}
              />
              ⚠️ Compliance
            </label>
            <button
              type="submit"
              disabled={saving || !newName.trim()}
              style={{
                ...btnBase,
                padding: "10px 24px",
                borderRadius: 8,
                background: "#111827",
                fontWeight: 700,
                fontSize: 14,
                opacity: saving || !newName.trim() ? 0.5 : 1,
              }}
            >
              {saving ? "Adding..." : "+ Add Category"}
            </button>
          </form>

          {/* ─── Category list ─── */}
          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <p style={{ color: "#e74c3c" }}>{error}</p>
          ) : categories.length === 0 ? (
            <p style={{ color: "#6b7280" }}>
              No categories yet. Add one above.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {categories.map((cat) => {
                const isExpanded = expanded[cat._id];
                const isEditing = editId === cat._id;

                return (
                  <div
                    key={cat._id}
                    style={{
                      border: `1.5px solid ${cat.active ? "#e5e7eb" : "#fecaca"}`,
                      borderRadius: 10,
                      padding: 16,
                      background: cat.active ? "#fafafa" : "#fef2f2",
                      transition: "all 0.2s",
                    }}
                  >
                    {/* ─── Category header row ─── */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      {/* Expand arrow */}
                      <button
                        onClick={() => toggleExpand(cat._id)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: 16,
                          padding: 0,
                          lineHeight: 1,
                          transform: isExpanded ? "rotate(90deg)" : "none",
                          transition: "transform 0.2s",
                        }}
                        title="Toggle subcategories"
                      >
                        ▶
                      </button>

                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            style={{
                              flex: "1 1 200px",
                              padding: "6px 10px",
                              borderRadius: 6,
                              border: "1px solid #d1d5db",
                              fontSize: 14,
                            }}
                            autoFocus
                          />
                          <label
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 12,
                              fontWeight: 600,
                              color: "#b45309",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={editCompliance}
                              onChange={(e) =>
                                setEditCompliance(e.target.checked)
                              }
                            />
                            ⚠️ Compliance
                          </label>
                        </>
                      ) : (
                        <>
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: 15,
                              flex: "1 1 auto",
                            }}
                          >
                            {cat.name}
                          </span>
                          {cat.requiresCompliance && (
                            <span
                              style={{
                                background: "#fffbeb",
                                color: "#b45309",
                                padding: "2px 10px",
                                borderRadius: 20,
                                fontSize: 11,
                                fontWeight: 700,
                                border: "1px solid #fde68a",
                              }}
                            >
                              ⚠️ Compliance Required
                            </span>
                          )}
                        </>
                      )}

                      <span
                        style={{
                          background: "#f3f4f6",
                          color: "#6b7280",
                          padding: "2px 10px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {cat.subcategories?.length || 0} subcategories
                      </span>

                      {/* Status badge */}
                      <span
                        style={{
                          padding: "3px 12px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 700,
                          background: cat.active
                            ? "rgba(16,185,129,0.12)"
                            : "rgba(239,68,68,0.12)",
                          color: cat.active ? "#059669" : "#dc2626",
                        }}
                      >
                        {cat.active ? "Active" : "Inactive"}
                      </span>

                      {/* Action buttons */}
                      <div
                        style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
                      >
                        {isEditing ? (
                          <>
                            <button
                              onClick={saveEdit}
                              disabled={saving}
                              style={{ ...btnBase, background: "#059669" }}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditId(null);
                                setEditName("");
                              }}
                              style={{ ...btnBase, background: "#6b7280" }}
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
                                setEditCompliance(
                                  cat.requiresCompliance || false,
                                );
                              }}
                              style={{ ...btnBase, background: "#2563eb" }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => toggleActive(cat)}
                              style={{
                                ...btnBase,
                                background: cat.active ? "#f59e0b" : "#10b981",
                              }}
                            >
                              {cat.active ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              onClick={() => toggleCompliance(cat)}
                              style={{
                                ...btnBase,
                                background: cat.requiresCompliance
                                  ? "#6b7280"
                                  : "#b45309",
                              }}
                            >
                              {cat.requiresCompliance
                                ? "Remove Compliance"
                                : "Add Compliance"}
                            </button>
                            <button
                              onClick={() => deleteCategory(cat._id)}
                              style={{ ...btnBase, background: "#dc2626" }}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* ─── Subcategories (expanded) ─── */}
                    {isExpanded && (
                      <div style={{ marginTop: 12, paddingLeft: 28 }}>
                        {cat.subcategories && cat.subcategories.length > 0 ? (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 8,
                              marginBottom: 10,
                            }}
                          >
                            {cat.subcategories.map((sub, i) => (
                              <span
                                key={i}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                  background: "#e0e7ff",
                                  color: "#3730a3",
                                  padding: "5px 12px",
                                  borderRadius: 20,
                                  fontSize: 13,
                                  fontWeight: 500,
                                }}
                              >
                                {sub}
                                <button
                                  onClick={() => removeSubcategory(cat._id, i)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: "#6366f1",
                                    fontWeight: 700,
                                    fontSize: 14,
                                    padding: 0,
                                    lineHeight: 1,
                                  }}
                                  title="Remove subcategory"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p
                            style={{
                              color: "#9ca3af",
                              fontSize: 13,
                              margin: "0 0 10px",
                            }}
                          >
                            No subcategories yet.
                          </p>
                        )}

                        {/* Add subcategory inline */}
                        {addSubId === cat._id ? (
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              alignItems: "center",
                            }}
                          >
                            <input
                              type="text"
                              value={addSubName}
                              onChange={(e) => setAddSubName(e.target.value)}
                              placeholder="New subcategory name..."
                              style={{
                                padding: "6px 12px",
                                borderRadius: 6,
                                border: "1px solid #d1d5db",
                                fontSize: 13,
                                flex: "1 1 200px",
                              }}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addSubcategory(cat._id);
                                }
                              }}
                            />
                            <button
                              onClick={() => addSubcategory(cat._id)}
                              style={{
                                ...btnBase,
                                background: "#059669",
                                fontSize: 12,
                              }}
                            >
                              Add
                            </button>
                            <button
                              onClick={() => {
                                setAddSubId(null);
                                setAddSubName("");
                              }}
                              style={{
                                ...btnBase,
                                background: "#6b7280",
                                fontSize: 12,
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setAddSubId(cat._id);
                              setAddSubName("");
                            }}
                            style={{
                              ...btnBase,
                              background: "#4f46e5",
                              fontSize: 12,
                              padding: "6px 14px",
                            }}
                          >
                            + Add Subcategory
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
