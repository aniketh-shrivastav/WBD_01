jest.mock("../../models/Cart", () => ({
  findOne: jest.fn(),
}));

jest.mock("../../models/Product", () => ({
  findById: jest.fn(),
}));

const Cart = require("../../models/Cart");
const Product = require("../../models/Product");
const cartController = require("../../controllers/cartController");
const { createMockReq, createMockRes } = require("../helpers/httpMocks");

describe("cartController.updateCart", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns 404 when cart is missing", async () => {
    Cart.findOne.mockResolvedValue(null);

    const req = createMockReq({
      params: { userId: "u1" },
      body: { productId: "p1", action: "increase" },
      headers: { accept: "application/json" },
    });
    const res = createMockRes();

    await cartController.updateCart(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.payload).toEqual({ success: false, message: "Cart not found" });
  });

  test("returns 400 for invalid cart action", async () => {
    const save = jest.fn();
    Cart.findOne.mockResolvedValue({
      items: [{ productId: "p1", quantity: 1 }],
      save,
    });
    Product.findById.mockResolvedValue({ _id: "p1", quantity: 10 });

    const req = createMockReq({
      params: { userId: "u1" },
      body: { productId: "p1", action: "noop" },
      headers: { accept: "application/json" },
    });
    const res = createMockRes();

    await cartController.updateCart(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({ success: false, message: "Invalid action" });
    expect(save).not.toHaveBeenCalled();
  });

  test("blocks quantity increase when stock is insufficient", async () => {
    const save = jest.fn();
    Cart.findOne.mockResolvedValue({
      items: [{ productId: "p1", quantity: 2 }],
      save,
    });
    Product.findById.mockResolvedValue({ _id: "p1", quantity: 2 });

    const req = createMockReq({
      params: { userId: "u1" },
      body: { productId: "p1", action: "increase" },
      headers: { accept: "application/json" },
    });
    const res = createMockRes();

    await cartController.updateCart(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({
      success: false,
      message: "Not enough stock available",
    });
    expect(save).not.toHaveBeenCalled();
  });
});
