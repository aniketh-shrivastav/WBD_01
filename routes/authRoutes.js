const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// GET Signup
router.get("/signup", authController.getSignup);

// POST Signup
router.post("/signup", authController.postSignup);

// GET Login
router.get("/login", authController.getLogin);

// POST Login
router.post("/login", authController.postLogin);

// Static Page Routes
router.get("/", authController.getIndex);
router.get("/contactus", authController.getContactUs);
router.get("/feedback", authController.getFeedback);
router.get("/faq", authController.getFaq);

// Logout
router.get("/logout", authController.logout);

// API endpoint to expose authentication status
router.get("/api/session", authController.getSession);

// POST Forgot Password
router.post("/forgot-password", authController.forgotPassword);

// GET Validate Reset Token
router.get("/reset-password/:token", authController.validateResetToken);

// POST Reset Password
router.post("/reset-password/:token", authController.resetPassword);

// POST Verify Signup OTP
router.post("/verify-otp", authController.verifyOtp);

// POST Resend Signup OTP
router.post("/resend-otp", authController.resendOtp);

// POST Google Sign-In with Firebase
router.post("/auth/google", authController.googleSignIn);

module.exports = router;
