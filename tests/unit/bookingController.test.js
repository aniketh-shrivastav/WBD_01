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
const { createMockReq, createMockRes } = require("../helpers/httpMocks");

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
    User.findById.mockResolvedValue({
      _id: "provider-1",
      name: "Provider X",
      workshopName: "Workshop X",
      servicesOffered: [
        { name: "Wash", cost: 300 },
        { name: "Polish", cost: 700 },
      ],
      pickupRate: 100,
      dropoffRate: 80,
      paintColors: ["#112233"],
    });

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
});
