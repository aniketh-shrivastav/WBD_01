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

  // Delivery address choice
  const [addressMode, setAddressMode] = useState("profile"); // "profile" or "custom"
  const [customDeliveryAddress, setCustomDeliveryAddress] = useState({
    addressLine1: "",
    addressLine2: "",
    landmark: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
  });
  const [cartErrors, setCartErrors] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    function handleEscapeKey(e) {
      if (e.key === "Escape" && selectedImage) {
        setSelectedImage(null);
      }
    }
    window.addEventListener("keydown", handleEscapeKey);
    return () => window.removeEventListener("keydown", handleEscapeKey);
  }, [selectedImage]);

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

  function validateCustomAddress() {
    if (addressMode !== "custom") return true;
    const errs = {};
    if (
      !customDeliveryAddress.addressLine1.trim() ||
      customDeliveryAddress.addressLine1.trim().length < 3
    ) {
      errs.addressLine1 = "House No, Building is required (min 3 characters).";
    }
    if (
      customDeliveryAddress.addressLine2.trim() &&
      customDeliveryAddress.addressLine2.trim().length < 3
    ) {
      errs.addressLine2 = "Street, Area must be at least 3 characters.";
    }
    if (
      customDeliveryAddress.landmark.trim() &&
      customDeliveryAddress.landmark.trim().length < 2
    ) {
      errs.landmark = "Landmark must be at least 2 characters.";
    }
    if (!/^[A-Za-z\s]{2,}$/.test(customDeliveryAddress.city.trim())) {
      errs.city = "City is required and must contain only letters/spaces.";
    }
    if (!/^[A-Za-z\s]{2,}$/.test(customDeliveryAddress.state.trim())) {
      errs.state = "State is required and must contain only letters/spaces.";
    }
    if (!/^\d{6}$/.test(customDeliveryAddress.postalCode.trim())) {
      errs.postalCode = "Postal code must be a valid 6-digit number.";
    }
    if (!customDeliveryAddress.country.trim()) {
      errs.country = "Country is required.";
    }
    setCartErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function placeOrder() {
    if (paymentMethod === "card") {
      await handleStripeCheckout();
      return;
    }

    // Validate custom address if selected
    if (!validateCustomAddress()) return;

    try {
      const orderBody = { paymentMethod };
      if (addressMode === "custom") {
        orderBody.deliveryAddress = {
          addressLine1: customDeliveryAddress.addressLine1.trim(),
          addressLine2: customDeliveryAddress.addressLine2.trim(),
          landmark: customDeliveryAddress.landmark.trim(),
          city: customDeliveryAddress.city.trim(),
          state: customDeliveryAddress.state.trim(),
          postalCode: customDeliveryAddress.postalCode.trim(),
          country: customDeliveryAddress.country.trim() || "India",
        };
      }

      const res = await fetch("/customer/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(orderBody),
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
            <div className="customer-alert-icon">!</div>
            <div className="customer-alert-content">{error}</div>
          </div>
        ) : items.length === 0 ? (
          <div className="customer-empty-state">
            <div className="customer-empty-icon">Cart</div>
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
                  onClick={() => setSelectedImage(it.image)}
                  style={{ cursor: "pointer" }}
                />
                <div className="customer-cart-item-details">
                  <h4 className="customer-cart-item-name">{it.name}</h4>
                  <div className="customer-cart-item-price">Rs {it.price}</div>
                </div>
                <div className="customer-quantity-controls">
                  <button
                    className="customer-quantity-btn"
                    onClick={() => updateQuantity(it.productId, "decrease")}
                  >
                    -
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
                    {it.name} x {it.quantity}
                  </span>
                  <span>Rs {it.price * it.quantity}</span>
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
                  <span>Rs {subtotal.toFixed(2)}</span>
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
                  <span>Rs {deliveryCost.toFixed(2)}</span>
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
                  <span>Rs {tax.toFixed(2)}</span>
                </div>
              </div>
              <div className="customer-cart-total">
                <span>Total Amount</span>
                <span className="customer-cart-total-amount">
                  Rs {totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Delivery Address Choice */}
            <div
              style={{
                background: "var(--customer-card-bg)",
                borderRadius: "12px",
                padding: "20px",
                marginTop: "20px",
                border: "1px solid var(--customer-border)",
              }}
            >
              <h4 style={{ marginBottom: "14px", fontWeight: 600 }}>
                Delivery Address
              </h4>
              <div
                style={{
                  display: "flex",
                  gap: "16px",
                  flexWrap: "wrap",
                  marginBottom: "12px",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    padding: "10px 18px",
                    borderRadius: "8px",
                    border:
                      addressMode === "profile"
                        ? "2px solid var(--customer-primary)"
                        : "2px solid var(--customer-border)",
                    background:
                      addressMode === "profile"
                        ? "var(--customer-primary-light, rgba(37,99,235,0.08))"
                        : "transparent",
                    fontWeight: addressMode === "profile" ? 600 : 400,
                    transition: "all 0.2s",
                  }}
                >
                  <input
                    type="radio"
                    name="addressMode"
                    value="profile"
                    checked={addressMode === "profile"}
                    onChange={() => setAddressMode("profile")}
                  />
                  Use Profile Address
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    padding: "10px 18px",
                    borderRadius: "8px",
                    border:
                      addressMode === "custom"
                        ? "2px solid var(--customer-primary)"
                        : "2px solid var(--customer-border)",
                    background:
                      addressMode === "custom"
                        ? "var(--customer-primary-light, rgba(37,99,235,0.08))"
                        : "transparent",
                    fontWeight: addressMode === "custom" ? 600 : 400,
                    transition: "all 0.2s",
                  }}
                >
                  <input
                    type="radio"
                    name="addressMode"
                    value="custom"
                    checked={addressMode === "custom"}
                    onChange={() => setAddressMode("custom")}
                  />
                  Enter Different Address
                </label>
              </div>

              {addressMode === "custom" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "12px",
                    marginTop: "8px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        marginBottom: "4px",
                        display: "block",
                        color: "var(--customer-text-secondary)",
                      }}
                    >
                      House No, Building
                    </label>
                    <input
                      type="text"
                      className={`customer-input ${cartErrors.addressLine1 ? "customer-input-error" : ""}`}
                      placeholder="e.g., 12A, Sunrise Apartments"
                      value={customDeliveryAddress.addressLine1}
                      onChange={(e) => {
                        setCustomDeliveryAddress((p) => ({
                          ...p,
                          addressLine1: e.target.value,
                        }));
                        setCartErrors((p) => ({
                          ...p,
                          addressLine1: undefined,
                        }));
                      }}
                      style={{ width: "100%" }}
                    />
                    {cartErrors.addressLine1 && (
                      <div className="customer-error-text">
                        {cartErrors.addressLine1}
                      </div>
                    )}
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        marginBottom: "4px",
                        display: "block",
                        color: "var(--customer-text-secondary)",
                      }}
                    >
                      Street, Area (Optional)
                    </label>
                    <input
                      type="text"
                      className={`customer-input ${cartErrors.addressLine2 ? "customer-input-error" : ""}`}
                      placeholder="e.g., MG Road, Indiranagar"
                      value={customDeliveryAddress.addressLine2}
                      onChange={(e) => {
                        setCustomDeliveryAddress((p) => ({
                          ...p,
                          addressLine2: e.target.value,
                        }));
                        setCartErrors((p) => ({
                          ...p,
                          addressLine2: undefined,
                        }));
                      }}
                      style={{ width: "100%" }}
                    />
                    {cartErrors.addressLine2 && (
                      <div className="customer-error-text">
                        {cartErrors.addressLine2}
                      </div>
                    )}
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        marginBottom: "4px",
                        display: "block",
                        color: "var(--customer-text-secondary)",
                      }}
                    >
                      Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      className={`customer-input ${cartErrors.landmark ? "customer-input-error" : ""}`}
                      placeholder="e.g., Near City Mall"
                      value={customDeliveryAddress.landmark}
                      onChange={(e) => {
                        setCustomDeliveryAddress((p) => ({
                          ...p,
                          landmark: e.target.value,
                        }));
                        setCartErrors((p) => ({ ...p, landmark: undefined }));
                      }}
                      style={{ width: "100%" }}
                    />
                    {cartErrors.landmark && (
                      <div className="customer-error-text">
                        {cartErrors.landmark}
                      </div>
                    )}
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        marginBottom: "4px",
                        display: "block",
                        color: "var(--customer-text-secondary)",
                      }}
                    >
                      City
                    </label>
                    <input
                      type="text"
                      className={`customer-input ${cartErrors.city ? "customer-input-error" : ""}`}
                      placeholder="City"
                      value={customDeliveryAddress.city}
                      onChange={(e) => {
                        setCustomDeliveryAddress((p) => ({
                          ...p,
                          city: e.target.value,
                        }));
                        setCartErrors((p) => ({ ...p, city: undefined }));
                      }}
                      style={{ width: "100%" }}
                    />
                    {cartErrors.city && (
                      <div className="customer-error-text">
                        {cartErrors.city}
                      </div>
                    )}
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        marginBottom: "4px",
                        display: "block",
                        color: "var(--customer-text-secondary)",
                      }}
                    >
                      State
                    </label>
                    <input
                      type="text"
                      className={`customer-input ${cartErrors.state ? "customer-input-error" : ""}`}
                      placeholder="State"
                      value={customDeliveryAddress.state}
                      onChange={(e) => {
                        setCustomDeliveryAddress((p) => ({
                          ...p,
                          state: e.target.value,
                        }));
                        setCartErrors((p) => ({ ...p, state: undefined }));
                      }}
                      style={{ width: "100%" }}
                    />
                    {cartErrors.state && (
                      <div className="customer-error-text">
                        {cartErrors.state}
                      </div>
                    )}
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        marginBottom: "4px",
                        display: "block",
                        color: "var(--customer-text-secondary)",
                      }}
                    >
                      Postal Code
                    </label>
                    <input
                      type="text"
                      className={`customer-input ${cartErrors.postalCode ? "customer-input-error" : ""}`}
                      placeholder="6-digit postal code"
                      value={customDeliveryAddress.postalCode}
                      onChange={(e) => {
                        setCustomDeliveryAddress((p) => ({
                          ...p,
                          postalCode: e.target.value,
                        }));
                        setCartErrors((p) => ({ ...p, postalCode: undefined }));
                      }}
                      style={{ width: "100%" }}
                    />
                    {cartErrors.postalCode && (
                      <div className="customer-error-text">
                        {cartErrors.postalCode}
                      </div>
                    )}
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        marginBottom: "4px",
                        display: "block",
                        color: "var(--customer-text-secondary)",
                      }}
                    >
                      Country
                    </label>
                    <input
                      type="text"
                      className={`customer-input ${cartErrors.country ? "customer-input-error" : ""}`}
                      placeholder="Country"
                      value={customDeliveryAddress.country}
                      onChange={(e) => {
                        setCustomDeliveryAddress((p) => ({
                          ...p,
                          country: e.target.value,
                        }));
                        setCartErrors((p) => ({ ...p, country: undefined }));
                      }}
                      style={{ width: "100%" }}
                    />
                    {cartErrors.country && (
                      <div className="customer-error-text">
                        {cartErrors.country}
                      </div>
                    )}
                  </div>
                </div>
              )}
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
                  x
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
                        Pay with Card
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
                      Cash on Delivery
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
              {cartErrors.payment && (
                <div
                  className="customer-error-text"
                  style={{ padding: "0 20px" }}
                >
                  {cartErrors.payment}
                </div>
              )}
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
                      setCartErrors((p) => ({
                        ...p,
                        payment: "Please select a payment method.",
                      }));
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
                  x
                </button>
              </div>
              <div
                className="customer-modal-body"
                style={{ textAlign: "center" }}
              >
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                  Order
                </div>
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
                    <span>Rs {subtotal.toFixed(2)}</span>
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
                    <span>Rs {deliveryCost.toFixed(2)}</span>
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
                    <span>Rs {tax.toFixed(2)}</span>
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
                      Rs {totalAmount.toFixed(2)}
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
                  Place Order
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image Lightbox Modal */}
        {selectedImage && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.85)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2000,
            }}
            onClick={() => setSelectedImage(null)}
          >
            <div
              style={{
                position: "relative",
                maxWidth: "85vw",
                maxHeight: "85vh",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedImage}
                alt="Large view"
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  borderRadius: "8px",
                }}
              />
              <button
                onClick={() => setSelectedImage(null)}
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  color: "white",
                  border: "2px solid white",
                  borderRadius: "50%",
                  width: "45px",
                  height: "45px",
                  fontSize: "28px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
                }}
                title="Close (Esc)"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </main>
      <CustomerFooter />
    </div>
  );
}
