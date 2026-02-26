import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../../Css/publicPages.css";

export default function AllIndex() {
  const navigate = useNavigate();
  const [session, setSession] = useState({ authenticated: false });
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/session", {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("Failed session");
        const j = await res.json();
        if (!cancelled) setSession(j);
      } catch {
        if (!cancelled) setSession({ authenticated: false });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const authed = !!session.authenticated;

  const ctaProps = (targetPath) => ({
    href: authed ? targetPath : "/login",
    onClick: (e) => {
      e.preventDefault();
      navigate(authed ? targetPath : "/login");
    },
  });

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
            <Link to="/" className="pp-nav-link active">
              Home
            </Link>
          </li>
          <li>
            <Link to="/contactus" className="pp-nav-link">
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

      {/* Hero Section */}
      <section className="pp-hero">
        <div className="pp-hero-content">
          <div className="pp-hero-text">
            <div className="pp-hero-badge">
              <span>✨</span> #1 Auto Customization Platform
            </div>
            <h1 className="pp-hero-title">
              Transform Your Ride with <span>Premium Parts</span> & Expert
              Services
            </h1>
            <p className="pp-hero-subtitle">
              The ultimate marketplace connecting car enthusiasts with quality
              parts sellers and verified service providers. Build your dream car
              today.
            </p>
            <div className="pp-hero-buttons">
              <a
                {...ctaProps("/customer/index")}
                className="pp-btn pp-btn-primary"
              >
                🛒 Browse Products
              </a>
              <a
                {...ctaProps("/customer/booking")}
                className="pp-btn pp-btn-secondary"
              >
                📅 Book a Service
              </a>
            </div>
            <div className="pp-hero-stats">
              <div className="pp-stat">
                <div className="pp-stat-number">10K+</div>
                <div className="pp-stat-label">Products Available</div>
              </div>
              <div className="pp-stat">
                <div className="pp-stat-number">500+</div>
                <div className="pp-stat-label">Service Providers</div>
              </div>
              <div className="pp-stat">
                <div className="pp-stat-number">50K+</div>
                <div className="pp-stat-label">Happy Customers</div>
              </div>
            </div>
          </div>
          <div className="pp-hero-image">
            <img src="/images2/car-customization.png" alt="Car Customization" />
          </div>
        </div>
      </section>

      {/* User Types Section */}
      <section className="pp-user-types">
        <div className="pp-section-header">
          <span className="pp-section-label">For Everyone</span>
          <h2 className="pp-section-title">
            One Platform, Multiple Possibilities
          </h2>
          <p className="pp-section-subtitle">
            Whether you're a car owner, parts seller, or service provider,
            AutoCustomizer has everything you need.
          </p>
        </div>
        <div className="pp-user-grid">
          <div className="pp-user-card">
            <div className="pp-user-icon">🚘</div>
            <h3>Car Owners</h3>
            <p>
              Find premium parts and expert services to customize your vehicle
              exactly how you want it. Access verified sellers and top-rated
              service providers.
            </p>
            <Link to="/signup" className="pp-btn pp-btn-primary">
              Get Started
            </Link>
          </div>
          <div className="pp-user-card">
            <div className="pp-user-icon">🏪</div>
            <h3>Parts Sellers</h3>
            <p>
              Reach thousands of car enthusiasts looking for quality parts.
              Manage inventory, track sales, and grow your business with our
              powerful tools.
            </p>
            <Link to="/signup" className="pp-btn pp-btn-seller">
              Start Selling
            </Link>
          </div>
          <div className="pp-user-card">
            <div className="pp-user-icon">🔧</div>
            <h3>Service Providers</h3>
            <p>
              Showcase your expertise, get booked online, and expand your
              customer base. Manage appointments and grow your reputation.
            </p>
            <Link to="/signup" className="pp-btn pp-btn-provider">
              Offer Services
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="pp-features">
        <div className="pp-section-header">
          <span className="pp-section-label">Features</span>
          <h2 className="pp-section-title">Everything You Need in One Place</h2>
        </div>
        <div className="pp-features-grid">
          <div className="pp-feature-card">
            <div className="pp-feature-icon">🛡️</div>
            <h3>Verified Sellers</h3>
            <p>
              All sellers go through our verification process to ensure quality
              and authenticity of products.
            </p>
          </div>
          <div className="pp-feature-card">
            <div className="pp-feature-icon">💳</div>
            <h3>Secure Payments</h3>
            <p>
              Multiple payment options with end-to-end encryption for safe and
              hassle-free transactions.
            </p>
          </div>
          <div className="pp-feature-card">
            <div className="pp-feature-icon">📦</div>
            <h3>Fast Delivery</h3>
            <p>
              Get your parts delivered quickly with our reliable shipping
              partners across the country.
            </p>
          </div>
          <div className="pp-feature-card">
            <div className="pp-feature-icon">📅</div>
            <h3>Easy Booking</h3>
            <p>
              Book services with just a few clicks. Choose your preferred date,
              time, and service provider.
            </p>
          </div>
          <div className="pp-feature-card">
            <div className="pp-feature-icon">⭐</div>
            <h3>Reviews & Ratings</h3>
            <p>
              Make informed decisions with genuine reviews from verified
              customers and detailed ratings.
            </p>
          </div>
          <div className="pp-feature-card">
            <div className="pp-feature-icon">💬</div>
            <h3>24/7 Support</h3>
            <p>
              Our dedicated support team is always ready to help you with any
              questions or issues.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits / CTA Section */}
      <section className="pp-benefits">
        <div className="pp-section-header">
          <span className="pp-section-label">Why Choose Us</span>
          <h2 className="pp-section-title">Join Our Growing Community</h2>
        </div>
        <div className="pp-benefits-grid">
          <div className="pp-benefit-item">
            <div className="pp-benefit-check">✓</div>
            <div>
              <h4>Targeted Audience</h4>
              <p>Connect with passionate car enthusiasts</p>
            </div>
          </div>
          <div className="pp-benefit-item">
            <div className="pp-benefit-check">✓</div>
            <div>
              <h4>Business Tools</h4>
              <p>Analytics, inventory, and payment features</p>
            </div>
          </div>
          <div className="pp-benefit-item">
            <div className="pp-benefit-check">✓</div>
            <div>
              <h4>Growth Opportunity</h4>
              <p>Expand your reach nationwide</p>
            </div>
          </div>
          <div className="pp-benefit-item">
            <div className="pp-benefit-check">✓</div>
            <div>
              <h4>Seamless Experience</h4>
              <p>Focus on business, we handle the tech</p>
            </div>
          </div>
        </div>
        <div className="pp-cta-box">
          <h3>Ready to Get Started?</h3>
          <p>
            Join thousands of satisfied users and take your automotive journey
            to the next level.
          </p>
          <Link to="/signup" className="pp-btn">
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="pp-footer">
        <div className="pp-footer-content">
          <div className="pp-footer-brand">
            <h3>🚗 AutoCustomizer</h3>
            <p>
              Your one-stop destination for premium automotive customization
              parts and expert services.
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
              <li>
                <Link to="/signup">Sign Up</Link>
              </li>
            </ul>
          </div>
          <div className="pp-footer-links">
            <h4>For Business</h4>
            <ul>
              <li>
                <Link to="/signup">Become a Seller</Link>
              </li>
              <li>
                <Link to="/signup">Service Provider</Link>
              </li>
              <li>
                <Link to="/faq">Business FAQ</Link>
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
          <div>
            <a href="#">Privacy Policy</a> • <a href="#">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
