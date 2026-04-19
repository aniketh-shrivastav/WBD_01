const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function setupProxy(app) {
  const target = process.env.REACT_APP_PROXY_TARGET || "https://wbd-01.up.railway.app";
  const proxy = createProxyMiddleware({
    target,
    changeOrigin: true,
    ws: true,
  });

  const postOnlyAuthPaths = [
    "/signup",
    "/login",
    "/logout",
    "/forgot-password",
    "/reset-password",
    "/verify-otp",
    "/resend-otp",
  ];

  const alwaysProxyPrefixes = [
    "/api",
    "/auth",
    "/chat",
    "/socket.io",
    "/admin",
    "/manager",
    "/customer",
    "/seller",
    "/service",
    "/bookings",
  ];

  function matchesPrefix(pathname, prefix) {
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  }

  // Keep SPA routes like GET /signup and GET /login on the React app,
  // but proxy non-GET auth actions to the backend.
  app.use((req, res, next) => {
    const isAlwaysProxyPath = alwaysProxyPrefixes.some((p) =>
      matchesPrefix(req.path, p),
    );
    const isPostOnlyAuthPath =
      req.method !== "GET" &&
      postOnlyAuthPaths.some((p) => matchesPrefix(req.path, p));

    if (isAlwaysProxyPath || isPostOnlyAuthPath) {
      return proxy(req, res, next);
    }

    return next();
  });
};
