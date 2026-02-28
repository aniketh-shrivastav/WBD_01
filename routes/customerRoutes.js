const express = require("express");
const router = express.Router();
const customerController = require("../controllers/customerController");
const orderController = require("../controllers/orderController");
const pdfController = require("../controllers/pdfRoutes");

// Import centralized middleware
const { customerOnly, uploadImageToDisk } = require("../middleware");

// Use centralized upload middleware (alias for backward compatibility)
const upload = uploadImageToDisk;

// Index routes
router.get("/index", customerOnly, customerController.getIndex);
router.get("/api/index", customerOnly, customerController.getApiIndex);
router.get("/index.html", customerOnly, customerController.getIndexHtml);

// Booking routes
router.get("/booking", customerOnly, customerController.getBooking);
router.get("/booking.html", customerOnly, customerController.getBookingHtml);
router.get("/api/booking", customerOnly, customerController.getApiBooking);
router.get(
  "/api/provider/:id/reviews",
  customerOnly,
  customerController.getProviderReviews,
);

// Cart routes
router.get("/cart", customerOnly, customerController.getCart);
router.get("/cart.html", customerOnly, customerController.getCartHtml);
router.get("/api/cart", customerOnly, customerController.getApiCart);
router.post("/create-order", customerOnly, orderController.createOrderFromCart);
router.post("/cart/add", customerOnly, customerController.addToCart);

// History routes
router.get("/history", customerOnly, customerController.getHistory);
router.get("/api/order/:id", customerOnly, customerController.getOrderDetails);
router.get(
  "/api/service/:id",
  customerOnly,
  customerController.getServiceDetails,
);
router.get("/history.html", customerOnly, customerController.getHistoryHtml);
router.get("/api/history", customerOnly, customerController.getApiHistory);

// Receipt routes (using pdfController)
router.get("/order-receipt/:id", customerOnly, pdfController.getOrderReceipt);
router.get(
  "/service-receipt/:id",
  customerOnly,
  pdfController.getServiceReceipt,
);

// Order/Service cancellation
router.post("/cancel-order/:id", customerOnly, customerController.cancelOrder);
router.post(
  "/cancel-service/:id",
  customerOnly,
  customerController.cancelService,
);

// Payment page
router.get("/payment", customerOnly, customerController.getPayment);

// Profile routes
router.get("/profile", customerOnly, customerController.getProfile);
router.get("/profile.html", customerOnly, customerController.getProfileHtml);
router.get("/api/profile", customerOnly, customerController.getApiProfile);
router.post(
  "/profile",
  customerOnly,
  upload.fields([
    { name: "profilePicture", maxCount: 1 },
    { name: "rcBook", maxCount: 1 },
    { name: "insuranceCopy", maxCount: 1 },
    { name: "vehiclePhotos", maxCount: 5 },
  ]),
  customerController.updateProfile,
);
router.delete(
  "/delete-vehicle-photo",
  customerOnly,
  customerController.deleteVehiclePhoto,
);
router.delete(
  "/delete-profile",
  customerOnly,
  customerController.deleteProfile,
);

// Product details and reviews
router.get("/product/:id", customerOnly, customerController.getProductDetails);
router.post(
  "/product/:id/review",
  customerOnly,
  customerController.submitProductReview,
);
router.post("/rate-service/:id", customerOnly, customerController.rateService);

// Misc pages
router.get("/purchase", customerOnly, customerController.getPurchase);
router.get("/reviews", customerOnly, customerController.getReviews);
router.get("/search", customerOnly, customerController.getSearch);
router.get("/service", customerOnly, customerController.getService);

module.exports = router;
