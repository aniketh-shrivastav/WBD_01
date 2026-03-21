const dashboardService = require("./seller/dashboardService");
const profileService = require("./seller/profileService");
const orderService = require("./seller/orderService");
const reviewService = require("./seller/reviewService");
const productService = require("./seller/productService");
const verificationService = require("./seller/verificationService");
const bulkUploadService = require("./seller/bulkUploadService");
const sellerPlaceholderService = require("./seller/sellerPlaceholderService");

module.exports = {
  ...dashboardService,
  ...profileService,
  ...orderService,
  ...reviewService,
  ...productService,
  ...verificationService,
  ...bulkUploadService,
  ...sellerPlaceholderService,
};
