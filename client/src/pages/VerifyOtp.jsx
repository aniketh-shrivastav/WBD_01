import React, { useEffect, useMemo, useState } from "react";
import "../Css/auth.css";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function VerifyOtp() {
  const [params] = useSearchParams();
  const email = useMemo(() => params.get("email") || "", [params]);
  const [otp, setOtp] = useState("");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!email) {
      setError("Missing email. Please open the link from your email.");
    }
  }, [email]);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!email || !otp || otp.length !== 6) {
      setError("Enter the 6-digit code sent to your email.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email, otp }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.success) {
        setInfo("Email verified. Redirecting to login…");
        setTimeout(() => navigate("/login"), 800);
      } else {
        setError(j.message || "Invalid code. Try again.");
      }
    } catch (e) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setError("");
    setInfo("");
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch("/resend-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.success) {
        setInfo(
          "We sent a new code to your email." +
            (j.previewUrl ? ` (Preview: ${j.previewUrl})` : "")
        );
      } else {
        setError(j.message || "Could not resend code.");
      }
    } catch (e) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container auth-page">
      <div className="auth-wrapper single-panel verify-wrapper">
        <div className="auth-panel verify-panel">
          <div className="verify-pill">Secure sign-up</div>
          <h2>Verify your email</h2>
          <p className="verify-lede">
            We sent a 6-digit code to <b>{email || "(no email)"}</b>. Enter it
            below to activate your account.
          </p>

          {error ? (
            <div className="verify-alert error" role="alert">
              {error}
            </div>
          ) : null}
          {info ? (
            <div className="verify-alert success" role="status">
              {info}
            </div>
          ) : null}

          <form onSubmit={submit} className="auth-form verify-form">
            <label htmlFor="otp">Verification Code</label>
            <input
              id="otp"
              name="otp"
              type="text"
              className="otp-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="[0-9]{6}"
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              required
            />
            <button
              type="submit"
              className="submit-btn primary"
              disabled={loading || !email}
            >
              {loading ? "Verifying…" : "Verify Email"}
            </button>
          </form>

          <div className="verify-secondary">
            <button
              onClick={resend}
              className="submit-btn ghost"
              disabled={loading || !email}
              type="button"
            >
              Resend Code
            </button>
            <p>
              Already verified? <a href="/login">Login</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
