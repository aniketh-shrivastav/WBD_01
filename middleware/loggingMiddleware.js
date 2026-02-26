/**
 * Logging Middleware (Custom Middleware)
 *
 * These are CUSTOM MIDDLEWARE functions that handle:
 * - Request logging
 * - Response time tracking
 * - Debug information
 *
 * Type: Custom Middleware (Application-level when used with app.use())
 */

const path = require("path");
const fs = require("fs");

// Log file configuration
const LOG_DIR = path.join(__dirname, "..", "logs");
const ERROR_LOG_DIR = path.join(LOG_DIR, "errors");
const ACCESS_LOG = path.join(LOG_DIR, "access.log");
const PERF_LOG = null;
const DEBUG_LOG = path.join(LOG_DIR, "debug.log");
const ERROR_LOG = path.join(ERROR_LOG_DIR, "error.log");
const LOG_ROTATION_MS = 20 * 1000;

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}
if (!fs.existsSync(ERROR_LOG_DIR)) {
  fs.mkdirSync(ERROR_LOG_DIR, { recursive: true });
}

/**
 * Helper function to append log to file
 * @param {string} filePath - Path to log file
 * @param {string} message - Log message
 */
function formatBucket(timestampMs) {
  const d = new Date(timestampMs);
  const pad = (v) => String(v).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
    d.getHours(),
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function resolveRotatedPath(filePath) {
  if (!filePath || !filePath.endsWith(".log")) return filePath;
  const dir = path.dirname(filePath);
  const base = path.basename(filePath, ".log");
  const bucketStart =
    Math.floor(Date.now() / LOG_ROTATION_MS) * LOG_ROTATION_MS;
  const suffix = formatBucket(bucketStart);
  return path.join(dir, `${base}-${suffix}.log`);
}

const appendLog = (filePath, message) => {
  if (!filePath) return;
  const targetPath = resolveRotatedPath(filePath);
  fs.appendFile(targetPath, message + "\n", (err) => {
    if (err) console.error("Failed to write log:", err);
  });
};

/**
 * Request Logger Middleware
 * Logs incoming requests with method, URL, and timestamp to access.log
 */
const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl || req.url;
  const ip = req.ip || req.connection?.remoteAddress || "unknown";

  const logMessage = `[${timestamp}] ${method} ${url} - IP: ${ip}`;
  appendLog(ACCESS_LOG, logMessage);
  next();
};

/**
 * Response Time Middleware
 * Tracks and logs response time to performance.log
 */
const responseTime = (req, res, next) => {
  const startTime = Date.now();

  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = Date.now() - startTime;
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${req.method} ${req.originalUrl || req.url} - ${duration}ms`;
    appendLog(PERF_LOG, logMessage);
    originalEnd.apply(res, args);
  };

  next();
};

/**
 * Debug Middleware (use only in development)
 * Logs detailed request information to debug.log
 */
const debugLogger = (req, res, next) => {
  if (process.env.NODE_ENV === "development") {
    const timestamp = new Date().toISOString();
    const debugInfo = [
      `--- DEBUG REQUEST [${timestamp}] ---`,
      `Headers: ${JSON.stringify(req.headers, null, 2)}`,
      `Body: ${JSON.stringify(req.body, null, 2)}`,
      `Query: ${JSON.stringify(req.query, null, 2)}`,
      `Params: ${JSON.stringify(req.params, null, 2)}`,
      `Session User: ${req.session?.user ? JSON.stringify(req.session.user) : "Not logged in"}`,
      "---------------------",
    ].join("\n");
    appendLog(DEBUG_LOG, debugInfo);
  }
  next();
};

/**
 * Error Logger - logs errors to error.log
 * @param {string} message - Error message
 * @param {Error} [error] - Optional error object
 */
const logError = (message, error = null) => {
  const timestamp = new Date().toISOString();
  let logMessage = `[${timestamp}] ${message}`;
  if (error && error.stack) {
    logMessage += `\n${error.stack}`;
  }
  appendLog(ERROR_LOG, logMessage);
};

/**
 * API Request Counter (for basic analytics)
 */
let requestCounts = {};
const apiAnalytics = (req, res, next) => {
  const route = `${req.method} ${req.route?.path || req.path}`;
  requestCounts[route] = (requestCounts[route] || 0) + 1;
  next();
};

/**
 * Get analytics data
 */
const getAnalytics = () => ({ ...requestCounts });

/**
 * Reset analytics data
 */
const resetAnalytics = () => {
  requestCounts = {};
};

let rotationTimer = null;
const startLogRotation = () => {
  if (rotationTimer) return rotationTimer;

  const writeHeartbeat = () => {
    const timestamp = new Date().toISOString();
    appendLog(ACCESS_LOG, `[${timestamp}] [HEARTBEAT] log rotation`);
  };

  writeHeartbeat();
  rotationTimer = setInterval(writeHeartbeat, LOG_ROTATION_MS);
  return rotationTimer;
};

module.exports = {
  LOG_DIR,
  ERROR_LOG_DIR,
  ACCESS_LOG,
  PERF_LOG,
  DEBUG_LOG,
  ERROR_LOG,
  LOG_ROTATION_MS,
  appendLog,
  logError,
  requestLogger,
  responseTime,
  debugLogger,
  apiAnalytics,
  getAnalytics,
  resetAnalytics,
  startLogRotation,
};
