import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import "./Nav.css";

/**
 * CustomerNav - shared navigation for all customer pages.
 * Features:
 * - Active link highlighting using NavLink
 * - Optional cart count badge via prop
 * - Responsive mobile toggle
 */
export default function CustomerNav({ cartCount = 0 }) {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();

  const links = [
    { to: "/", label: "Home" },
    { to: "/customer/index", label: "Products" },
    { to: "/customer/booking", label: "Services" },
    { to: "/customer/history", label: "Order History" },
    { to: "/customer/alerts", label: "Alerts" },
    { to: "/customer/cart", label: "Cart", cart: true },
    { to: "/customer/chat", label: "Chat" },
    { to: "/customer/profile", label: "Profile" },
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

  // Poll unread count periodically
  useEffect(() => {
    let timer;
    let cancelled = false;
    async function loadCount() {
      try {
        const res = await fetch(`${backendBase()}/chat/unread-count`, {
          headers: { Accept: "application/json" },
          credentials: "include",
        });
        const j = await res.json().catch(() => ({}));
        if (!cancelled && j && j.success) setUnreadCount(j.count || 0);
      } catch {}
    }
    loadCount();
    timer = setInterval(loadCount, 20000); // 20s
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <nav
        className="ac-navbar"
        role="navigation"
        aria-label="Customer navigation"
      >
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
                  className={({ isActive }) =>
                    isActive ? "active" : undefined
                  }
                  end={l.to === "/"}
                >
                  {l.cart ? (
                    <span className="cart-link">
                      <img src="/images/cart-icon.png" alt="Cart" />
                      <span>{l.label}</span>
                      {cartCount > 0 && (
                        <span
                          className="badge"
                          aria-label={`Items in cart: ${cartCount}`}
                        >
                          {cartCount}
                        </span>
                      )}
                    </span>
                  ) : l.label === "Chat" ? (
                    <span
                      style={{
                        display: "inline-flex",
                        gap: 6,
                        alignItems: "center",
                      }}
                    >
                      {l.label}
                      <span
                        className="badge"
                        title={`Unread messages: ${unreadCount}`}
                        aria-label={`Unread messages: ${unreadCount}`}
                        style={{ opacity: unreadCount === 0 ? 0.6 : 1 }}
                      >
                        {unreadCount}
                      </span>
                    </span>
                  ) : (
                    l.label
                  )}
                </NavLink>
              </li>
            ))}
            <li>
              {/* Use a normal anchor for logout to hit server session endpoint */}
              <a
                href="/logout"
                onClick={handleLogout}
                className={
                  location.pathname === "/logout" ? "active" : undefined
                }
              >
                Logout
              </a>
            </li>
          </ul>
        </div>
      </nav>
    </>
  );
}
