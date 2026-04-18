const {
  apiAnalytics,
  getAnalytics,
  resetAnalytics,
  responseTime,
} = require("../../middleware/loggingMiddleware");

describe("loggingMiddleware", () => {
  beforeEach(() => {
    resetAnalytics();
  });

  test("apiAnalytics counts requests by method and path", () => {
    const next = jest.fn();

    apiAnalytics(
      { method: "GET", route: { path: "/orders" }, path: "/orders" },
      {},
      next,
    );
    apiAnalytics(
      { method: "GET", route: { path: "/orders" }, path: "/orders" },
      {},
      next,
    );
    apiAnalytics(
      { method: "POST", route: { path: "/orders" }, path: "/orders" },
      {},
      next,
    );

    const analytics = getAnalytics();
    expect(analytics["GET /orders"]).toBe(2);
    expect(analytics["POST /orders"]).toBe(1);
    expect(next).toHaveBeenCalledTimes(3);
  });

  test("responseTime wraps res.end and still calls original end", () => {
    const req = { method: "GET", originalUrl: "/health" };
    const originalEnd = jest.fn();
    const res = { end: originalEnd };
    const next = jest.fn();

    responseTime(req, res, next);
    res.end("ok");

    expect(next).toHaveBeenCalledTimes(1);
    expect(originalEnd).toHaveBeenCalledWith("ok");
  });
});
