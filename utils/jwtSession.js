const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "auth_token";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

function getJwtSecret() {
  return process.env.JWT_SECRET || "change-this-jwt-secret";
}

function getCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function createSessionId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return crypto.randomBytes(16).toString("hex");
}

function signAuthToken(user, sessionId) {
  const payload = {
    id: String(user.id || user._id),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    profilePicture: user.profilePicture,
    sid: sessionId || createSessionId(),
  };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

function verifyAuthToken(token) {
  return jwt.verify(token, getJwtSecret());
}

function issueAuthToken(res, user, sessionId) {
  const token = signAuthToken(user, sessionId);
  res.cookie(AUTH_COOKIE_NAME, token, getCookieOptions());
  return token;
}

function clearAuthToken(res) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

module.exports = {
  AUTH_COOKIE_NAME,
  createSessionId,
  signAuthToken,
  verifyAuthToken,
  issueAuthToken,
  clearAuthToken,
};
