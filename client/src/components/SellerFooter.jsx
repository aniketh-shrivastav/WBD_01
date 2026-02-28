import React from "react";
import { Link } from "react-router-dom";
import "../Css/seller.css";

/**
 * SellerFooter - shared footer for all seller pages.
 * Mirrors the CustomerFooter layout and design.
 */
export default function SellerFooter() {
  return (
    <footer className="seller-footer">
      <div className="seller-footer-content">
        <div className="seller-footer-brand">
          <div className="seller-footer-logo">🛒 AutoCustomizer</div>
          <p className="seller-footer-tagline">
            Manage your automotive parts store, products, orders, and reviews
            all in one place.
          </p>
          <div className="seller-footer-social">
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

        <div className="seller-footer-section">
          <h3>Quick Links</h3>
          <ul className="seller-footer-links">
            <li>
              <Link to="/seller/dashboard">Dashboard</Link>
            </li>
            <li>
              <Link to="/seller/productmanagement">Products</Link>
            </li>
            <li>
              <Link to="/seller/orders">Orders</Link>
            </li>
            <li>
              <Link to="/seller/profileSettings">Profile</Link>
            </li>
          </ul>
        </div>

        <div className="seller-footer-section">
          <h3>Resources</h3>
          <ul className="seller-footer-links">
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

        <div className="seller-footer-section">
          <h3>Contact</h3>
          <div className="seller-contact-item">
            <span className="seller-contact-icon">📧</span>
            <span>autocustomizer25@gmail.com</span>
          </div>
          <div className="seller-contact-item">
            <span className="seller-contact-icon">📞</span>
            <span>+91 8121178720</span>
          </div>
          <div className="seller-contact-item">
            <span className="seller-contact-icon">📍</span>
            <span>IIIT Sri City, Gyan Marg, AP - 517417</span>
          </div>
        </div>
      </div>

      <div className="seller-footer-bottom">
        <p>
          © 2025 <a href="/">AutoCustomizer</a>. All Rights Reserved.
        </p>
        <div className="seller-footer-legal">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}
