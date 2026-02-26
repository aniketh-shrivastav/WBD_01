import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../../Css/publicPages.css";

const faqData = {
  customers: [
    {
      q: "How do I book a service?",
      a: "Navigate to the Services section, choose your preferred service provider, select a date and time slot, and confirm your booking. You'll receive a confirmation email with all the details.",
    },
    {
      q: "Can I cancel a booking?",
      a: "Yes, you can cancel a booking at least 24 hours before the scheduled appointment. Go to your Order History and click 'Cancel Booking'. Refunds are processed within 3-5 business days.",
    },
    {
      q: "What payment options are available?",
      a: "We support multiple payment methods including Credit/Debit Cards (Visa, Mastercard), UPI, Net Banking, and Cash on Delivery for eligible orders.",
    },
    {
      q: "How can I track my order?",
      a: "Once your order is shipped, you'll receive a tracking link via email. You can also track all orders from your Order History page.",
    },
    {
      q: "What is the return policy?",
      a: "We offer a 7-day return policy for most products. Items must be unused and in original packaging. Customized products are non-returnable.",
    },
  ],
  sellers: [
    {
      q: "How do I list a product?",
      a: "After creating a seller account, go to your dashboard and click 'Add Product'. Fill in the product details, upload images, set pricing, and publish.",
    },
    {
      q: "Can I manage inventory?",
      a: "Yes, you have full control over your inventory. Update stock levels, set low-stock alerts, and manage product variants from your seller dashboard.",
    },
    {
      q: "How are payments handled?",
      a: "Payments are securely processed and transferred to your linked bank account weekly. You can view all transactions in the Earnings section.",
    },
    {
      q: "What is the commission rate?",
      a: "We charge a 20% commission per sale, which covers platform fees, payment processing, and customer support.",
    },
    {
      q: "How do I handle returns?",
      a: "When a customer initiates a return, you'll be notified. Once you accept and receive the returned item, the refund is processed and deducted from your next payout.",
    },
  ],
  providers: [
    {
      q: "How do I register as a service provider?",
      a: "During signup, select 'Service Provider' as your role. Complete your profile with business details, services offered, pricing, and availability.",
    },
    {
      q: "Where can I manage bookings?",
      a: "All bookings appear in your Provider Dashboard. You can view upcoming appointments, manage schedules, and communicate with customers.",
    },
    {
      q: "Can I update my services and pricing?",
      a: "Yes, you can add, edit, or remove services at any time. Update pricing, duration, and service descriptions from your dashboard.",
    },
    {
      q: "What is the commission for services?",
      a: "Service providers pay a 20% commission on each completed booking, covering platform maintenance and customer acquisition.",
    },
    {
      q: "How do customer reviews work?",
      a: "After a service is completed, customers can leave reviews and ratings. High ratings improve your visibility and help attract more customers.",
    },
  ],
};

export default function FAQ() {
  const [authed, setAuthed] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeItems, setActiveItems] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/session", {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("session fetch failed");
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

  const toggleItem = (category, index) => {
    const key = `${category}-${index}`;
    setActiveItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderFaqCategory = (title, icon, items, category) => (
    <div className="pp-faq-category">
      <h2 className="pp-faq-category-title">
        <span className="pp-faq-category-icon">{icon}</span>
        {title}
      </h2>
      <div className="pp-faq-list">
        {items.map((item, idx) => {
          const key = `${category}-${idx}`;
          const isActive = activeItems[key];
          return (
            <div
              key={key}
              className={`pp-faq-item ${isActive ? "active" : ""}`}
            >
              <div
                className="pp-faq-question"
                onClick={() => toggleItem(category, idx)}
              >
                <h4>{item.q}</h4>
                <span className="pp-faq-toggle">+</span>
              </div>
              <div className="pp-faq-answer">
                <p>{item.a}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

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
            <Link to="/contactus" className="pp-nav-link">
              Contact
            </Link>
          </li>
          <li>
            <Link to="/faq" className="pp-nav-link active">
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

      {/* FAQ Section */}
      <section className="pp-faq">
        <div className="pp-faq-header">
          <h1>
            Frequently Asked <span>Questions</span>
          </h1>
          <p>
            Find answers to common questions about using AutoCustomizer. Can't
            find what you're looking for? Contact our support team.
          </p>
        </div>

        <div className="pp-faq-container">
          {renderFaqCategory(
            "For Customers",
            "🚘",
            faqData.customers,
            "customers",
          )}
          {renderFaqCategory("For Sellers", "🏪", faqData.sellers, "sellers")}
          {renderFaqCategory(
            "For Service Providers",
            "🔧",
            faqData.providers,
            "providers",
          )}
        </div>

        {/* CTA */}
        <div
          className="pp-cta-box"
          style={{
            marginTop: "3rem",
            maxWidth: "800px",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          <h3>Still have questions?</h3>
          <p>Our support team is here to help you with anything you need.</p>
          <Link to="/contactus" className="pp-btn">
            Contact Support
          </Link>
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
