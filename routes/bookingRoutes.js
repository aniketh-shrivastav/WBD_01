// routes/bookingRoutes.js
const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");

router.post("/create-booking", bookingController.createBooking);

module.exports = router;
