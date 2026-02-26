import React, { useEffect, useMemo, useState } from "react";
import CustomerNav from "../../components/CustomerNav";
import CustomerFooter from "../../components/CustomerFooter";
import "../../Css/customer.css";

function useLink(href) {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, [href]);
}

export default function CustomerCart() {
  useLink("/styles/styles.css");

  const [items, setItems] = useState([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [cardPaymentEnabled, setCardPaymentEnabled] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  function backendBase() {
    const { protocol, hostname, port } = window.location;
    if (port === "5173") return `${protocol}//${hostname}:3000`;
    return "";
  }
  function handleLogout(e) {
    e.preventDefault();
    const next = encodeURIComponent(`${window.location.origin}/`);
    window.location.href = `${backendBase()}/logout?next=${next}`;
  }

  const totalCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items],
  );
  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items],
  );
  const deliveryCost = useMemo(
    () => Math.round(subtotal * 0.05 * 100) / 100,
    [subtotal],
  );
  const tax = useMemo(
    () => Math.round(subtotal * 0.18 * 100) / 100,
    [subtotal],
  );
  const totalAmount = useMemo(
    () => subtotal + deliveryCost + tax,
    [subtotal, deliveryCost, tax],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        // Load cart and check Stripe config
        const [cartRes, configRes] = await Promise.all([
          fetch("/customer/api/cart", {
            headers: { Accept: "application/json" },
          }),
          fetch("/api/payments/config", {
            headers: { Accept: "application/json" },
          }),
        ]);

        if (!cartRes.ok) throw new Error("Failed to load cart");
        const j = await cartRes.json();
        if (cancelled) return;
        setItems(j.items || []);
        setUserId(j.user?.id || "");

        // Check if card payment is enabled (Stripe or Mock)
        if (configRes.ok) {
          const config = await configRes.json();
          setCardPaymentEnabled(config.stripeEnabled || config.mockEnabled);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load cart");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function updateQuantity(productId, action) {
    if (!userId) return;
    try {
      const res = await fetch(`/api/cart/update/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ productId, action }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.message || "Update failed");
      // reload items
      const cartRes = await fetch("/customer/api/cart", {
        headers: { Accept: "application/json" },
      });
      const cart = await cartRes.json();
      setItems(cart.items || []);
    } catch (e) {
      alert(e.message);
    }
  }

  function buildSummary() {
    if (items.length === 0) return;
    setShowPayment(true);
  }

  async function handleStripeCheckout() {
    try {
      setProcessingPayment(true);
      const res = await fetch("/api/payments/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
          })),
          successUrl: `${window.location.origin}/customer/payment-success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/customer/cart`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      alert(e.message || "Payment failed. Please try again.");
      setProcessingPayment(false);
    }
  }

  async function placeOrder() {
    if (paymentMethod === "card") {
      await handleStripeCheckout();
      return;
    }

    try {
      const res = await fetch("/customer/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ paymentMethod }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorMessage = data.message || "Order failed. Please try again.";
        alert(errorMessage);

        if (
          errorMessage.includes("profile") ||
          errorMessage.includes("address") ||
          errorMessage.includes("district")
        ) {
          if (window.confirm("Would you like to update your profile now?")) {
            window.location.href = "/customer/profile";
          }
        }
        return;
      }

      alert(data.message || "Order placed successfully!");
      window.location.href = "/customer/history";
    } catch (e) {
      alert(
        e.message ||
          "An error occurred while placing your order. Please try again.",
      );
      console.error("Order placement error:", e);
    }
  }

  return (
    <div className="customer-page">
      <CustomerNav cartCount={totalCount} />

      <main className="customer-main">
        <h1
          className="customer-title"
          style={{ textAlign: "center", marginBottom: "32px" }}
        >
          Your Shopping Cart
        </h1>

        {loading ? (
          <div className="customer-loading">
            <div className="customer-spinner"></div>
            <div className="customer-loading-text">Loading your cart...</div>
          </div>
        ) : error ? (
          <div className="customer-alert customer-alert-error">
            <div className="customer-alert-icon">⚠️</div>
            <div className="customer-alert-content">{error}</div>
          </div>
        ) : items.length === 0 ? (
          <div className="customer-empty-state">
            <div className="customer-empty-icon">🛒</div>
            <h3 className="customer-empty-title">Your Cart is Empty</h3>
            <p className="customer-empty-description">
              Looks like you haven't added any products yet. Start shopping to
              fill your cart!
            </p>
            <a
              href="/customer/index"
              className="customer-btn customer-btn-primary"
            >
              Browse Products
            </a>
          </div>
        ) : (
          <div className="customer-cart-container">
            {items.map((it) => (
              <div className="customer-cart-item" key={it.productId}>
                <img
                  src={it.image}
                  alt={it.name}
                  className="customer-cart-item-image"
                />
                <div className="customer-cart-item-details">
                  <h4 className="customer-cart-item-name">{it.name}</h4>
                  <div className="customer-cart-item-price">₹{it.price}</div>
                </div>
                <div className="customer-quantity-controls">
                  <button
                    className="customer-quantity-btn"
                    onClick={() => updateQuantity(it.productId, "decrease")}
                  >
                    −
                  </button>
                  <span className="customer-quantity-value">{it.quantity}</span>
                  <button
                    className="customer-quantity-btn"
                    onClick={() => updateQuantity(it.productId, "increase")}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}

            {/* Cart Summary */}
            <div className="customer-cart-summary">
              <h3
                style={{
                  marginBottom: "16px",
                  color: "var(--customer-text-primary)",
                }}
              >
                Order Summary
              </h3>
              {items.map((it) => (
                <div
                  key={it.productId}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                    color: "var(--customer-text-secondary)",
                  }}
                >
                  <span>
                    {it.name} × {it.quantity}
                  </span>
                  <span>₹{it.price * it.quantity}</span>
                </div>
              ))}
              <div
                style={{
                  borderTop: "1px solid var(--customer-border)",
                  paddingTop: "12px",
                  marginTop: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                    color: "var(--customer-text-secondary)",
                  }}
                >
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                    color: "var(--customer-text-secondary)",
                  }}
                >
                  <span>Delivery Cost (5%)</span>
                  <span>₹{deliveryCost.toFixed(2)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                    color: "var(--customer-text-secondary)",
                  }}
                >
                  <span>Tax (18%)</span>
                  <span>₹{tax.toFixed(2)}</span>
                </div>
              </div>
              <div className="customer-cart-total">
                <span>Total Amount</span>
                <span className="customer-cart-total-amount">
                  ₹{totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: "flex",
                gap: "16px",
                justifyContent: "center",
                marginTop: "24px",
                flexWrap: "wrap",
              }}
            >
              <a
                href="/customer/index"
                className="customer-btn customer-btn-secondary"
              >
                Continue Shopping
              </a>
              <button
                className="customer-btn customer-btn-primary customer-btn-lg"
                onClick={buildSummary}
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        )}

        {/* Payment Selection Modal */}
        {showPayment && (
          <div
            className="customer-modal-overlay"
            onClick={() => setShowPayment(false)}
          >
            <div
              className="customer-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="customer-modal-header">
                <h3 className="customer-modal-title">Select Payment Method</h3>
                <button
                  className="customer-modal-close"
                  onClick={() => setShowPayment(false)}
                >
                  ×
                </button>
              </div>
              <div className="customer-modal-body">
                {/* Card Payment Option */}
                {cardPaymentEnabled && (
                  <div
                    className={`customer-payment-option ${paymentMethod === "card" ? "selected" : ""}`}
                    onClick={() => setPaymentMethod("card")}
                  >
                    <div className="customer-payment-radio"></div>
                    <div>
                      <div className="customer-payment-label">
                        💳 Pay with Card
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: "var(--customer-text-secondary)",
                          marginTop: "4px",
                        }}
                      >
                        Secure payment with credit/debit card
                      </div>
                    </div>
                  </div>
                )}

                {/* Cash on Delivery Option */}
                <div
                  className={`customer-payment-option ${paymentMethod === "cod" ? "selected" : ""}`}
                  onClick={() => setPaymentMethod("cod")}
                >
                  <div className="customer-payment-radio"></div>
                  <div>
                    <div className="customer-payment-label">
                      💵 Cash on Delivery
                    </div>
                    <div
                      style={{
                        fontSize: "13px",
                        color: "var(--customer-text-secondary)",
                        marginTop: "4px",
                      }}
                    >
                      Pay when your order arrives
                    </div>
                  </div>
                </div>
              </div>
              <div className="customer-modal-footer">
                <button
                  className="customer-btn customer-btn-secondary"
                  onClick={() => setShowPayment(false)}
                >
                  Cancel
                </button>
                <button
                  className="customer-btn customer-btn-success"
                  onClick={() => {
                    if (!paymentMethod) {
                      alert("Please select a payment method.");
                      return;
                    }
                    if (paymentMethod === "card") {
                      setShowPayment(false);
                      placeOrder();
                    } else {
                      setShowPayment(false);
                      setShowCheckout(true);
                    }
                  }}
                  disabled={processingPayment}
                >
                  {processingPayment ? "Processing..." : "Confirm Payment"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Checkout Confirmation Modal */}
        {showCheckout && (
          <div
            className="customer-modal-overlay"
            onClick={() => setShowCheckout(false)}
          >
            <div
              className="customer-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="customer-modal-header">
                <h3 className="customer-modal-title">Confirm Your Order</h3>
                <button
                  className="customer-modal-close"
                  onClick={() => setShowCheckout(false)}
                >
                  ×
                </button>
              </div>
              <div
                className="customer-modal-body"
                style={{ textAlign: "center" }}
              >
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>📦</div>
                <h4 style={{ marginBottom: "8px" }}>
                  Ready to Place Your Order?
                </h4>
                <div
                  style={{
                    background: "var(--customer-card-bg)",
                    borderRadius: "8px",
                    padding: "16px",
                    marginBottom: "16px",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "8px",
                      color: "var(--customer-text-secondary)",
                    }}
                  >
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "8px",
                      color: "var(--customer-text-secondary)",
                    }}
                  >
                    <span>Delivery Cost (5%)</span>
                    <span>₹{deliveryCost.toFixed(2)}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "8px",
                      color: "var(--customer-text-secondary)",
                    }}
                  >
                    <span>Tax (18%)</span>
                    <span>₹{tax.toFixed(2)}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      paddingTop: "8px",
                      borderTop: "1px solid var(--customer-border)",
                      fontWeight: "bold",
                    }}
                  >
                    <span>Total</span>
                    <span style={{ color: "var(--customer-primary)" }}>
                      ₹{totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
                <p
                  style={{
                    color: "var(--customer-text-secondary)",
                    fontSize: "14px",
                  }}
                >
                  Payment Method: Cash on Delivery
                </p>
              </div>
              <div
                className="customer-modal-footer"
                style={{ justifyContent: "center" }}
              >
                <button
                  className="customer-btn customer-btn-secondary"
                  onClick={() => setShowCheckout(false)}
                >
                  Go Back
                </button>
                <button
                  className="customer-btn customer-btn-success customer-btn-lg"
                  onClick={placeOrder}
                >
                  ✓ Place Order
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <CustomerFooter />
    </div>
  );
}
