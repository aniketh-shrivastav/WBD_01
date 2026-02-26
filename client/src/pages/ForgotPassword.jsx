import React, { useState } from "react";
import "../Css/auth.css";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  //State Variables
  const [email, setEmail] = useState(""); // Stores user email input
  const [message, setMessage] = useState(""); // Success message
  const [error, setError] = useState(""); // Error message
  const [loading, setLoading] = useState(false); // Button loading state
  const [previewUrl, setPreviewUrl] = useState(null); // Nodemailer preview URL (DEV mode

  const navigate = useNavigate();

  // Handle form submission
  async function onSubmit(e) {
    e.preventDefault(); // Prevent page refresh

    // Reset status messages
    setMessage("");
    setError("");
    setLoading(true);

    try {
      // Send POST request to backend
      const res = await fetch("/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email }), // Pass email to backend
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Show backend error message
        setError(j.message || "Request failed");
      } else {
        // Display success message
        setMessage(j.message || "If that email exists, a reset link was sent.");
        if (j.previewUrl) {
          setMessage(
            (prev) => prev + " You can preview the email using the link below."
          );
          // Store preview URL in state by appending to message or show separate section
          setPreviewUrl(j.previewUrl);
        }
      }
    } catch (err) {
      // Network or server crash
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container auth-page">
      <div className="auth-wrapper single-panel">
        <div className="auth-panel" style={{ maxWidth: 520 }}>
          <h2>Forgot Password</h2>
          <p>Enter your account email to receive a reset link.</p>
          {message && <div className="alert alert-success">{message}</div>}
          {previewUrl && (
            <div className="alert alert-info">
              Test email preview:{" "}
              <a href={previewUrl} target="_blank" rel="noreferrer">
                Open
              </a>
            </div>
          )}
          {error && <div className="alert alert-danger">{error}</div>}
          <form onSubmit={onSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="fpEmail">Email Address</label>
              <input
                id="fpEmail"
                type="email"
                required
                value={email}
                placeholder="you@example.com"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="auth-actions">
              <button className="submit-btn" disabled={loading} type="submit">
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </div>
          </form>
          <p className="auth-extra">
            <a href="/login">Back to Login</a>
          </p>
        </div>
      </div>
    </div>
  );
}
