import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import "./Nav.css";

/**
 * SellerNav - shared navigation for all seller pages.
 * Mirrors CustomerNav / ServiceNav pattern with seller-specific links.
 */
export default function SellerNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const links = [
    { to: "/seller/dashboard", label: "Dashboard" },
    { to: "/seller/profileSettings", label: "Profile" },
    { to: "/seller/productmanagement", label: "Products" },
    { to: "/seller/orders", label: "Orders" },
    { to: "/seller/reviews", label: "Reviews" },
  ];

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
    <nav className="ac-navbar" role="navigation" aria-label="Seller navigation">
      <div className="container">
        <div className="brand">
          <img src="/images3/logo2.jpg" alt="AutoCustomizer Logo" />
          <span>AutoCustomizer</span>
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
              >
                {l.label}
              </NavLink>
            </li>
          ))}
          <li>
            <a
              href="/logout"
              onClick={handleLogout}
              className={location.pathname === "/logout" ? "active" : undefined}
            >
              Logout
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
}
