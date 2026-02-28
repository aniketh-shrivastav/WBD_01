const express = require("express");
const router = express.Router();
const serviceProviderController = require("../controllers/serviceProviderController");

// Import centralized middleware
const { serviceOnly } = require("../middleware");

// Dashboard routes
router.get(
  "/dashboardService",
  serviceOnly,
  serviceProviderController.getDashboardService,
);
router.get(
  "/api/dashboard",
  serviceOnly,
  serviceProviderController.getApiDashboard,
);

// Profile Settings route
router.get(
  "/profileSettings",
  serviceOnly,
  serviceProviderController.getProfileSettings,
);

// Booking Management routes
router.get(
  "/bookingManagement",
  serviceOnly,
  serviceProviderController.getBookingManagement,
);
router.post(
  "/updateBookingStatus",
  serviceOnly,
  serviceProviderController.updateBookingStatus,
);
router.post(
  "/updateMultipleBookingStatus",
  serviceOnly,
  serviceProviderController.updateMultipleBookingStatus,
);

// Earnings routes
router.get("/earnings", serviceOnly, serviceProviderController.getEarnings);
router.get(
  "/api/earnings-data",
  serviceOnly,
  serviceProviderController.getApiEarningsData,
);

// Customer Communication route
router.get(
  "/customerCommunication",
  serviceOnly,
  serviceProviderController.getCustomerCommunication,
);

// Reviews routes
router.get("/reviews", serviceOnly, serviceProviderController.getReviews);
router.get(
  "/api/reviews",
  serviceOnly,
  serviceProviderController.getApiReviews,
);

// Profile delete route
router.delete("/profile/delete/:id", serviceProviderController.deleteProfile);

// Update booking routes
router.put(
  "/updateBooking",
  serviceOnly,
  serviceProviderController.updateBooking,
);
router.post(
  "/updateCost/:id",
  serviceOnly,
  serviceProviderController.updateCost,
);

// Rating submission route
router.post("/submit-rating/:id", serviceProviderController.submitRating);

// API routes for profile and activity
router.get(
  "/api/profile",
  serviceOnly,
  serviceProviderController.getApiProfile,
);
router.get(
  "/api/recent-activity",
  serviceOnly,
  serviceProviderController.getApiRecentActivity,
);
router.get(
  "/api/bookings",
  serviceOnly,
  serviceProviderController.getApiBookings,
);

// Product cost update for bookings
router.post(
  "/api/update-product-cost",
  serviceOnly,
  serviceProviderController.updateProductCost,
);

module.exports = router;
