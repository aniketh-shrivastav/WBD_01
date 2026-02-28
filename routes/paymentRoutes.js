const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");

// Middleware to check if user is logged in
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ success: false, message: "Please log in" });
  }
  next();
}

// Create checkout session (Stripe or Mock)
router.post("/create-checkout-session", requireAuth, paymentController.createCheckoutSession);

// Get mock session details
router.get("/mock-session/:sessionId", requireAuth, paymentController.getMockSession);

// Process mock payment
router.post("/mock-payment/:sessionId", requireAuth, paymentController.processMockPayment);

// Verify payment session (works for both Stripe and Mock)
router.get("/verify-session/:sessionId", requireAuth, paymentController.verifySession);

// Webhook for Stripe events
router.post("/webhook", express.raw({ type: "application/json" }), paymentController.webhook);

// Get payment configuration
router.get("/config", paymentController.getConfig);

module.exports = router;