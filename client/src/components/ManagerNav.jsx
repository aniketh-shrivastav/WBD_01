import React, { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import "./Nav.css";
import ThemeToggle from "./../components/ThemeToggle";

/**
 * ManagerNav - navigation bar for manager role with responsive toggle.
 * Uses NavLink for SPA navigation and active state styling.
 */
export default function ManagerNav() {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const links = useMemo(
    () => [
      { to: "/manager/dashboard", label: "Dashboard" },
      { to: "/manager/users", label: "User Management" },
      { to: "/manager/profiles", label: "User Profiles" },
      { to: "/manager/orders", label: "Orders & Bookings" },
      { to: "/manager/service-categories", label: "Service Categories" },
      { to: "/manager/payments", label: "Payments" },
      { to: "/manager/support", label: "Support" },
      { to: "/manager/chat", label: "Chat" },
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

  // Poll unread count for manager
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
    timer = setInterval(loadCount, 15000); // 15s for managers
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
        aria-label="Manager navigation"
      >
        <div className="container">
          <div className="brand">
            <img src="/images3/logo2.jpg" alt="AutoCustomizer Logo" />
            <span>Manager Panel</span>
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
                  end={false}
                >
                  {l.label === "Chat" ? (
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
              <a href="/logout" onClick={handleLogout}>
                Logout
              </a>
            </li>
            <li>
              <ThemeToggle />
            </li>
          </ul>
        </div>
      </nav>
    </>
  );
}
