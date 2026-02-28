import React from "react";
import { Link } from "react-router-dom";
import "../Css/service.css";

/**
 * ServiceFooter - shared footer for all service provider pages.
 * Mirrors the CustomerFooter layout and design.
 */
export default function ServiceFooter() {
  return (
    <footer className="service-footer">
      <div className="service-footer-content">
        <div className="service-footer-brand">
          <div className="service-footer-logo">🔧 AutoCustomizer</div>
          <p className="service-footer-tagline">
            Manage your automotive customization services, bookings, and
            customer interactions all in one place.
          </p>
          <div className="service-footer-social">
            <a href="#" aria-label="Facebook">
              📘
            </a>
            <a href="#" aria-label="Twitter">
              🐦
            </a>
            <a href="#" aria-label="Instagram">
              📷
            </a>
            <a href="#" aria-label="LinkedIn">
              🔗
            </a>
          </div>
        </div>

        <div className="service-footer-section">
          <h3>Quick Links</h3>
          <ul className="service-footer-links">
            <li>
              <Link to="/service/dashboard">Dashboard</Link>
            </li>
            <li>
              <Link to="/service/bookingManagement">Bookings</Link>
            </li>
            <li>
              <Link to="/service/reviews">Reviews</Link>
            </li>
            <li>
              <Link to="/service/profileSettings">Profile</Link>
            </li>
          </ul>
        </div>

        <div className="service-footer-section">
          <h3>Resources</h3>
          <ul className="service-footer-links">
            <li>
              <a href="/faq">FAQs</a>
            </li>
            <li>
              <a href="/contactus">Contact Support</a>
            </li>
            <li>
              <a href="#">Help Center</a>
            </li>
          </ul>
        </div>

        <div className="service-footer-section">
          <h3>Contact</h3>
          <div className="service-contact-item">
            <span className="service-contact-icon">📧</span>
            <span>autocustomizer25@gmail.com</span>
          </div>
          <div className="service-contact-item">
            <span className="service-contact-icon">📞</span>
            <span>+91 8121178720</span>
          </div>
          <div className="service-contact-item">
            <span className="service-contact-icon">📍</span>
            <span>IIIT Sri City, Gyan Marg, AP - 517417</span>
          </div>
        </div>
      </div>

      <div className="service-footer-bottom">
        <p>© 2025 AutoCustomizer. All rights reserved.</p>
      </div>
    </footer>
  );
}
