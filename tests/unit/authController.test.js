jest.mock("../../models/User", () => ({
  findOne: jest.fn(),
  countDocuments: jest.fn(),
}));

jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({ sendMail: jest.fn() })),
  createTestAccount: jest.fn(),
  getTestMessageUrl: jest.fn(),
}));

jest.mock("../../config/firebaseAdmin", () => ({
  auth: () => ({ verifyIdToken: jest.fn() }),
}));

jest.mock("../../utils/jwtSession", () => ({
  clearAuthToken: jest.fn(),
  createSessionId: jest.fn(() => "sid-test"),
  issueAuthToken: jest.fn(() => "token-test"),
  signAuthToken: jest.fn(() => "token-sign-test"),
}));

const User = require("../../models/User");
const bcrypt = require("bcryptjs");
const authController = require("../../controllers/authController");
const { createMockReq, createMockRes } = require("../helpers/httpMocks");

describe("authController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findOne.mockReset();
    User.countDocuments.mockReset();
    bcrypt.compare.mockReset();
  });

  test("postSignup returns 400 for invalid json signup payload", async () => {
    const req = createMockReq({
      headers: { accept: "application/json", "content-type": "application/json" },
      body: {
        name: "John Doe",
        email: "john@invalid.org",
        password: "secret",
        role: "customer",
        phone: "1234567890",
      },
    });
    const res = createMockRes();

    await authController.postSignup(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({
      success: false,
      message: "Please enter a valid email ending in .com or .in",
    });
    expect(User.findOne).not.toHaveBeenCalled();
  });

  test("postLogin returns 401 when user is missing", async () => {
    User.findOne.mockResolvedValue(null);

    const req = createMockReq({
      headers: { accept: "application/json" },
      body: { email: "missing@example.com", password: "wrong" },
    });
    const res = createMockRes();

    await authController.postLogin(req, res);

    expect(User.findOne).toHaveBeenCalledWith({ email: "missing@example.com" });
    expect(res.statusCode).toBe(401);
    expect(res.payload).toEqual({ message: "Invalid credentials" });
  });

  test("postForgotPassword returns 400 when email is absent", async () => {
    const req = createMockReq({ body: {} });
    const res = createMockRes();

    await authController.postForgotPassword(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({ success: false, message: "Email required" });
  });
});
