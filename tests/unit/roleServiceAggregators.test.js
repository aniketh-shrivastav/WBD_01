describe("role service aggregators", () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test("adminService merges admin api and dashboard services", () => {
    jest.doMock("../../services/admin/apiService", () => ({
      getApiUsers: jest.fn(),
    }));
    jest.doMock("../../services/admin/dashboardService", () => ({
      getApiDashboard: jest.fn(),
    }));

    const service = require("../../services/adminService");
    expect(typeof service.getApiUsers).toBe("function");
    expect(typeof service.getApiDashboard).toBe("function");
  });

  test("managerService exposes dashboard, users and analytics features", () => {
    jest.doMock("../../services/manager/dashboardService", () => ({
      getApiDashboard: jest.fn(),
    }));
    jest.doMock("../../services/manager/usersService", () => ({
      suspendUser: jest.fn(),
    }));
    jest.doMock("../../services/manager/analyticsService", () => ({
      getUserAnalytics: jest.fn(),
    }));

    const service = require("../../services/managerService");
    expect(typeof service.getApiDashboard).toBe("function");
    expect(typeof service.suspendUser).toBe("function");
    expect(typeof service.getUserAnalytics).toBe("function");
  });

  test("sellerService exposes dashboard and product management features", () => {
    jest.doMock("../../services/seller/dashboardService", () => ({
      getDashboard: jest.fn(),
    }));
    jest.doMock("../../services/seller/productService", () => ({
      addProduct: jest.fn(),
    }));

    const service = require("../../services/sellerService");
    expect(typeof service.getDashboard).toBe("function");
    expect(typeof service.addProduct).toBe("function");
  });

  test("customerService exposes catalog, cart and booking features", () => {
    jest.doMock("../../services/customer/catalogService", () => ({
      getIndexPage: jest.fn(),
    }));
    jest.doMock("../../services/customer/cartService", () => ({
      updateCart: jest.fn(),
    }));
    jest.doMock("../../services/customer/bookingService", () => ({
      createBooking: jest.fn(),
    }));

    const service = require("../../services/customerService");
    expect(typeof service.getIndexPage).toBe("function");
    expect(typeof service.updateCart).toBe("function");
    expect(typeof service.createBooking).toBe("function");
  });

  test("serviceProviderService exposes dashboard and bookings", () => {
    jest.doMock("../../services/serviceProvider/dashboardService", () => ({
      getDashboardPage: jest.fn(),
    }));
    jest.doMock("../../services/serviceProvider/bookingService", () => ({
      getBookings: jest.fn(),
    }));

    const service = require("../../services/serviceProviderService");
    expect(typeof service.getDashboardPage).toBe("function");
    expect(typeof service.getBookings).toBe("function");
  });
});
