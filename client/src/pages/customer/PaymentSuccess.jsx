import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import CustomerNav from "../../components/CustomerNav";
import CustomerFooter from "../../components/CustomerFooter";
import "../../Css/customer.css";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [error, setError] = useState("");

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    async function verifyPayment() {
      if (!sessionId) {
        setError("No payment session found");
        setVerifying(false);
        return;
      }

      try {
        // Verify the payment session
        const res = await fetch(`/api/payments/verify-session/${sessionId}`, {
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
          throw new Error("Failed to verify payment");
        }

        const data = await res.json();

        if (data.success && data.paymentStatus === "paid") {
          setPaymentDetails(data);

          // Create the order after successful payment verification
          const orderRes = await fetch("/customer/create-order", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              paymentMethod: "stripe",
              stripeSessionId: sessionId,
              paymentStatus: "paid",
            }),
          });

          if (!orderRes.ok) {
            const orderData = await orderRes.json();
            console.error("Order creation issue:", orderData.message);
          }
        } else {
          setError("Payment was not completed");
        }
      } catch (e) {
        setError(e.message || "Failed to verify payment");
      } finally {
        setVerifying(false);
      }
    }

    verifyPayment();
  }, [sessionId]);

  return (
    <div className="customer-page">
      <CustomerNav />

      <main
        className="customer-main"
        style={{ textAlign: "center", padding: "60px 20px" }}
      >
        {verifying ? (
          <div className="customer-loading">
            <div className="customer-spinner"></div>
            <div className="customer-loading-text">
              Verifying your payment...
            </div>
          </div>
        ) : error ? (
          <div style={{ maxWidth: "500px", margin: "0 auto" }}>
            <div style={{ fontSize: "64px", marginBottom: "24px" }}>❌</div>
            <h1 style={{ color: "#ef4444", marginBottom: "16px" }}>
              Payment Issue
            </h1>
            <p
              style={{
                color: "var(--customer-text-secondary)",
                marginBottom: "32px",
              }}
            >
              {error}
            </p>
            <div
              style={{ display: "flex", gap: "16px", justifyContent: "center" }}
            >
              <Link
                to="/customer/cart"
                className="customer-btn customer-btn-primary"
              >
                Return to Cart
              </Link>
              <Link
                to="/customer/index"
                className="customer-btn customer-btn-secondary"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: "500px", margin: "0 auto" }}>
            <div
              style={{
                width: "100px",
                height: "100px",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px",
                fontSize: "48px",
              }}
            >
              ✓
            </div>
            <h1 style={{ color: "#10b981", marginBottom: "16px" }}>
              Payment Successful!
            </h1>
            <p
              style={{
                color: "var(--customer-text-secondary)",
                marginBottom: "8px",
              }}
            >
              Thank you for your purchase. Your order has been placed
              successfully.
            </p>

            {paymentDetails && (
              <div
                style={{
                  background: "var(--customer-card-bg)",
                  border: "1px solid var(--customer-border)",
                  borderRadius: "12px",
                  padding: "24px",
                  margin: "24px 0",
                  textAlign: "left",
                }}
              >
                <h3
                  style={{
                    marginBottom: "16px",
                    borderBottom: "1px solid var(--customer-border)",
                    paddingBottom: "12px",
                  }}
                >
                  Payment Details
                </h3>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <span style={{ color: "var(--customer-text-secondary)" }}>
                    Amount Paid:
                  </span>
                  <span style={{ fontWeight: "600", color: "#10b981" }}>
                    ₹{paymentDetails.amountTotal}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <span style={{ color: "var(--customer-text-secondary)" }}>
                    Payment Method:
                  </span>
                  <span>Card (Stripe)</span>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span style={{ color: "var(--customer-text-secondary)" }}>
                    Email:
                  </span>
                  <span>{paymentDetails.customerEmail}</span>
                </div>
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: "16px",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              <Link
                to="/customer/history"
                className="customer-btn customer-btn-primary"
              >
                View My Orders
              </Link>
              <Link
                to="/customer/index"
                className="customer-btn customer-btn-secondary"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        )}
      </main>

      <CustomerFooter />
    </div>
  );
}
