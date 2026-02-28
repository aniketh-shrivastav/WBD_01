const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("../models/User");
const firebaseAdmin = require("../config/firebaseAdmin");

// Helper to detect if client expects JSON
function wantsJson(req) {
  return (
    (req.headers.accept || "").includes("application/json") ||
    (req.headers["content-type"] || "").includes("application/json")
  );
}

// Send email helper
async function sendEmail(to, subject, text, html) {
  let emailSent = false;
  let previewUrl = null;

  try {
    if (
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    ) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        text,
        html,
      });
      emailSent = true;
    }
  } catch (e) {
    console.error("Email send failed", e.message);
  }

  // Development fallback using Ethereal test account
  if (!emailSent && process.env.NODE_ENV !== "production") {
    try {
      const testAccount = await nodemailer.createTestAccount();
      const transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      const info = await transporter.sendMail({
        from: "AutoCustomizer <no-reply@autocustomizer.test>",
        to,
        subject: `${subject} (Test)`,
        text,
        html,
      });
      previewUrl = nodemailer.getTestMessageUrl(info);
      emailSent = true;
    } catch (e) {
      console.log("Ethereal email send failed.");
    }
  }

  return { emailSent, previewUrl };
}

exports.getSignup = (req, res) => {
  res.render("signup", { error: null });
};

exports.postSignup = async (req, res) => {
  const { name, email, password, role, businessName, workshopName, phone } =
    req.body;
  const finalName = name || businessName || workshopName;
  const isJson = wantsJson(req);

  // Validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const nameRegex = /^[A-Za-z\s.-]+$/;
  const allowedRoles = [
    "customer",
    "seller",
    "service-provider",
    "manager",
    "admin",
  ];

  let error = null;
  if (!finalName || !email || !password || !role) {
    error = "All fields are required";
  } else if (!allowedRoles.includes(role)) {
    error = "Invalid role";
  } else if (!emailRegex.test(email) || !/(\.com|\.in)$/i.test(email)) {
    error = "Please enter a valid email ending in .com or .in";
  } else if (!nameRegex.test(finalName)) {
    error = "Name should not contain numbers or special characters";
  } else if (!phone || !/^\d{10}$/.test(String(phone).trim())) {
    error = "Phone number must be 10 digits.";
  }

  if (error) {
    if (isJson) {
      return res.status(400).json({ success: false, message: error });
    }
    return res.render("signup", { error });
  }

  try {
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const errMsg = "Email already exists";
      if (isJson) {
        return res.status(400).json({ success: false, message: errMsg });
      }
      return res.render("signup", { error: errMsg });
    }

    if (role === "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount > 0) {
        const errMsg = "Admin account already exists";
        if (isJson) {
          return res.status(403).json({ success: false, message: errMsg });
        }
        return res.render("signup", { error: errMsg });
      }
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save user in MongoDB (unverified until OTP confirmed)
    const newUser = new User({
      name: finalName,
      email,
      phone,
      password: hashedPassword,
      role,
      emailVerified: false,
    });

    // Generate 6-digit OTP and store hashed
    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash("sha256").update(rawOtp).digest("hex");
    newUser.signupOtp = hashedOtp;
    newUser.signupOtpExpires = Date.now() + 1000 * 60 * 10; // 10 minutes
    newUser.signupOtpAttempts = 0;

    await newUser.save();
    console.log("MongoDB user inserted (pending verification):", newUser._id);

    // Send OTP email
    const { emailSent, previewUrl } = await sendEmail(
      email,
      "Verify your AutoCustomizer account",
      `Your verification code is ${rawOtp}. It expires in 10 minutes.`,
      `<p>Welcome to AutoCustomizer!</p><p>Your verification code is <b>${rawOtp}</b>. It expires in 10 minutes.</p>`,
    );

    if (!emailSent) {
      console.log("Signup OTP for", email, "=", rawOtp);
    }

    const frontendBase = process.env.FRONTEND_URL || "http://localhost:5173";
    const redirect = `${frontendBase.replace(
      /\/$/,
      "",
    )}/verify-otp?email=${encodeURIComponent(email)}`;

    if (isJson) {
      return res.json({
        success: true,
        requiresOtp: true,
        message: "We've sent a 6-digit verification code to your email.",
        redirect,
        previewUrl,
      });
    }
    return res.redirect(redirect);
  } catch (error) {
    console.error("MongoDB error:", error.message);
    if (isJson) {
      return res.status(500).json({ success: false, message: "Server error" });
    }
    return res.render("signup", { error: "Server error" });
  }
};

exports.getLogin = (req, res) => {
  res.render("login");
};

exports.postLogin = async (req, res) => {
  const { email, password } = req.body;
  const isJson = wantsJson(req);

  try {
    // Find user in MongoDB
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    if (user.emailVerified === false) {
      const frontendBase = process.env.FRONTEND_URL || "http://localhost:5173";
      const verifyUrl = `${frontendBase.replace(
        /\/$/,
        "",
      )}/verify-otp?email=${encodeURIComponent(email)}`;
      return res.status(403).json({
        message: "Please verify your email to continue.",
        redirect: verifyUrl,
      });
    }

    // Check if the user is suspended
    if (user.suspended) {
      return res.status(403).json({
        message: "Your account is suspended. Contact support for assistance.",
      });
    }

    // Compare entered password with hashed password in MongoDB
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Store user session
    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };

    // Role-based redirection
    const redirects = {
      manager: "/manager/dashboard",
      customer: "/customer/index",
      seller: "/seller/dashboard",
      "service-provider": "/service/dashboardService",
      admin: "/admin/dashboard",
    };

    const redirect = redirects[user.role];
    if (!redirect) {
      return res.status(403).send("Unknown role");
    }

    if (isJson) {
      return res.json({
        success: true,
        role: user.role,
        redirect,
      });
    }
    return res.redirect(redirect);
  } catch (error) {
    console.error("MongoDB error:", error.message);
    res.status(500).send("Internal server error");
  }
};

exports.logout = (req, res) => {
  const next = req.query.next;
  req.session.destroy(() => {
    try {
      res.clearCookie("connect.sid");
    } catch {}
    if (next && /^https?:\/\//.test(next)) {
      return res.redirect(next);
    }
    res.redirect("/");
  });
};

exports.getSession = (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ authenticated: true, user: req.session.user });
  }
  res.json({ authenticated: false });
};

exports.postForgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: "Email required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({
        success: true,
        message: "If that email exists, a reset link was sent.",
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 15; // 15 minutes
    await user.save();

    // Build a reset link
    const frontendBase = process.env.FRONTEND_URL;
    const resetLink = frontendBase
      ? `${frontendBase.replace(/\/$/, "")}/reset-password/${rawToken}`
      : `${req.protocol}://${req.get("host")}/reset-password/${rawToken}`;

    const { emailSent, previewUrl } = await sendEmail(
      email,
      "Password Reset",
      `Reset your password: ${resetLink}`,
      `<p>You requested a password reset.</p><p><a href="${resetLink}">Click here to reset</a></p>`,
    );

    if (!emailSent) {
      console.log("Password reset link (no SMTP configured):", resetLink);
    }

    return res.json({
      success: true,
      message: "If that email exists, a reset link was sent.",
      previewUrl,
    });
  } catch (err) {
    console.error("Forgot password error", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getResetPassword = async (req, res) => {
  const { token } = req.params;
  if (!token) return res.status(400).json({ valid: false });

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  try {
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(404).json({ valid: false });
    return res.json({ valid: true });
  } catch (e) {
    return res.status(500).json({ valid: false });
  }
};

exports.postResetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  if (!password) {
    return res
      .status(400)
      .json({ success: false, message: "Password required" });
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  try {
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired token" });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.json({
      success: true,
      message: "Password updated. Please login.",
    });
  } catch (e) {
    console.error("Reset password error", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.postVerifyOtp = async (req, res) => {
  const { email, otp } = req.body || {};
  if (!email || !otp) {
    return res
      .status(400)
      .json({ success: false, message: "Email and code are required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    if (user.emailVerified === true) {
      return res.json({ success: true, message: "Already verified" });
    }
    if (!user.signupOtp || !user.signupOtpExpires) {
      return res
        .status(400)
        .json({ success: false, message: "No active code. Please resend." });
    }
    if (Date.now() > user.signupOtpExpires) {
      return res
        .status(400)
        .json({ success: false, message: "Code expired. Please resend." });
    }
    // Rate limit attempts
    if (user.signupOtpAttempts >= 5) {
      return res
        .status(429)
        .json({ success: false, message: "Too many attempts. Please resend." });
    }

    const hashedOtp = crypto
      .createHash("sha256")
      .update(String(otp))
      .digest("hex");
    if (hashedOtp !== user.signupOtp) {
      user.signupOtpAttempts = (user.signupOtpAttempts || 0) + 1;
      await user.save();
      return res
        .status(400)
        .json({ success: false, message: "Invalid code. Please try again." });
    }

    // Success
    user.emailVerified = true;
    user.signupOtp = undefined;
    user.signupOtpExpires = undefined;
    user.signupOtpAttempts = 0;
    await user.save();

    return res.json({ success: true, message: "Verification successful." });
  } catch (e) {
    console.error("Verify OTP error", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.postResendOtp = async (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    return res
      .status(400)
      .json({ success: false, message: "Email is required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    if (user.emailVerified === true) {
      return res.json({ success: true, message: "Already verified" });
    }

    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = crypto.createHash("sha256").update(rawOtp).digest("hex");
    user.signupOtp = hashedOtp;
    user.signupOtpExpires = Date.now() + 1000 * 60 * 10;
    user.signupOtpAttempts = 0;
    await user.save();

    const { emailSent, previewUrl } = await sendEmail(
      email,
      "Your verification code",
      `Your verification code is ${rawOtp}. It expires in 10 minutes.`,
      `<p>Your verification code is <b>${rawOtp}</b>. It expires in 10 minutes.</p>`,
    );

    if (!emailSent) {
      console.log("Resent OTP for", email, "=", rawOtp);
    }

    return res.json({ success: true, previewUrl });
  } catch (e) {
    console.error("Resend OTP error", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Static page routes
const path = require("path");

exports.getIndex = (req, res) => {
  const staticPath = path.join(__dirname, "../public/all/index.html");
  return res.sendFile(staticPath);
};

exports.getContactUs = (req, res) => {
  const staticPath = path.join(__dirname, "../public/all/contactus.html");
  return res.sendFile(staticPath);
};

exports.getFeedback = (req, res) => {
  const staticPath = path.join(__dirname, "../public/all/feedback.html");
  return res.sendFile(staticPath);
};

exports.getFaq = (req, res) => {
  const staticPath = path.join(__dirname, "../public/all/faq.html");
  return res.sendFile(staticPath);
};

// Aliases for route compatibility
exports.forgotPassword = exports.postForgotPassword;
exports.validateResetToken = exports.getResetPassword;
exports.resetPassword = exports.postResetPassword;
exports.verifyOtp = exports.postVerifyOtp;
exports.resendOtp = exports.postResendOtp;

// Google Sign-In with Firebase
exports.googleSignIn = async (req, res) => {
  const { idToken, role } = req.body;

  if (!idToken) {
    return res.status(400).json({ success: false, message: "ID token is required" });
  }

  try {
    // Verify the Firebase ID token
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
    const { email, name, picture, uid } = decodedToken;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email not found in Google account" });
    }

    // Check if user exists
    let user = await User.findOne({ email });

    if (user) {
      // Existing user - log them in
      if (user.suspended) {
        return res.status(403).json({ success: false, message: "Account is suspended" });
      }

      // Update profile picture if not set
      if (!user.profilePicture && picture) {
        user.profilePicture = picture;
        await user.save();
      }

      // Create session
      req.session.user = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
      };

      // Determine redirect based on role
      const redirectMap = {
        customer: "/customer/index",
        seller: "/seller/dashboard",
        "service-provider": "/service/dashboardService",
        manager: "/manager/dashboard",
        admin: "/admin/dashboard",
      };

      return res.json({
        success: true,
        message: "Login successful",
        redirect: redirectMap[user.role] || "/",
        user: req.session.user,
      });
    } else {
      // New user - Google Sign-In is only for login, not signup
      return res.status(400).json({ 
        success: false, 
        message: "No account found with this email. Please sign up first using the registration form." 
      });
    }
  } catch (error) {
    console.error("Google Sign-In error:", error);
    
    if (error.code === "auth/id-token-expired") {
      return res.status(401).json({ success: false, message: "Token expired. Please try again." });
    }
    if (error.code === "auth/invalid-id-token") {
      return res.status(401).json({ success: false, message: "Invalid token. Please try again." });
    }
    
    return res.status(500).json({ success: false, message: "Google Sign-In failed. Please try again." });
  }
};
