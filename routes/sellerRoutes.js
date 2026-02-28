// routes/sellerRoutes.js
const express = require("express");
const router = express.Router();
const sellerController = require("../controllers/sellerController");

// Import centralized middleware
const {
  isAuthenticated,
  isSeller,
  uploadImageToMemory,
  uploadImageToDisk,
  uploadDocumentToDisk,
  uploadVerificationDoc,
  handleUploadError,
} = require("../middleware");

// Aliases for backward compatibility
const memoryUpload = uploadImageToMemory;
const upload = uploadDocumentToDisk;

// Dashboard routes
router.get(
  "/api/dashboard",
  isAuthenticated,
  isSeller,
  sellerController.getDashboardApi,
);
router.get(
  "/dashboard",
  isAuthenticated,
  isSeller,
  sellerController.getDashboard,
);

// Profile Settings routes
router.get(
  "/profileSettings",
  isAuthenticated,
  isSeller,
  sellerController.getProfileSettings,
);
router.post(
  "/profileSettings",
  isAuthenticated,
  isSeller,
  uploadImageToDisk.single("profilePicture"),
  handleUploadError,
  sellerController.postProfileSettings,
);
router.get(
  "/api/profileSettings",
  isAuthenticated,
  isSeller,
  sellerController.getApiProfileSettings,
);
router.post(
  "/api/profileSettings",
  isAuthenticated,
  isSeller,
  uploadImageToDisk.single("profilePicture"),
  handleUploadError,
  sellerController.postApiProfileSettings,
);

// Orders routes
router.get("/orders", isAuthenticated, isSeller, sellerController.getOrders);
router.get(
  "/api/orders",
  isAuthenticated,
  isSeller,
  sellerController.getApiOrders,
);

// Earnings & Payouts routes
router.get(
  "/earnings-payouts",
  isAuthenticated,
  isSeller,
  sellerController.getEarningsPayouts,
);
router.post(
  "/request-payout",
  isAuthenticated,
  isSeller,
  sellerController.requestPayout,
);

// Reviews routes
router.get(
  "/api/reviews",
  isAuthenticated,
  isSeller,
  sellerController.getApiReviews,
);

// Product Management routes
router.post(
  "/add-product",
  isAuthenticated,
  isSeller,
  memoryUpload.array("images", 5),
  sellerController.addProduct,
);
router.get(
  "/productmanagement",
  isAuthenticated,
  isSeller,
  sellerController.getProductManagement,
);
router.get(
  "/api/products",
  isAuthenticated,
  isSeller,
  sellerController.getApiProducts,
);
router.post(
  "/delete-product/:id",
  isAuthenticated,
  isSeller,
  sellerController.deleteProduct,
);
router.post(
  "/update-stock/:id",
  isAuthenticated,
  isSeller,
  sellerController.updateStock,
);

// Order status routes
router.post(
  "/orders/:orderId/status",
  isAuthenticated,
  isSeller,
  sellerController.updateOrderStatus,
);
router.post(
  "/orders/:orderId/delivery-date",
  isAuthenticated,
  isSeller,
  sellerController.updateDeliveryDate,
);

// Verification document routes
router.post(
  "/upload-document",
  isAuthenticated,
  isSeller,
  uploadVerificationDoc.single("document"),
  handleUploadError,
  sellerController.uploadVerificationDocument,
);
router.delete(
  "/delete-document/:docType",
  isAuthenticated,
  isSeller,
  sellerController.deleteVerificationDocument,
);

// Edit product route
router.put(
  "/edit-product/:id",
  isAuthenticated,
  isSeller,
  memoryUpload.array("images", 5),
  sellerController.editProduct,
);

// Bulk Upload routes
router.get(
  "/bulk-upload",
  isAuthenticated,
  isSeller,
  sellerController.getBulkUpload,
);
router.get(
  "/bulk-upload/sample-csv",
  isAuthenticated,
  isSeller,
  sellerController.downloadSampleCsv,
);
router.post(
  "/bulk-upload",
  isAuthenticated,
  isSeller,
  upload.single("file"),
  sellerController.postBulkUpload,
);
router.get(
  "/bulk-upload/result",
  isAuthenticated,
  isSeller,
  sellerController.getBulkUploadResult,
);
router.get(
  "/api/bulk-upload-result",
  isAuthenticated,
  isSeller,
  sellerController.getApiBulkUploadResult,
);

module.exports = router;
