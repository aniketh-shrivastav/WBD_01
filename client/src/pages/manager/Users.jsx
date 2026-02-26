import React, { useEffect, useMemo, useState } from "react";
import ManagerNav from "../../components/ManagerNav";
import "../../Css/manager.css";

const ROLES = ["customer", "seller", "service-provider", "manager", "admin"]; // order matters

export default function ManagerUsers() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [activeRole, setActiveRole] = useState("all");
  const [term, setTerm] = useState("");

  // Add Manager form
  const [showAdd, setShowAdd] = useState(false);
  const [mgrName, setMgrName] = useState("");
  const [mgrEmail, setMgrEmail] = useState("");
  const [mgrPhone, setMgrPhone] = useState("");
  const [mgrPassword, setMgrPassword] = useState("");
  const [formMsg, setFormMsg] = useState("");
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    phone: false,
    password: false,
  });

  const nameRegex = /^[A-Za-z\s.-]{2,}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validation = useMemo(() => {
    const trimmedName = (mgrName || "").trim();
    const trimmedEmail = (mgrEmail || "").trim();
    const phoneDigits = (mgrPhone || "").replace(/\D/g, "").slice(0, 10);
    const passwordValue = mgrPassword || "";

    const nameOk = trimmedName.length > 0 && nameRegex.test(trimmedName);
    const emailOk = trimmedEmail.length > 0 && emailRegex.test(trimmedEmail);
    const phoneOk = phoneDigits === "" || /^\d{10}$/.test(phoneDigits);
    const passOk = passwordValue.length >= 6;

    const errors = {
      name:
        trimmedName.length === 0
          ? "Name is required."
          : nameOk
            ? ""
            : "Only letters, spaces, dot and hyphen are allowed.",
      email:
        trimmedEmail.length === 0
          ? "Email is required."
          : emailOk
            ? ""
            : "Enter a valid email address.",
      phone:
        phoneDigits === "" || phoneOk
          ? ""
          : "Phone number must be exactly 10 digits.",
      password:
        passwordValue.length === 0
          ? "Password is required."
          : passOk
            ? ""
            : "Password must be at least 6 characters.",
    };

    return {
      nameOk,
      emailOk,
      phoneOk,
      passOk,
      errors,
      sanitizedPhone: phoneDigits,
    };
  }, [mgrName, mgrEmail, mgrPhone, mgrPassword]);

  const formValid =
    validation.nameOk &&
    validation.emailOk &&
    validation.phoneOk &&
    validation.passOk;

  const markTouched = (field) =>
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));

  useEffect(() => {
    // Ensure manager pages render on a light background and not auth gradient
    document.body.classList.add("manager-theme");
    return () => document.body.classList.remove("manager-theme");
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const resp = await fetch("/manager/api/users", {
          headers: { Accept: "application/json" },
        });
        if (resp.status === 401 || resp.status === 403) {
          window.location.href = "/login";
          return;
        }
        if (!resp.ok) throw new Error("Failed to load users");
        const data = await resp.json();
        if (!cancelled) {
          setAllUsers(data.users || []);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || "Failed to load users");
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function filteredUsersByRole(role) {
    const lowerTerm = (term || "").toLowerCase();
    return allUsers
      .filter((u) => (role === "all" ? true : u.role === role))
      .filter((u) => {
        const hay = `${u._id} ${u.name || ""} ${u.email || ""} ${
          u.role || ""
        }`.toLowerCase();
        return hay.includes(lowerTerm);
      });
  }

  async function onAction(userId, action) {
    const confirmMsg =
      action === "suspend"
        ? "Are you sure you want to suspend this user?"
        : "Are you sure you want to restore this user?";
    if (!window.confirm(confirmMsg)) return;
    try {
      const resp = await fetch(`/manager/users/${action}/${userId}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });
      if (resp.status === 401 || resp.status === 403) {
        window.location.href = "/login";
        return;
      }
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data.success)
        throw new Error(data.message || "Action failed");
      setAllUsers((prev) =>
        prev.map((u) =>
          u._id === userId ? { ...u, suspended: action === "suspend" } : u,
        ),
      );
    } catch (e) {
      setError(e.message || "Action failed");
    }
  }

  async function onCreateManager(e) {
    e.preventDefault();
    if (!formValid) {
      setTouched({ name: true, email: true, phone: true, password: true });
      return;
    }
    setFormMsg("Creating manager...");
    try {
      const resp = await fetch("/manager/users/create-manager", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: mgrName.trim(),
          email: mgrEmail.trim(),
          phone: validation.sanitizedPhone,
          password: mgrPassword,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data.success)
        throw new Error(data.message || "Create failed");
      setAllUsers((prev) => [...prev, data.user]);
      setActiveRole("manager");
      setTerm("");
      setFormMsg("Manager created successfully.");
      setMgrName("");
      setMgrEmail("");
      setMgrPhone("");
      setMgrPassword("");
      setTouched({ name: false, email: false, phone: false, password: false });
    } catch (e) {
      setFormMsg(e.message || "Error creating manager");
    }
  }

  if (loading)
    return (
      <div className="main-content">
        <p>Loading users...</p>
      </div>
    );
  if (error)
    return (
      <div className="main-content">
        <p style={{ color: "#e74c3c" }}>{error}</p>
      </div>
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
        <h2>User Management</h2>
        <div className="filter-toolbar">
          <div className="filter-search">
            <input
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="search-box"
              placeholder="Search users..."
            />
          </div>
          <div className="filter-actions">
            {["all", ...ROLES].map((role) => (
              <button
                key={role}
                className={`filter-btn ${activeRole === role ? "active" : ""}`}
                onClick={() => setActiveRole(role)}
                data-role={role}
              >
                {role === "all"
                  ? "All Users"
                  : role.charAt(0).toUpperCase() +
                    role.slice(1).replace("-", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Add Manager */}
        <div className="add-manager" style={{ margin: "10px 0 20px" }}>
          <button
            className="btn btn-view"
            onClick={() => setShowAdd((s) => !s)}
          >
            {showAdd ? "− Hide" : "+ Add Manager"}
          </button>
          {showAdd && (
            <form
              onSubmit={onCreateManager}
              style={{ marginTop: 12, maxWidth: 560 }}
            >
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <input
                    value={mgrName}
                    onChange={(e) => setMgrName(e.target.value)}
                    onBlur={() => markTouched("name")}
                    placeholder="Full name"
                    required
                    style={{
                      width: "100%",
                      padding: 8,
                      border: "1px solid #ccc",
                      borderRadius: 8,
                    }}
                  />
                  {touched.name && validation.errors.name && (
                    <p style={{ color: "#b91c1c", fontSize: 13, marginTop: 4 }}>
                      {validation.errors.name}
                    </p>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <input
                    value={mgrEmail}
                    onChange={(e) => setMgrEmail(e.target.value)}
                    onBlur={() => markTouched("email")}
                    type="email"
                    placeholder="Email"
                    required
                    style={{
                      width: "100%",
                      padding: 8,
                      border: "1px solid #ccc",
                      borderRadius: 8,
                    }}
                  />
                  {touched.email && validation.errors.email && (
                    <p style={{ color: "#b91c1c", fontSize: 13, marginTop: 4 }}>
                      {validation.errors.email}
                    </p>
                  )}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  marginTop: 8,
                }}
              >
                <div style={{ flex: 1, minWidth: 200 }}>
                  <input
                    value={mgrPhone}
                    onChange={(e) =>
                      setMgrPhone(
                        e.target.value.replace(/\D/g, "").slice(0, 10),
                      )
                    }
                    onBlur={() => markTouched("phone")}
                    placeholder="Phone (10 digits)"
                    style={{
                      width: "100%",
                      padding: 8,
                      border: "1px solid #ccc",
                      borderRadius: 8,
                    }}
                  />
                  {touched.phone && validation.errors.phone && (
                    <p style={{ color: "#b91c1c", fontSize: 13, marginTop: 4 }}>
                      {validation.errors.phone}
                    </p>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <input
                    value={mgrPassword}
                    onChange={(e) => setMgrPassword(e.target.value)}
                    onBlur={() => markTouched("password")}
                    type="password"
                    placeholder="Password (min 6)"
                    minLength={6}
                    required
                    style={{
                      width: "100%",
                      padding: 8,
                      border: "1px solid #ccc",
                      borderRadius: 8,
                    }}
                  />
                  {touched.password && validation.errors.password && (
                    <p style={{ color: "#b91c1c", fontSize: 13, marginTop: 4 }}>
                      {validation.errors.password}
                    </p>
                  )}
                </div>
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                <button
                  type="submit"
                  className="btn btn-approve"
                  disabled={!formValid}
                >
                  Create Manager
                </button>
                <button
                  type="button"
                  className="btn btn-suspend"
                  onClick={() => setShowAdd(false)}
                >
                  Cancel
                </button>
              </div>
              {formValid ? null : (
                <div style={{ marginTop: 6, color: "#e74c3c" }}>
                  Please fill all fields correctly.
                </div>
              )}
              {formMsg && (
                <div className="status" style={{ marginTop: 6 }}>
                  {formMsg}
                </div>
              )}
            </form>
          )}
        </div>

        {/* Tables per role */}
        {[activeRole === "all" ? "customer" : activeRole].map((roleKey) =>
          activeRole === "all" ? (
            <RoleSection
              key={roleKey}
              role={roleKey}
              users={filteredUsersByRole(roleKey)}
              onAction={onAction}
            />
          ) : (
            <RoleSection
              key={roleKey}
              role={roleKey}
              users={filteredUsersByRole(roleKey)}
              onAction={onAction}
            />
          ),
        )}
        {activeRole === "all" &&
          ROLES.slice(1).map((rk) => (
            <RoleSection
              key={rk}
              role={rk}
              users={filteredUsersByRole(rk)}
              onAction={onAction}
            />
          ))}
      </div>
    </>
  );
}

function RoleSection({ role, users, onAction }) {
  return (
    <div className={`user-section ${role}-section active`} data-role={role}>
      <h3>{role.charAt(0).toUpperCase() + role.slice(1).replace("-", " ")}</h3>
      <div className="table-responsive">
        <table className="user-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5}>No users in this category.</td>
              </tr>
            ) : (
              users.map((u) => {
                const isProtected = ["manager", "admin"].includes(u.role);
                const actions = isProtected ? (
                  <span>Not Allowed</span>
                ) : !u.suspended ? (
                  <button
                    className="btn btn-suspend"
                    onClick={() => onAction(u._id, "suspend")}
                  >
                    Suspend
                  </button>
                ) : (
                  <button
                    className="btn btn-restore"
                    onClick={() => onAction(u._id, "restore")}
                  >
                    Restore
                  </button>
                );
                const statusBadge = u.suspended ? (
                  <span className="badge badge-danger">Suspended</span>
                ) : (
                  <span className="badge badge-success">Active</span>
                );
                return (
                  <tr
                    key={u._id}
                    className={u.suspended ? "suspended-user" : undefined}
                  >
                    <td>{u._id}</td>
                    <td>{u.name || ""}</td>
                    <td>{u.email || ""}</td>
                    <td>{statusBadge}</td>
                    <td>{actions}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
