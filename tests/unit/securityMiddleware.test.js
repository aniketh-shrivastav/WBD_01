const {
  rateLimit,
  securityHeaders,
  contentSecurityPolicy,
  sanitizeInput,
  preventNoSQLInjection,
} = require("../../middleware/securityMiddleware");

const createMockRes = () => {
  const headers = {};
  return {
    headers,
    statusCode: 200,
    body: null,
    set: jest.fn((key, value) => {
      if (typeof key === "object") {
        Object.assign(headers, key);
      } else {
        headers[key] = value;
      }
      return this;
    }),
    removeHeader: jest.fn((key) => {
      delete headers[key];
    }),
    status: jest.fn(function status(code) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn(function json(payload) {
      this.body = payload;
      return this;
    }),
  };
};

describe("securityMiddleware", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test("rateLimit allows request under limit and blocks over limit", () => {
    const middleware = rateLimit({
      windowMs: 1000,
      maxRequests: 1,
      keyGenerator: () => "same-client",
    });

    const req = { ip: "127.0.0.1", connection: {}, body: {}, query: {} };
    const next = jest.fn();

    const res1 = createMockRes();
    middleware(req, res1, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res1.headers["X-RateLimit-Limit"]).toBe(1);
    expect(res1.headers["X-RateLimit-Remaining"]).toBe(0);

    const res2 = createMockRes();
    middleware(req, res2, next);

    expect(res2.status).toHaveBeenCalledWith(429);
    expect(res2.body).toEqual({
      success: false,
      message: "Too many requests, please try again later.",
    });
  });

  test("securityHeaders sets expected headers", () => {
    const req = {};
    const res = createMockRes();
    const next = jest.fn();

    securityHeaders(req, res, next);

    expect(res.headers["X-Frame-Options"]).toBe("SAMEORIGIN");
    expect(res.headers["X-XSS-Protection"]).toBe("1; mode=block");
    expect(res.headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(res.headers["Referrer-Policy"]).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(res.removeHeader).toHaveBeenCalledWith("X-Powered-By");
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("contentSecurityPolicy sets CSP header", () => {
    const req = {};
    const res = createMockRes();
    const next = jest.fn();

    contentSecurityPolicy(req, res, next);

    expect(res.headers["Content-Security-Policy"]).toContain(
      "default-src 'self'",
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("sanitizeInput escapes configured fields only", () => {
    const middleware = sanitizeInput(["comment"]);
    const req = {
      body: {
        comment: "<script>alert('xss')</script>",
        untouched: "<b>allowed</b>",
      },
    };
    const res = createMockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(req.body.comment).toBe(
      "&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;",
    );
    expect(req.body.untouched).toBe("<b>allowed</b>");
    expect(next).toHaveBeenCalledTimes(1);
  });

  test("preventNoSQLInjection blocks suspicious payloads", () => {
    const req = {
      body: { filter: { $ne: "" } },
      query: {},
    };
    const res = createMockRes();
    const next = jest.fn();

    preventNoSQLInjection(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toEqual({
      success: false,
      message: "Invalid input detected",
    });
    expect(next).not.toHaveBeenCalled();
  });

  test("preventNoSQLInjection allows safe payloads", () => {
    const req = {
      body: { search: "engine oil" },
      query: { page: "1" },
    };
    const res = createMockRes();
    const next = jest.fn();

    preventNoSQLInjection(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
