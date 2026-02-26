import React, { useEffect, useState } from "react";
import "../Css/auth.css";
import { useParams, useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [valid, setValid] = useState(null); // null = loading
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    async function validate() {
      try {
        const res = await fetch(`/reset-password/${token}`);
        const j = await res.json().catch(() => ({}));
        if (!active) return;
        setValid(j.valid === true);
      } catch {
        setValid(false);
      }
    }
    validate();
    return () => {
      active = false;
    };
  }, [token]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/reset-password/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ password }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.message || "Reset failed");
      } else {
        setMessage(j.message || "Password reset successful.");
        setTimeout(() => navigate("/login"), 1500);
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (valid === null) {
    return (
      <div className="container auth-page">
        <div className="auth-wrapper single-panel">
          <div className="auth-panel" style={{ maxWidth: 520 }}>
            <h2>Reset Password</h2>
            <p className="subtitle">Validating your reset link...</p>
          </div>
        </div>
      </div>
    );
  }
  if (!valid) {
    return (
      <div className="container auth-page">
        <div className="auth-wrapper single-panel">
          <div className="auth-panel" style={{ maxWidth: 520 }}>
            <h2>Reset Link Invalid</h2>
            <p className="subtitle">
              The link is invalid or has expired. Please request a fresh link.
            </p>
            <div className="auth-actions">
              <a className="submit-btn" href="/forgot-password">
                Request New Link
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container auth-page">
      <div className="auth-wrapper single-panel">
        <div className="auth-panel" style={{ maxWidth: 520 }}>
          <h2>Reset Password</h2>
          {message && <div className="alert alert-success">{message}</div>}
          {error && <div className="alert alert-danger">{error}</div>}
          <form onSubmit={onSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="newPass">New Password</label>
              <input
                id="newPass"
                type="password"
                required
                value={password}
                placeholder="Enter new password"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPass">Confirm Password</label>
              <input
                id="confirmPass"
                type="password"
                required
                value={confirm}
                placeholder="Confirm new password"
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <div className="auth-actions">
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
