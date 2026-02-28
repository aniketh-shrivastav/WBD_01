const express = require("express");
const router = express.Router();
const managerController = require("../controllers/managerController");

// Import centralized middleware
const { isAuthenticated, isManager } = require("../middleware");

// Static HTML page routes
router.get("/dashboard.html", isAuthenticated, isManager, managerController.getDashboardHtml);
router.get("/users.html", isAuthenticated, isManager, managerController.getUsersHtml);
router.get("/services.html", isAuthenticated, isManager, managerController.getServicesHtml);
router.get("/payments.html", isAuthenticated, isManager, managerController.getPaymentsHtml);
router.get("/support.html", isAuthenticated, isManager, managerController.getSupportHtml);

// API routes
router.get("/api/users", isAuthenticated, isManager, managerController.getApiUsers);
router.get("/api/services", isAuthenticated, isManager, managerController.getApiServices);
router.get("/api/orders", isAuthenticated, isManager, managerController.getApiOrders);
router.get("/api/payments", isAuthenticated, isManager, managerController.getApiPayments);
router.get("/api/support", isAuthenticated, isManager, managerController.getApiSupport);
router.get("/api/dashboard", isAuthenticated, isManager, managerController.getApiDashboard);
router.get("/api/dashboard/report", isAuthenticated, isManager, managerController.getApiDashboardReport);

// Main page routes
router.get("/dashboard", isAuthenticated, isManager, managerController.getDashboard);
router.get("/orders", isAuthenticated, isManager, managerController.getOrders);
router.get("/payments", isAuthenticated, isManager, managerController.getPayments);
router.get("/services", isAuthenticated, isManager, managerController.getServices);
router.get("/users", isAuthenticated, isManager, managerController.getUsers);

// Profile routes
router.get("/profile-data/:id", managerController.getProfileData);
router.get("/api/profile-overview/:id", isAuthenticated, isManager, managerController.getProfileOverview);

// User management routes
router.post("/users/suspend/:id", isAuthenticated, isManager, managerController.suspendUser);
router.post("/users/restore/:id", isAuthenticated, isManager, managerController.restoreUser);
router.post("/users/create-manager", isAuthenticated, isManager, managerController.createManager);

// Booking management routes
router.post("/cancel-booking/:id", isAuthenticated, isManager, managerController.cancelBooking);
router.post("/restore-booking/:id", isAuthenticated, isManager, managerController.restoreBooking);

// Product management routes
router.post("/products/:id/approve", isAuthenticated, isManager, managerController.approveProduct);
router.post("/products/:id/reject", isAuthenticated, isManager, managerController.rejectProduct);
router.put("/products/:id/edit", isAuthenticated, isManager, managerController.editProduct);
router.get("/products/:id", isAuthenticated, isManager, managerController.getProduct);

// Order management routes
router.post("/cancel-order/:orderId", isAuthenticated, isManager, managerController.cancelOrder);
router.post("/restore-order/:orderId", isAuthenticated, isManager, managerController.restoreOrder);

module.exports = router;