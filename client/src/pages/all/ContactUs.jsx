import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "../../Css/publicPages.css";

const nameRegex = /^[A-Za-z\s.-]+$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactUs() {
  const [authed, setAuthed] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [values, setValues] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState({});
  const [submittedFlag, setSubmittedFlag] = useState(false);
  const formRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/session", {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("session");
        const data = await res.json();
        if (!cancelled) setAuthed(!!data.authenticated);
      } catch {
        if (!cancelled) setAuthed(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("submitted") === "true") {
      setSubmittedFlag(true);
      if (window.history.replaceState) {
        window.history.replaceState(
          null,
          "",
          window.location.origin + window.location.pathname,
        );
      }
    }
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
  };

  function validateField(name, value) {
    if (name === "name" && (!value.trim() || !nameRegex.test(value.trim())))
      return "Only letters and spaces allowed.";
    if (name === "email") {
      if (!emailRegex.test(value.trim())) return "Enter a valid email.";
      if (/[A-Z]/.test(value))
        return "Email must not contain uppercase letters.";
    }
    if (name === "subject" && value.trim().length < 3)
      return "Subject must be at least 3 characters.";
    if (name === "message" && value.trim().length < 10)
      return "Message must be at least 10 characters.";
    return "";
  }

  function validateAll() {
    const next = {};
    Object.entries(values).forEach(([k, v]) => {
      const msg = validateField(k, v);
      if (msg) next[k] = msg;
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  const onBlur = (e) => {
    const { name, value } = e.target;
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const onSubmit = (e) => {
    if (!validateAll()) {
      e.preventDefault();
      return;
    }
  };

  return (
    <div className="public-page">
      {/* Premium Navigation */}
      <nav className={`pp-nav ${scrolled ? "scrolled" : ""}`}>
        <Link to="/" className="pp-nav-logo">
          <span className="pp-nav-logo-icon">🚗</span>
          AutoCustomizer
        </Link>
        <ul className="pp-nav-links">
          <li>
            <Link to="/" className="pp-nav-link">
              Home
            </Link>
          </li>
          <li>
            <Link to="/contactus" className="pp-nav-link active">
              Contact
            </Link>
          </li>
          <li>
            <Link to="/faq" className="pp-nav-link">
              FAQ
            </Link>
          </li>
          {!authed && (
            <>
              <li>
                <Link to="/login" className="pp-nav-link">
                  Login
                </Link>
              </li>
              <li>
                <Link to="/signup" className="pp-nav-cta">
                  Get Started
                </Link>
              </li>
            </>
          )}
          {authed && (
            <li>
              <Link to="/customer/index" className="pp-nav-cta">
                Dashboard
              </Link>
            </li>
          )}
        </ul>
      </nav>

      {/* Contact Section */}
      <section className="pp-contact">
        <div className="pp-contact-container">
          {/* Contact Information */}
          <div className="pp-contact-info">
            <h1>
              Get in <span>Touch</span>
            </h1>
            <p>
              Have questions about our products, services, or your order? We'd
              love to hear from you. Send us a message and we'll respond as soon
              as possible.
            </p>

            <div className="pp-contact-methods">
              <div className="pp-contact-method">
                <div className="pp-contact-method-icon">📧</div>
                <div className="pp-contact-method-text">
                  <h4>Email Us</h4>
                  <p>autocustomizer25@gmail.com</p>
                </div>
              </div>
              <div className="pp-contact-method">
                <div className="pp-contact-method-icon">📞</div>
                <div className="pp-contact-method-text">
                  <h4>Call Us</h4>
                  <p>+91 8121178720</p>
                </div>
              </div>
              <div className="pp-contact-method">
                <div className="pp-contact-method-icon">📍</div>
                <div className="pp-contact-method-text">
                  <h4>Visit Us</h4>
                  <p>IIIT Sri City, Gyan Marg, Sri City, AP - 517417</p>
                </div>
              </div>
              <div className="pp-contact-method">
                <div className="pp-contact-method-icon">⏰</div>
                <div className="pp-contact-method-text">
                  <h4>Business Hours</h4>
                  <p>Mon - Sat: 9AM - 6PM</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="pp-contact-form-card">
            <h2>Send a Message</h2>

            {submittedFlag && (
              <div className="pp-success-message">
                <span>✅</span> Thank you! Your message has been submitted
                successfully.
              </div>
            )}

            <form
              ref={formRef}
              method="POST"
              action="/contactus"
              onSubmit={onSubmit}
            >
              <div className="pp-form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  id="name"
                  name="name"
                  value={values.name}
                  onChange={onChange}
                  onBlur={onBlur}
                  required
                  className={`pp-form-input ${errors.name ? "error" : ""}`}
                  placeholder="Enter your name"
                />
                {errors.name && (
                  <div className="pp-form-error">{errors.name}</div>
                )}
              </div>

              <div className="pp-form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={values.email}
                  onChange={onChange}
                  onBlur={onBlur}
                  required
                  className={`pp-form-input ${errors.email ? "error" : ""}`}
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <div className="pp-form-error">{errors.email}</div>
                )}
              </div>

              <div className="pp-form-group">
                <label htmlFor="subject">Subject</label>
                <input
                  id="subject"
                  name="subject"
                  value={values.subject}
                  onChange={onChange}
                  onBlur={onBlur}
                  required
                  className={`pp-form-input ${errors.subject ? "error" : ""}`}
                  placeholder="What's this about?"
                />
                {errors.subject && (
                  <div className="pp-form-error">{errors.subject}</div>
                )}
              </div>

              <div className="pp-form-group">
                <label htmlFor="message">
                  Message (include Order ID or Booking ID if applicable)
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={values.message}
                  onChange={onChange}
                  onBlur={onBlur}
                  required
                  className={`pp-form-textarea ${errors.message ? "error" : ""}`}
                  placeholder="Tell us how we can help..."
                />
                {errors.message && (
                  <div className="pp-form-error">{errors.message}</div>
                )}
              </div>

              <button
                type="submit"
                className="pp-btn pp-btn-primary"
                style={{ width: "100%", justifyContent: "center" }}
              >
                📨 Send Message
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="pp-footer">
        <div className="pp-footer-content">
          <div className="pp-footer-brand">
            <h3>🚗 AutoCustomizer</h3>
            <p>
              Your one-stop destination for premium automotive customization.
            </p>
            <div className="pp-footer-social">
              <a href="#">📘</a>
              <a href="#">🐦</a>
              <a href="#">📷</a>
              <a href="#">🔗</a>
            </div>
          </div>
          <div className="pp-footer-links">
            <h4>Quick Links</h4>
            <ul>
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>
                <Link to="/contactus">Contact Us</Link>
              </li>
              <li>
                <Link to="/faq">FAQ</Link>
              </li>
            </ul>
          </div>
          <div className="pp-footer-links">
            <h4>Support</h4>
            <ul>
              <li>
                <a href="mailto:autocustomizer25@gmail.com">
                  autocustomizer25@gmail.com
                </a>
              </li>
              <li>
                <a href="tel:+918121178720">+91 8121178720</a>
              </li>
              <li>IIIT Sri City, Gyan Marg, AP - 517417</li>
            </ul>
          </div>
        </div>
        <div className="pp-footer-bottom">
          <p>© 2025 AutoCustomizer. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
