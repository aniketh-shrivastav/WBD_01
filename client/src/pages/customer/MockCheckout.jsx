import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import CustomerNav from "../../components/CustomerNav";
import "../../Css/customer.css";

export default function MockCheckout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id");

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (!sessionId) {
      setError("Invalid checkout session");
      setLoading(false);
      return;
    }

    async function loadSession() {
      try {
        const res = await fetch(`/api/payments/mock-session/${sessionId}`, {
          headers: { Accept: "application/json" },
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to load session");
        }

        setSession(data.session);
      } catch (e) {
        setError(e.message || "Failed to load checkout session");
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [sessionId]);

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(" ") : v;
  };

  const formatExpiry = (value) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4);
    }
    return v;
  };

  const validateForm = () => {
    const errors = {};

    if (!cardNumber || cardNumber.replace(/\s/g, "").length < 13) {
      errors.cardNumber = "Enter a valid card number";
    }

    if (!expiryDate || !/^\d{2}\/\d{2}$/.test(expiryDate)) {
      errors.expiryDate = "Enter valid expiry (MM/YY)";
    } else {
      const [month, year] = expiryDate.split("/");
      const now = new Date();
      const expiry = new Date(2000 + parseInt(year), parseInt(month) - 1);
      if (expiry < now) {
        errors.expiryDate = "Card has expired";
      }
    }

    if (!cvv || cvv.length < 3) {
      errors.cvv = "Enter valid CVV";
    }

    if (!cardName || cardName.trim().length < 2) {
      errors.cardName = "Enter cardholder name";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setProcessing(true);
    setError("");

    try {
      const res = await fetch(`/api/payments/mock-payment/${sessionId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          cardNumber,
          expiryDate,
          cvv,
          cardName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Payment failed");
      }

      // Redirect to success page
      navigate(`/customer/payment-success?session_id=${sessionId}`);
    } catch (e) {
      setError(e.message || "Payment failed. Please try again.");
      setProcessing(false);
    }
  };

  const handleCancel = () => {
    navigate("/customer/cart");
  };

  if (loading) {
    return (
      <div className="customer-page">
        <CustomerNav />
        <main
          className="customer-main"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "60vh",
          }}
        >
          <div className="customer-loading">
            <div className="customer-spinner"></div>
            <div className="customer-loading-text">Loading checkout...</div>
          </div>
        </main>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="customer-page">
        <CustomerNav />
        <main
          className="customer-main"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "60vh",
          }}
        >
          <div className="customer-empty-state">
            <div className="customer-empty-icon">⚠️</div>
            <h3 className="customer-empty-title">Checkout Error</h3>
            <p className="customer-empty-description">{error}</p>
            <button
              onClick={() => navigate("/customer/cart")}
              className="customer-btn customer-btn-primary"
            >
              Return to Cart
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="customer-page">
      <CustomerNav />
      <main className="customer-main">
        <div style={styles.container}>
          {/* Left: Payment Form */}
          <div style={styles.formSection}>
            <div style={styles.formCard}>
              <div style={styles.secureHeader}>
                <span style={styles.lockIcon}>🔒</span>
                <span>Secure Payment</span>
                <span style={styles.testBadge}>TEST MODE</span>
              </div>

              <h2 style={styles.formTitle}>Payment Details</h2>

              {error && (
                <div style={styles.errorBox}>
                  <span>❌</span> {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Card Number</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) =>
                      setCardNumber(formatCardNumber(e.target.value))
                    }
                    placeholder="4242 4242 4242 4242"
                    maxLength={19}
                    style={{
                      ...styles.input,
                      borderColor: formErrors.cardNumber ? "#ef4444" : "#ddd",
                    }}
                  />
                  {formErrors.cardNumber && (
                    <span style={styles.fieldError}>
                      {formErrors.cardNumber}
                    </span>
                  )}
                  <div style={styles.cardIcons}>
                    <span>💳 Visa</span>
                    <span>💳 Mastercard</span>
                    <span>💳 Amex</span>
                  </div>
                </div>

                <div style={styles.row}>
                  <div style={{ ...styles.formGroup, flex: 1 }}>
                    <label style={styles.label}>Expiry Date</label>
                    <input
                      type="text"
                      value={expiryDate}
                      onChange={(e) =>
                        setExpiryDate(formatExpiry(e.target.value))
                      }
                      placeholder="MM/YY"
                      maxLength={5}
                      style={{
                        ...styles.input,
                        borderColor: formErrors.expiryDate ? "#ef4444" : "#ddd",
                      }}
                    />
                    {formErrors.expiryDate && (
                      <span style={styles.fieldError}>
                        {formErrors.expiryDate}
                      </span>
                    )}
                  </div>
                  <div style={{ ...styles.formGroup, flex: 1 }}>
                    <label style={styles.label}>CVV</label>
                    <input
                      type="text"
                      value={cvv}
                      onChange={(e) =>
                        setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                      placeholder="123"
                      maxLength={4}
                      style={{
                        ...styles.input,
                        borderColor: formErrors.cvv ? "#ef4444" : "#ddd",
                      }}
                    />
                    {formErrors.cvv && (
                      <span style={styles.fieldError}>{formErrors.cvv}</span>
                    )}
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Cardholder Name</label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="John Doe"
                    style={{
                      ...styles.input,
                      borderColor: formErrors.cardName ? "#ef4444" : "#ddd",
                    }}
                  />
                  {formErrors.cardName && (
                    <span style={styles.fieldError}>{formErrors.cardName}</span>
                  )}
                </div>

                <div style={styles.testInfo}>
                  <strong>🧪 Test Card Numbers:</strong>
                  <div style={styles.testCards}>
                    <div>
                      <code>4242 4242 4242 4242</code> - Success
                    </div>
                    <div>
                      <code>4000 0000 0000 0002</code> - Declined
                    </div>
                    <div>Use any future date and any 3-digit CVV</div>
                  </div>
                </div>

                <div style={styles.buttonGroup}>
                  <button
                    type="button"
                    onClick={handleCancel}
                    style={styles.cancelBtn}
                    disabled={processing}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={styles.payBtn}
                    disabled={processing}
                  >
                    {processing ? (
                      <>
                        <span style={styles.spinner}></span>
                        Processing...
                      </>
                    ) : (
                      `Pay ₹${session?.totalAmount || 0}`
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right: Order Summary */}
          <div style={styles.summarySection}>
            <div style={styles.summaryCard}>
              <h3 style={styles.summaryTitle}>Order Summary</h3>

              <div style={styles.itemsList}>
                {session?.items?.map((item, idx) => (
                  <div key={idx} style={styles.item}>
                    <img
                      src={item.image || "/images/placeholder.png"}
                      alt={item.name}
                      style={styles.itemImage}
                    />
                    <div style={styles.itemDetails}>
                      <div style={styles.itemName}>{item.name}</div>
                      <div style={styles.itemQty}>Qty: {item.quantity}</div>
                    </div>
                    <div style={styles.itemPrice}>
                      ₹{item.price * item.quantity}
                    </div>
                  </div>
                ))}
              </div>

              <div style={styles.divider}></div>

              <div style={styles.totalRow}>
                <span>Subtotal</span>
                <span>₹{session?.totalAmount || 0}</span>
              </div>
              <div style={styles.totalRow}>
                <span>Shipping</span>
                <span style={{ color: "#10b981" }}>Free</span>
              </div>
              <div style={styles.divider}></div>
              <div style={styles.grandTotal}>
                <span>Total</span>
                <span>₹{session?.totalAmount || 0}</span>
              </div>

              <div style={styles.guarantees}>
                <div style={styles.guarantee}>
                  <span>🔒</span> Secure 256-bit SSL encryption
                </div>
                <div style={styles.guarantee}>
                  <span>✓</span> 7-day return policy
                </div>
                <div style={styles.guarantee}>
                  <span>📦</span> Free shipping on all orders
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  container: {
    display: "grid",
    gridTemplateColumns: "1fr 400px",
    gap: "2rem",
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "2rem",
  },
  formSection: {},
  formCard: {
    background: "white",
    borderRadius: "16px",
    padding: "2rem",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
  },
  secureHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    color: "#10b981",
    fontSize: "0.875rem",
    fontWeight: 600,
    marginBottom: "1.5rem",
  },
  lockIcon: {
    fontSize: "1rem",
  },
  testBadge: {
    marginLeft: "auto",
    background: "#fef3c7",
    color: "#d97706",
    padding: "0.25rem 0.75rem",
    borderRadius: "20px",
    fontSize: "0.75rem",
    fontWeight: 700,
  },
  formTitle: {
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "#1e1e2d",
    margin: "0 0 1.5rem",
  },
  errorBox: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#dc2626",
    padding: "0.75rem 1rem",
    borderRadius: "8px",
    marginBottom: "1rem",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  formGroup: {
    marginBottom: "1.25rem",
  },
  label: {
    display: "block",
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#374151",
    marginBottom: "0.5rem",
  },
  input: {
    width: "100%",
    padding: "0.875rem 1rem",
    fontSize: "1rem",
    border: "2px solid #e5e7eb",
    borderRadius: "10px",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box",
  },
  fieldError: {
    color: "#ef4444",
    fontSize: "0.75rem",
    marginTop: "0.25rem",
    display: "block",
  },
  cardIcons: {
    display: "flex",
    gap: "1rem",
    marginTop: "0.5rem",
    fontSize: "0.75rem",
    color: "#6b7280",
  },
  row: {
    display: "flex",
    gap: "1rem",
  },
  testInfo: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "10px",
    padding: "1rem",
    marginBottom: "1.5rem",
    fontSize: "0.875rem",
  },
  testCards: {
    marginTop: "0.5rem",
    color: "#166534",
    lineHeight: 1.6,
  },
  buttonGroup: {
    display: "flex",
    gap: "1rem",
    marginTop: "1.5rem",
  },
  cancelBtn: {
    flex: 1,
    padding: "1rem",
    fontSize: "1rem",
    fontWeight: 600,
    border: "2px solid #e5e7eb",
    borderRadius: "10px",
    background: "white",
    color: "#374151",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  payBtn: {
    flex: 2,
    padding: "1rem",
    fontSize: "1rem",
    fontWeight: 600,
    border: "none",
    borderRadius: "10px",
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    color: "white",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    transition: "all 0.2s",
  },
  spinner: {
    width: "18px",
    height: "18px",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "white",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  summarySection: {},
  summaryCard: {
    background: "white",
    borderRadius: "16px",
    padding: "1.5rem",
    boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
    position: "sticky",
    top: "100px",
  },
  summaryTitle: {
    fontSize: "1.125rem",
    fontWeight: 700,
    color: "#1e1e2d",
    margin: "0 0 1.25rem",
  },
  itemsList: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  itemImage: {
    width: "50px",
    height: "50px",
    borderRadius: "8px",
    objectFit: "cover",
    background: "#f3f4f6",
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#1e1e2d",
  },
  itemQty: {
    fontSize: "0.75rem",
    color: "#6b7280",
  },
  itemPrice: {
    fontWeight: 600,
    color: "#1e1e2d",
  },
  divider: {
    height: "1px",
    background: "#e5e7eb",
    margin: "1.25rem 0",
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.875rem",
    color: "#6b7280",
    marginBottom: "0.5rem",
  },
  grandTotal: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "#1e1e2d",
  },
  guarantees: {
    marginTop: "1.5rem",
    paddingTop: "1rem",
    borderTop: "1px solid #e5e7eb",
  },
  guarantee: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.75rem",
    color: "#6b7280",
    marginBottom: "0.5rem",
  },
};

// Add keyframes for spinner
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);
