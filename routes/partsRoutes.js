const express = require("express");
const router = express.Router();
const partsController = require("../controllers/partsController");
const { isAuthenticated, serviceOnly } = require("../middleware");

// Search platform product catalog for compatible parts (service provider)
router.get(
  "/search",
  isAuthenticated,
  serviceOnly,
  partsController.searchParts,
);

// Link a product to a booking (reserve stock, mark "Allocated to Booking")
router.post("/link", isAuthenticated, serviceOnly, partsController.linkProduct);

// Unlink a product from a booking (release reserved stock)
router.post(
  "/unlink",
  isAuthenticated,
  serviceOnly,
  partsController.unlinkProduct,
);

// Update allocation status (reserved → allocated → installed / returned)
router.put(
  "/allocation-status",
  isAuthenticated,
  serviceOnly,
  partsController.updateAllocationStatus,
);

// Get linked products for a booking (provider or customer)
router.get(
  "/booking/:bookingId",
  isAuthenticated,
  partsController.getLinkedProducts,
);

module.exports = router;
