const express = require("express");
const router = express.Router();
const profileSettingsController = require("../controllers/profileSettingsController");

// Import centralized middleware
const {
  serviceOnly,
  uploadImageToDisk,
  handleUploadError,
} = require("../middleware");

router.post(
  "/profile/update",
  serviceOnly,
  uploadImageToDisk.single("profilePicture"),
  handleUploadError,
  profileSettingsController.updateProfile,
);

module.exports = router;
