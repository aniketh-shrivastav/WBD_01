import React from "react";
import { Link } from "react-router-dom";
import "../Css/customer.css";

export default function CustomerFooter() {
  return (
    <footer className="customer-footer">
      <div className="customer-footer-content">
        <div className="customer-footer-brand">
          <div className="customer-footer-logo">🚗 AutoCustomizer</div>
          <p className="customer-footer-tagline">
            Your one-stop destination for premium automotive customization parts
            and accessories. Transform your ride with quality products.
          </p>
          <div className="customer-footer-social">
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

        <div className="customer-footer-section">
          <h3>Quick Links</h3>
          <ul className="customer-footer-links">
            <li>
              <Link to="/customer/index">Products</Link>
            </li>
            <li>
              <Link to="/customer/cart">Cart</Link>
            </li>
            <li>
              <Link to="/customer/history">Order History</Link>
            </li>
            <li>
              <Link to="/customer/profile">Profile</Link>
            </li>
          </ul>
        </div>

        <div className="customer-footer-section">
          <h3>Services</h3>
          <ul className="customer-footer-links">
            <li>
              <Link to="/customer/booking">Book a Service</Link>
            </li>
            <li>
              <a href="/faq">FAQs</a>
            </li>
            <li>
              <a href="#">Shipping Info</a>
            </li>
            <li>
              <a href="/contactus">Contact Us</a>
            </li>
          </ul>
        </div>

        <div className="customer-footer-section">
          <h3>Contact</h3>
          <div className="customer-contact-item">
            <span className="customer-contact-icon">📧</span>
            <span>autocustomizer25@gmail.com</span>
          </div>
          <div className="customer-contact-item">
            <span className="customer-contact-icon">📞</span>
            <span>+91 8121178720</span>
          </div>
          <div className="customer-contact-item">
            <span className="customer-contact-icon">📍</span>
            <span>IIIT Sri City, Gyan Marg, AP - 517417</span>
          </div>
        </div>
      </div>

      <div className="customer-footer-bottom">
        <p>
          © 2025 <a href="/">AutoCustomizer</a>. All Rights Reserved.
        </p>
        <div className="customer-footer-legal">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}
