const express = require("express");
const router = express.Router();
const profileSettingsController = require("../controllers/profileSettingsController");

// Import centralized middleware
const {
  serviceOnly,
  uploadImageToDisk,
  uploadVerificationDoc,
  handleUploadError,
} = require("../middleware");

router.post(
  "/profile/update",
  serviceOnly,
  uploadImageToDisk.single("profilePicture"),
  handleUploadError,
  profileSettingsController.updateProfile,
);

// Verification document routes
router.post(
  "/profile/upload-document",
  serviceOnly,
  uploadVerificationDoc.single("document"),
  handleUploadError,
  profileSettingsController.uploadVerificationDocument,
);

router.delete(
  "/profile/delete-document/:docType",
  serviceOnly,
  profileSettingsController.deleteVerificationDocument,
);

module.exports = router;
