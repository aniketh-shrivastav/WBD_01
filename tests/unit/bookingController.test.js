jest.mock("../../models/serviceBooking", () => {
  return jest.fn().mockImplementation((doc) => ({
    ...doc,
    _id: "booking-1",
    save: jest.fn().mockResolvedValue(),
  }));
});

jest.mock("../../models/User", () => ({
  findById: jest.fn(),
}));

jest.mock("../../controllers/notificationController", () => ({
  createNotification: jest.fn(),
}));

const ServiceBooking = require("../../models/serviceBooking");
const User = require("../../models/User");
const bookingController = require("../../controllers/bookingController");
const { createNotification } = require("../../controllers/notificationController");
const { createMockReq, createMockRes } = require("../helpers/httpMocks");

function buildProvider(overrides = {}) {
  return {
    _id: "provider-1",
    name: "Provider X",
    workshopName: "Workshop X",
    servicesOffered: [
      { name: "Wash", cost: 300 },
      { name: "Polish", cost: 700 },
      { name: "Car Painting", cost: 1500 },
    ],
    pickupRate: 100,
    dropoffRate: 80,
    paintColors: ["#112233", "#445566"],
    ...overrides,
  };
}

describe("bookingController.createBooking", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns 400 for invalid provider", async () => {
    User.findById.mockResolvedValue(null);

    const req = createMockReq({
      user: { id: "customer-1" },
      body: {
        providerId: "provider-1",
        selectedServices: ["Wash"],
      },
    });
    const res = createMockRes();

    await bookingController.createBooking(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({ error: "Invalid service provider" });
  });

  test("creates booking and computes total with pickup/dropoff", async () => {
    User.findById.mockResolvedValue(
      buildProvider({
        servicesOffered: [
          { name: "Wash", cost: 300 },
          { name: "Polish", cost: 700 },
        ],
      }),
    );

    const req = createMockReq({
      user: { id: "customer-1" },
      app: { get: () => null },
      body: {
        providerId: "provider-1",
        selectedServices: ["Wash", "Polish"],
        needsPickup: true,
        needsDropoff: true,
      },
    });
    const res = createMockRes();

    await bookingController.createBooking(req, res);

    expect(ServiceBooking).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.payload.message).toBe("Booking created successfully");
    expect(res.payload.booking.totalCost).toBe(1180);
    expect(res.payload.booking.pickupCost).toBe(100);
    expect(res.payload.booking.dropoffCost).toBe(80);
  });

  test("returns 400 when car painting selected but provider has no configured colors", async () => {
    User.findById.mockResolvedValue(buildProvider({ paintColors: [] }));

    const req = createMockReq({
      user: { id: "customer-1" },
      body: {
        providerId: "provider-1",
        selectedServices: ["Car Painting"],
        paintColor: "#112233",
      },
    });
    const res = createMockRes();

    await bookingController.createBooking(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload.error).toMatch(/hasn't configured paint colors/i);
    expect(ServiceBooking).not.toHaveBeenCalled();
  });

  test("returns 400 when car painting selected but paint color is missing", async () => {
    User.findById.mockResolvedValue(buildProvider());

    const req = createMockReq({
      user: { id: "customer-1" },
      body: {
        providerId: "provider-1",
        selectedServices: ["Car Painting"],
      },
    });
    const res = createMockRes();

    await bookingController.createBooking(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({
      error: "Please select a paint color for Car Paint/Painting.",
    });
    expect(ServiceBooking).not.toHaveBeenCalled();
  });

  test("returns 400 when selected paint color is not offered", async () => {
    User.findById.mockResolvedValue(buildProvider());

    const req = createMockReq({
      user: { id: "customer-1" },
      body: {
        providerId: "provider-1",
        selectedServices: ["Car Painting"],
        paintColor: "#aabbcc",
      },
    });
    const res = createMockRes();

    await bookingController.createBooking(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({
      error: "Selected paint color is not offered by this provider.",
    });
    expect(ServiceBooking).not.toHaveBeenCalled();
  });

  test("normalizes valid paint color and allows booking when car painting is selected", async () => {
    User.findById.mockResolvedValue(buildProvider());

    const req = createMockReq({
      user: { id: "customer-1" },
      body: {
        providerId: "provider-1",
        selectedServices: ["Car Painting"],
        paintColor: "  #445566  ",
      },
    });
    const res = createMockRes();

    await bookingController.createBooking(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.booking.paintColor).toBe("#445566");
    expect(res.payload.booking.totalCost).toBe(1500);
  });

  test("still returns success if notification creation fails", async () => {
    User.findById.mockResolvedValue(buildProvider());
    createNotification.mockRejectedValueOnce(new Error("notify failed"));

    const req = createMockReq({
      user: { id: "customer-1" },
      app: { get: () => ({ emit: jest.fn() }) },
      body: {
        providerId: "provider-1",
        selectedServices: ["Wash"],
      },
    });
    const res = createMockRes();

    await bookingController.createBooking(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.message).toBe("Booking created successfully");
  });

  test("returns 500 when provider lookup throws", async () => {
    User.findById.mockRejectedValue(new Error("db failure"));

    const req = createMockReq({
      user: { id: "customer-1" },
      body: {
        providerId: "provider-1",
        selectedServices: ["Wash"],
      },
    });
    const res = createMockRes();

    await bookingController.createBooking(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.payload).toEqual({ error: "Failed to create booking" });
  });

  test("maps numeric vehicle fields and wraps single vehicle photo string into array", async () => {
    User.findById.mockResolvedValue(buildProvider({ workshopName: "" }));

    const req = createMockReq({
      user: { id: "customer-1" },
      body: {
        providerId: "provider-1",
        selectedServices: ["Wash"],
        yearOfManufacture: "2020",
        currentMileage: "45678",
        vehiclePhotos: "https://img.example/1.jpg",
      },
    });
    const res = createMockRes();

    await bookingController.createBooking(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.booking.yearOfManufacture).toBe(2020);
    expect(res.payload.booking.currentMileage).toBe(45678);
    expect(res.payload.booking.vehiclePhotos).toEqual([
      "https://img.example/1.jpg",
    ]);
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("with Provider X has been created"),
      }),
      null,
    );
  });

  test("keeps vehicle photos as array when array is provided", async () => {
    User.findById.mockResolvedValue(buildProvider());

    const req = createMockReq({
      user: { id: "customer-1" },
      body: {
        providerId: "provider-1",
        selectedServices: ["Wash"],
        vehiclePhotos: ["https://img.example/1.jpg", "https://img.example/2.jpg"],
      },
    });
    const res = createMockRes();

    await bookingController.createBooking(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.payload.booking.vehiclePhotos).toEqual([
      "https://img.example/1.jpg",
      "https://img.example/2.jpg",
    ]);
  });
});
