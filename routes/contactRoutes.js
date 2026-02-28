const express = require("express");
const router = express.Router();
const contactController = require("../controllers/contactController");

// Import centralized middleware
const { managerOnly } = require("../middleware");

// Alias for backward compatibility
const ManagersOnly = managerOnly;

router.post("/contactus", contactController.submitContact);
router.get(
  "/manager/support",
  ManagersOnly,
  contactController.getManagerSupport,
);
router.delete(
  "/support/respond/:id",
  ManagersOnly,
  contactController.deleteTicket,
);

module.exports = { router };
