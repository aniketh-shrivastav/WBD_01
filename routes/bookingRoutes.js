// routes/bookingRoutes.js
const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const { isAuthenticated } = require("../middleware");

router.post(
  "/create-booking",
  isAuthenticated,
  bookingController.createBooking,
);

module.exports = router;
