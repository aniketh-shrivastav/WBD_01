import React, { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import "./Nav.css";
import ThemeToggle from "./../components/ThemeToggle";

/**
 * AdminNav - navigation bar for admin role with responsive toggle.
 */
export default function AdminNav() {
  const [open, setOpen] = useState(false);
  const links = useMemo(
    () => [
      { to: "/admin/dashboard", label: "Dashboard" },
      { to: "/admin/users", label: "Users" },
      { to: "/admin/profiles", label: "Profiles" },
      { to: "/admin/orders", label: "Orders" },
      { to: "/admin/service-categories", label: "Service Categories" },
      { to: "/admin/product-categories", label: "Product Categories" },
      { to: "/admin/payments", label: "Payments" },
      { to: "/admin/support", label: "Support" },
    ],
    [],
  );

  function backendBase() {
    const { protocol, hostname, port } = window.location;
    if (port === "5173") return `${protocol}//${hostname}:3000`;
    return "";
  }

  function handleLogout(e) {
    e.preventDefault();
    const next = encodeURIComponent(`${window.location.origin}/login`);
    window.location.href = `${backendBase()}/logout?next=${next}`;
  }

  return (
    <nav className="ac-navbar" role="navigation" aria-label="Admin navigation">
      <div className="container">
        <div className="brand">
          <img src="/images3/logo2.jpg" alt="AutoCustomizer Logo" />
          <span>Admin Panel</span>
        </div>
        <button
          className="nav-toggle"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          ☰
        </button>
        <ul className={`nav-links ${open ? "open" : ""}`}>
          {links.map((l) => (
            <li key={l.to} onClick={() => setOpen(false)}>
              <NavLink
                to={l.to}
                className={({ isActive }) => (isActive ? "active" : undefined)}
                end={false}
              >
                {l.label}
              </NavLink>
            </li>
          ))}
          <li>
            <a href="/logout" onClick={handleLogout}>
              Logout
            </a>
          </li>
          <li>
            <ThemeToggle scope="admin" />
          </li>
        </ul>
      </div>
    </nav>
  );
}
