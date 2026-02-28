import React, { useState } from "react";
import "../Css/auth.css";
import { useNavigate } from "react-router-dom";
import { signInWithGoogle } from "../firebase";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    setError("");
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      if (!result.success) {
        setError(result.error || "Google Sign-In failed");
        setLoading(false);
        return;
      }

      // Send the ID token to backend
      const res = await fetch("/auth/google", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken: result.idToken }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        navigate(data.redirect || "/", { replace: true });
      } else {
        setError(data.message || "Google Sign-In failed");
      }
    } catch (err) {
      console.error("Google Sign-In error:", err);
      setError("Google Sign-In failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

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

          <div className="auth-divider">
            <span>or</span>
          </div>

          <button
            type="button"
            className="google-btn"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? "Signing in..." : "Continue with Google"}
          </button>

          <p className="auth-extra">
            Don't have an account? <a href="/signup">Sign up here</a>
          </p>
        </div>
      </div>
    </div>
  );
}
