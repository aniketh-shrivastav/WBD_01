const express = require("express");
const router = express.Router();

// Stripe initialization - uses STRIPE_SECRET_KEY from environment
const stripe = process.env.STRIPE_SECRET_KEY
  ? require("stripe")(process.env.STRIPE_SECRET_KEY)
  : null;

// Store for mock payment sessions (in-memory for demo, use DB in production)
const mockSessions = new Map();

// Middleware to check if user is logged in
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ success: false, message: "Please log in" });
  }
  next();
}

function resolveFrontendBase(req, successUrl, cancelUrl) {
  const envBase = process.env.FRONTEND_URL;
  const origin = req.get("origin");

  const fromUrl = (value) => {
    if (!value || typeof value !== "string") return null;
    try {
      const parsed = new URL(value);
      return `${parsed.protocol}//${parsed.host}`;
    } catch (e) {
      return null;
    }
  };

  return (
    fromUrl(successUrl) ||
    fromUrl(cancelUrl) ||
    envBase ||
    origin ||
    `${req.protocol}://${req.get("host")}`
  );
}

// Create checkout session (Stripe or Mock)
router.post("/create-checkout-session", requireAuth, async (req, res) => {
  try {
    const { items, orderId, successUrl, cancelUrl } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No items provided for checkout",
      });
    }

    const totalAmount = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const frontendBase = resolveFrontendBase(req, successUrl, cancelUrl);

    // If Stripe is configured, use real Stripe
    if (stripe) {
      const lineItems = items.map((item) => ({
        price_data: {
          currency: "inr",
          product_data: {
            name: item.name,
            images: item.image ? [item.image] : [],
            description: item.description || `Product ID: ${item.productId}`,
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      }));

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        success_url:
          successUrl ||
          `${frontendBase}/customer/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${frontendBase}/customer/cart`,
        customer_email: req.session.user.email,
        metadata: {
          userId: req.session.user.id || req.session.user._id,
          orderId: orderId || "",
        },
        shipping_address_collection: {
          allowed_countries: ["IN"],
        },
      });

      return res.json({
        success: true,
        sessionId: session.id,
        url: session.url,
        mode: "stripe",
      });
    }

    // Mock payment session
    const mockSessionId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const mockSession = {
      id: mockSessionId,
      items: items,
      totalAmount: totalAmount,
      userId: req.session.user.id || req.session.user._id,
      userEmail: req.session.user.email,
      orderId: orderId || "",
      status: "pending",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    };

    mockSessions.set(mockSessionId, mockSession);

    // Return mock checkout URL
    res.json({
      success: true,
      sessionId: mockSessionId,
      url: `${frontendBase}/customer/mock-checkout?session_id=${mockSessionId}`,
      mode: "mock",
    });
  } catch (error) {
    console.error("Checkout error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create checkout session",
    });
  }
});

// Get mock session details
router.get("/mock-session/:sessionId", requireAuth, (req, res) => {
  const session = mockSessions.get(req.params.sessionId);

  if (!session) {
    return res.status(404).json({
      success: false,
      message: "Session not found or expired",
    });
  }

  // Check if session belongs to this user
  const userId = req.session.user.id || req.session.user._id;
  if (session.userId !== userId && session.userId !== String(userId)) {
    return res.status(403).json({
      success: false,
      message: "Unauthorized",
    });
  }

  res.json({
    success: true,
    session: {
      id: session.id,
      items: session.items,
      totalAmount: session.totalAmount,
      status: session.status,
      userEmail: session.userEmail,
    },
  });
});

// Process mock payment
router.post("/mock-payment/:sessionId", requireAuth, async (req, res) => {
  try {
    const { cardNumber, expiryDate, cvv, cardName } = req.body;
    const session = mockSessions.get(req.params.sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found or expired",
      });
    }

    // Check if session belongs to this user
    const userId = req.session.user.id || req.session.user._id;
    if (session.userId !== userId && session.userId !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Basic mock validation
    if (!cardNumber || cardNumber.replace(/\s/g, "").length < 13) {
      return res.status(400).json({
        success: false,
        message: "Invalid card number",
      });
    }

    if (!expiryDate || !/^\d{2}\/\d{2}$/.test(expiryDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid expiry date (MM/YY)",
      });
    }

    if (!cvv || cvv.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Invalid CVV",
      });
    }

    if (!cardName || cardName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Please enter cardholder name",
      });
    }

    // Simulate payment processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Mock payment success (in real scenario, you'd process the payment here)
    // Card numbers starting with "4000 0000 0000 0002" simulate declined
    if (cardNumber.replace(/\s/g, "").startsWith("4000000000000002")) {
      session.status = "failed";
      mockSessions.set(req.params.sessionId, session);
      return res.status(400).json({
        success: false,
        message: "Payment declined. Please try a different card.",
      });
    }

    // Update session status
    session.status = "paid";
    session.paidAt = new Date();
    session.paymentMethod = "mock_card";
    session.last4 = cardNumber.replace(/\s/g, "").slice(-4);
    mockSessions.set(req.params.sessionId, session);

    res.json({
      success: true,
      message: "Payment successful!",
      sessionId: session.id,
      redirectUrl: `/customer/payment-success?session_id=${session.id}`,
    });
  } catch (error) {
    console.error("Mock payment error:", error);
    res.status(500).json({
      success: false,
      message: "Payment processing failed. Please try again.",
    });
  }
});

// Verify payment session (works for both Stripe and Mock)
router.get("/verify-session/:sessionId", requireAuth, async (req, res) => {
  try {
    const sessionId = req.params.sessionId;

    // Check if it's a mock session
    if (sessionId.startsWith("mock_")) {
      const session = mockSessions.get(sessionId);

      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Session not found",
        });
      }

      return res.json({
        success: true,
        paymentStatus: session.status === "paid" ? "paid" : "unpaid",
        customerEmail: session.userEmail,
        amountTotal: session.totalAmount,
        currency: "inr",
        metadata: {
          userId: session.userId,
          orderId: session.orderId,
        },
        mode: "mock",
        items: session.items,
      });
    }

    // Real Stripe session
    if (!stripe) {
      return res.status(500).json({
        success: false,
        message: "Stripe is not configured",
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    res.json({
      success: true,
      paymentStatus: session.payment_status,
      customerEmail: session.customer_email,
      amountTotal: session.amount_total / 100,
      currency: session.currency,
      metadata: session.metadata,
      mode: "stripe",
    });
  } catch (error) {
    console.error("Session verification error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to verify session",
    });
  }
});

// Webhook for Stripe events (optional but recommended for production)
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    if (!stripe) {
      return res.status(500).send("Stripe not configured");
    }

    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.log("Stripe webhook received but no webhook secret configured");
      return res.status(200).send("Webhook secret not configured");
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case "checkout.session.completed":
        console.log("Payment succeeded for session:", event.data.object.id);
        break;
      case "payment_intent.succeeded":
        console.log("Payment intent succeeded:", event.data.object.id);
        break;
      case "payment_intent.payment_failed":
        console.log("Payment failed:", event.data.object.id);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  },
);

// Get payment configuration
router.get("/config", (req, res) => {
  res.json({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
    stripeEnabled: !!process.env.STRIPE_SECRET_KEY,
    mockEnabled: true, // Mock is always available as fallback
  });
});

module.exports = router;
