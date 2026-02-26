import React from "react";

/**
 * Reusable navigation for public "all" pages so every view stays consistent.
 */
export default function AllNav({
  authed = false,
  active = "home",
  onToggleTheme,
  themeLabel,
  themeButtonClassName,
  themeButtonStyle,
}) {
  const linkClass = (id) => (active === id ? "active" : undefined);

  return (
    <nav>
      <div className="logo">AutoCustomizer</div>
      <ul className="nav-links" id="globalNav">
        <li>
          <a href="/" className={linkClass("home")}>
            Home
          </a>
        </li>

        {!authed && (
          <>
            <li id="loginLink">
              <a href="/login">Login</a>
            </li>
            <li id="signupLink">
              <a href="/signup">Signup</a>
            </li>
          </>
        )}

        <li>
          <a href="/contactus" className={linkClass("contact")}>
            Contact Us
          </a>
        </li>
        <li>
          <a href="/faq" className={linkClass("faq")}>
            FAQ
          </a>
        </li>
      </ul>

      {onToggleTheme && (
        <button
          type="button"
          className={themeButtonClassName || "theme-toggle-btn"}
          style={themeButtonStyle}
          onClick={onToggleTheme}
        >
          {themeLabel || "Toggle Theme"}
        </button>
      )}
    </nav>
  );
}
