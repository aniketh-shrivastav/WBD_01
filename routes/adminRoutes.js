const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const managerController = require("../controllers/managerController");
const serviceCategoryController = require("../controllers/serviceCategoryController");
const productCategoryController = require("../controllers/productCategoryController");

const { isAuthenticated, isAdmin } = require("../middleware");

// Admin's own dashboard
router.get(
  "/api/dashboard",
  isAuthenticated,
  isAdmin,
  adminController.getDashboard,
);

// ── Read-only mirrors of manager data endpoints ──
router.get(
  "/api/manager-dashboard",
  isAuthenticated,
  isAdmin,
  managerController.getApiDashboard,
);
router.get(
  "/api/users",
  isAuthenticated,
  isAdmin,
  managerController.getApiUsers,
);
router.get(
  "/api/services",
  isAuthenticated,
  isAdmin,
  managerController.getApiServices,
);
router.get(
  "/api/orders",
  isAuthenticated,
  isAdmin,
  managerController.getApiOrders,
);
router.get(
  "/api/payments",
  isAuthenticated,
  isAdmin,
  managerController.getApiPayments,
);
router.get(
  "/api/support",
  isAuthenticated,
  isAdmin,
  managerController.getApiSupport,
);
router.get(
  "/api/profile-overview/:id",
  isAuthenticated,
  isAdmin,
  managerController.getProfileOverview,
);
router.get(
  "/api/user-analytics/:id",
  isAuthenticated,
  isAdmin,
  managerController.getUserAnalytics,
);
router.get(
  "/api/service-categories",
  isAuthenticated,
  isAdmin,
  serviceCategoryController.getCategories,
);
router.get(
  "/api/product-categories",
  isAuthenticated,
  isAdmin,
  productCategoryController.getCategories,
);

module.exports = router;
