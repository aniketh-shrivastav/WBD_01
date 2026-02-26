import React, { useState } from "react";
import "../Css/auth.css";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/login", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.message || "Invalid credentials");
        return;
      }
      const j = await res.json();
      if (j && j.success) {
        const next = j.redirect || "/";
        // Client-side navigation to SPA route when possible
        navigate(next, { replace: true });
      } else {
        setError(j.message || "Login failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
  }
  return (
    <div className="container auth-page">
      <div className="auth-wrapper">
        <div className="auth-brand">
          <h1>AutoCustomizer</h1>
          <p>Your one-stop platform for all car customization needs</p>
          <div className="brand-image">
            <img
              src="https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&q=80"
              alt="Car customization"
            />
          </div>
        </div>
        <div className="auth-panel">
          <div className="auth-topbar">
            <button
              className="back-btn"
              type="button"
              onClick={() => navigate("/")}
            >
              ⟵ Back to Dashboard
            </button>
          </div>
          <h2>Welcome Back</h2>
          {error && (
            <div
              className="alert alert-danger"
              role="alert"
              style={{ marginBottom: 12 }}
            >
              {error}
            </div>
          )}
          <form onSubmit={onSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="loginEmail">Email Address</label>
              <input
                type="email"
                id="loginEmail"
                required
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="loginPassword">Password</label>
              <input
                type="password"
                id="loginPassword"
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div
              className="form-options"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#007bff",
                  cursor: "pointer",
                  padding: 0,
                  textDecoration: "underline",
                }}
              >
                Forgot password?
              </button>
            </div>
            <div className="auth-actions">
              <button type="submit" className="submit-btn">
                Sign In
              </button>
            </div>
          </form>
          <p className="auth-extra">
            Don't have an account? <a href="/signup">Sign up here</a>
          </p>
        </div>
      </div>
    </div>
  );
}
