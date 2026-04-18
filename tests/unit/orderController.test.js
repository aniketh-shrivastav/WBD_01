jest.mock("../../models/Cart", () => ({
  findOne: jest.fn(),
  deleteOne: jest.fn(),
}));

jest.mock("../../models/Product", () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));

jest.mock("../../models/Orders", () => jest.fn());

jest.mock("../../models/CustomerProfile", () => ({
  findOne: jest.fn(() => ({ lean: jest.fn().mockResolvedValue(null) })),
}));

jest.mock("../../models/User", () => ({
  findById: jest.fn(() => ({ lean: jest.fn().mockResolvedValue(null) })),
}));

jest.mock("../../controllers/notificationController", () => ({
  createNotification: jest.fn(),
}));

jest.mock("../../utils/deliveryAddressUtils", () => ({
  buildAddressFromLegacy: jest.fn(() => ({
    addressLine1: "Street 1",
    city: "Chennai",
    state: "TN",
    postalCode: "600001",
    country: "India",
  })),
  formatDeliveryAddress: jest.fn(() => "Street 1, Chennai"),
  validateDeliveryAddress: jest.fn(() => ({
    isValid: true,
    value: {
      addressLine1: "Street 1",
      city: "Chennai",
      state: "TN",
      postalCode: "600001",
      country: "India",
    },
    errors: [],
  })),
}));

jest.mock("../../utils/orderIdUtils", () => ({
  getDisplayOrderId: jest.fn(() => "ORD-001"),
}));

const Cart = require("../../models/Cart");
const Product = require("../../models/Product");
const orderController = require("../../controllers/orderController");
const { createMockReq, createMockRes } = require("../helpers/httpMocks");

describe("orderController.createOrderFromCart", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns 400 when cart is empty", async () => {
    Cart.findOne.mockResolvedValue({ items: [] });

    const req = createMockReq({
      session: { user: { id: "u1" } },
      body: {},
    });
    const res = createMockRes();

    await orderController.createOrderFromCart(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.success).toBe(false);
    expect(res.payload.message).toContain("Cart is empty");
  });

  test("returns 404 when any product is missing", async () => {
    Cart.findOne.mockResolvedValue({
      items: [{ productId: "p1", quantity: 1 }],
    });
    Product.findById.mockResolvedValue(null);

    const req = createMockReq({
      session: { user: { id: "u1" } },
      body: {},
    });
    const res = createMockRes();

    await orderController.createOrderFromCart(req, res);

    expect(Product.findById).toHaveBeenCalledWith("p1");
    expect(res.statusCode).toBe(404);
    expect(res.payload).toEqual({
      success: false,
      message: "Product p1 not found.",
    });
  });
});
