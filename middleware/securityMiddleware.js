/**
 * Security Middleware (Custom Middleware)
 *
 * These are CUSTOM MIDDLEWARE functions that handle:
 * - Rate limiting
 * - Security headers
 * - CSRF protection helpers
 * - XSS prevention
 *
 * Type: Custom Middleware
 */

/**
 * Simple in-memory rate limiter
 * For production, use redis-based solution
 */
const rateLimitStore = new Map();

/**
 * Rate Limiter Middleware Factory
 * @param {object} options - { windowMs, maxRequests, message }
 */
const rateLimit = (options = {}) => {
  const {
    windowMs = 60 * 1000, // 1 minute default
    maxRequests = 1,
    message = "Too many requests, please try again later.",
    keyGenerator = (req) =>
      req.ip || req.connection?.remoteAddress || "unknown",
  } = options;

  // Cleanup old entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of rateLimitStore.entries()) {
      if (now - data.windowStart > windowMs) {
        rateLimitStore.delete(key);
      }
    }
  }, windowMs);

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const windowStart = now - windowMs;

    let record = rateLimitStore.get(key);

    if (!record || record.windowStart < windowStart) {
      record = { windowStart: now, count: 0 };
    }

    record.count++;
    rateLimitStore.set(key, record);

    // Set rate limit headers
    res.set({
      "X-RateLimit-Limit": maxRequests,
      "X-RateLimit-Remaining": Math.max(0, maxRequests - record.count),
      "X-RateLimit-Reset": new Date(
        record.windowStart + windowMs,
      ).toISOString(),
    });

    if (record.count > maxRequests) {
      return res.status(429).json({
        success: false,
        message,
      });
    }

    next();
  };
};

/**
 * Security Headers Middleware
 * Adds common security headers to responses
 */
const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.set("X-Frame-Options", "SAMEORIGIN");

  // XSS Protection (legacy browsers)
  res.set("X-XSS-Protection", "1; mode=block");

  // Prevent MIME sniffing
  res.set("X-Content-Type-Options", "nosniff");

  // Referrer policy
  res.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Remove X-Powered-By header
  res.removeHeader("X-Powered-By");

  next();
};

/**
 * Content Security Policy Middleware (basic)
 */
const contentSecurityPolicy = (req, res, next) => {
  res.set(
    "Content-Security-Policy",
    "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: https: blob:; " +
      "connect-src 'self' ws: wss: https://res.cloudinary.com https://api.cloudinary.com",
  );
  next();
};

/**
 * Sanitize user input to prevent XSS
 * Basic HTML entity encoding
 */
const sanitizeInput = (fieldNames = []) => {
  return (req, res, next) => {
    const escapeHtml = (str) => {
      if (typeof str !== "string") return str;
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    fieldNames.forEach((field) => {
      if (req.body[field]) {
        req.body[field] = escapeHtml(req.body[field]);
      }
    });

    next();
  };
};

/**
 * Prevent NoSQL injection by checking for $ operators in input
 */
const preventNoSQLInjection = (req, res, next) => {
  const checkValue = (value) => {
    if (typeof value === "string" && value.includes("$")) {
      return true;
    }
    if (typeof value === "object" && value !== null) {
      return Object.keys(value).some((key) => key.startsWith("$"));
    }
    return false;
  };

  const hasSuspiciousInput =
    Object.values(req.body).some(checkValue) ||
    Object.values(req.query).some(checkValue);

  if (hasSuspiciousInput) {
    return res.status(400).json({
      success: false,
      message: "Invalid input detected",
    });
  }

  next();
};

module.exports = {
  rateLimit,
  securityHeaders,
  contentSecurityPolicy,
  sanitizeInput,
  preventNoSQLInjection,
};
