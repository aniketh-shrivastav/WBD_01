import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function NotFound() {
  const location = useLocation();

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <div
        style={{
          background: "#fff3cd",
          border: "1px solid #ffeeba",
          color: "#856404",
          padding: "12px 16px",
          borderRadius: 8,
          marginBottom: 16,
        }}
        role="alert"
      >
        We could not find the page: <strong>{location.pathname}</strong>
      </div>

      <h2 style={{ marginBottom: 8 }}>Page not found</h2>
      <p style={{ marginBottom: 16 }}>
        The link might be broken or the page may have moved.
      </p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link to="/">Home</Link>
        <Link to="/login">Login</Link>
        <Link to="/signup">Signup</Link>
      </div>
    </div>
  );
}
