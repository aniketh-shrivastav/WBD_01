/**
 * Error Handling Middleware (Error-handling Middleware)
 *
 * These middleware functions handle errors in the application.
 * Error-handling middleware MUST have exactly 4 parameters: (err, req, res, next)
 *
 * Type: Error-handling Middleware
 */

const { logError } = require("./loggingMiddleware");

/**
 * Helper to detect JSON requests
 */
function wantsJson(req) {
  const accept = String(req.headers?.accept || "");
  return (
    accept.includes("application/json") ||
    req.xhr ||
    String(req.path || "").startsWith("/api") ||
    String(req.originalUrl || "").includes("/api/")
  );
}

/**
 * 404 Not Found Handler
 * Creates a 404 error for unmatched routes
 * Note: This is technically regular middleware, not error-handling
 */
function notFound(req, res, next) {
  const err = new Error(`Not Found - ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const statusCode = Number(err.statusCode || err.status || 500);
  const message = err.message || "Internal Server Error";

  // Log full error to error.log file
  const errorDetails = `[${req.method}] ${req.originalUrl} - Status: ${statusCode} - ${message}`;
  logError(errorDetails, err);

  const isJson = wantsJson(req);
  if (isJson) {
    return res.status(statusCode).json({
      success: false,
      error: message,
      ...(process.env.NODE_ENV === "production" ? {} : { stack: err.stack }),
    });
  }

  // HTML fallback (avoid dependency on a dedicated error.ejs)
  res.status(statusCode).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Error</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial; padding:24px; color:#111;}
    .box{max-width:760px; margin:0 auto; border:1px solid #e5e7eb; border-radius:12px; padding:18px; background:#fff;}
    h1{margin:0 0 8px; font-size:20px;}
    p{margin:6px 0; color:#444;}
    code{background:#f3f4f6; padding:2px 6px; border-radius:6px;}
    a{color:#2563eb; text-decoration:none;}
  </style>
</head>
<body>
  <div class="box">
    <h1>Something went wrong</h1>
    <p><strong>Status:</strong> <code>${statusCode}</code></p>
    <p><strong>Message:</strong> ${escapeHtml(message)}</p>
    <p><a href="/">Go home</a></p>
  </div>
</body>
</html>`);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

module.exports = { notFound, errorHandler };
