function routeSignatures(router) {
  return router.stack
    .filter((layer) => layer.route)
    .flatMap((layer) => {
      const methods = Object.keys(layer.route.methods || {})
        .filter((m) => layer.route.methods[m])
        .map((m) => m.toUpperCase());
      return methods.map((method) => `${method} ${layer.route.path}`);
    });
}

describe("route wiring", () => {
  test("authRoutes exposes auth and password-reset endpoints", () => {
    const router = require("../../routes/authRoutes");
    const signatures = routeSignatures(router);

    expect(signatures).toContain("POST /signup");
    expect(signatures).toContain("POST /login");
    expect(signatures).toContain("GET /logout");
    expect(signatures).toContain("POST /forgot-password");
    expect(signatures).toContain("POST /reset-password/:token");
    expect(signatures).toContain("POST /verify-otp");
  });

  test("cartRoutes has update/remove/place-order endpoints", () => {
    const router = require("../../routes/cartRoutes");
    const signatures = routeSignatures(router);

    expect(signatures).toContain("GET /:userId");
    expect(signatures).toContain("DELETE /remove/:userId");
    expect(signatures).toContain("POST /place-order/:userId");
    expect(signatures).toContain("PUT /update/:userId");
  });

  test("bookingRoutes protects create-booking route", () => {
    const router = require("../../routes/bookingRoutes");
    const layer = router.stack.find(
      (stackLayer) =>
        stackLayer.route && stackLayer.route.path === "/create-booking",
    );

    expect(layer).toBeTruthy();
    expect(layer.route.stack.length).toBeGreaterThan(1);
  });

  test("managerRoutes includes protected dashboard and API endpoints", () => {
    const router = require("../../routes/managerRoutes");
    const signatures = routeSignatures(router);

    expect(signatures).toContain("GET /dashboard");
    expect(signatures).toContain("GET /api/dashboard");
    expect(signatures).toContain("GET /api/users");
    expect(signatures).toContain("POST /users/suspend/:id");
    expect(signatures).toContain("POST /verify-provider/:id");
  });
});
