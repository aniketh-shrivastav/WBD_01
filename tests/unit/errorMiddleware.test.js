jest.mock("../../middleware/loggingMiddleware", () => ({
  logError: jest.fn(),
}));

const { logError } = require("../../middleware/loggingMiddleware");
const { notFound, errorHandler } = require("../../middleware/errorMiddleware");

const createMockRes = () => ({
  headersSent: false,
  statusCode: 200,
  jsonBody: null,
  htmlBody: null,
  status: jest.fn(function status(code) {
    this.statusCode = code;
    return this;
  }),
  json: jest.fn(function json(payload) {
    this.jsonBody = payload;
    return this;
  }),
  send: jest.fn(function send(payload) {
    this.htmlBody = payload;
    return this;
  }),
});

describe("errorMiddleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.NODE_ENV;
  });

  test("notFound forwards 404 error", () => {
    const req = { originalUrl: "/missing" };
    const next = jest.fn();

    notFound(req, {}, next);

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(404);
    expect(err.message).toContain("/missing");
  });

  test("errorHandler returns JSON for API path", () => {
    const err = new Error("Boom");
    err.statusCode = 400;
    const req = {
      method: "GET",
      originalUrl: "/api/test",
      path: "/api/test",
      headers: { accept: "application/json" },
      xhr: false,
    };
    const res = createMockRes();
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.jsonBody.success).toBe(false);
    expect(res.jsonBody.error).toBe("Boom");
    expect(res.jsonBody.stack).toContain("Error: Boom");
    expect(logError).toHaveBeenCalledTimes(1);
  });

  test("errorHandler omits stack in production", () => {
    process.env.NODE_ENV = "production";

    const err = new Error("Boom");
    const req = {
      method: "GET",
      originalUrl: "/api/test",
      path: "/api/test",
      headers: { accept: "application/json" },
      xhr: false,
    };
    const res = createMockRes();

    errorHandler(err, req, res, jest.fn());

    expect(res.jsonBody.stack).toBeUndefined();
  });

  test("errorHandler returns HTML for non-API request", () => {
    const err = new Error("<b>Unsafe</b>");
    err.status = 500;
    const req = {
      method: "GET",
      originalUrl: "/page",
      path: "/page",
      headers: { accept: "text/html" },
      xhr: false,
    };
    const res = createMockRes();

    errorHandler(err, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.htmlBody).toContain("Something went wrong");
    expect(res.htmlBody).toContain("&lt;b&gt;Unsafe&lt;/b&gt;");
  });

  test("errorHandler forwards when headers are already sent", () => {
    const err = new Error("late error");
    const req = {
      method: "GET",
      originalUrl: "/api/test",
      path: "/api/test",
      headers: { accept: "application/json" },
      xhr: false,
    };
    const res = createMockRes();
    res.headersSent = true;
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
  });
});
