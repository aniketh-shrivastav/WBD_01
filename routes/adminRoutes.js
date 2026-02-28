const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

const { isAuthenticated, isAdmin } = require("../middleware");

router.get(
  "/api/dashboard",
  isAuthenticated,
  isAdmin,
  adminController.getDashboard,
);

module.exports = router;
