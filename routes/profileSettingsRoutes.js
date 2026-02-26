const express = require("express");
const User = require("../models/User");
const cloudinary = require("../config/cloudinaryConfig");
const fs = require("fs");
const router = express.Router();

// Import centralized middleware
const {
  isAuthenticated,
  isServiceProvider,
  serviceOnly,
  uploadImageToDisk,
  handleUploadError,
} = require("../middleware");

function parseJsonField(value, fallback) {
  if (value === undefined || value === null) return fallback;
  if (Array.isArray(value) || typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

router.post(
  "/profile/update",
  serviceOnly,
  uploadImageToDisk.single("profilePicture"),
  handleUploadError,
  async (req, res) => {
    try {
      console.log("Request body received:", req.body);

      const {
        name,
        phone,
        district,
        servicesOffered = [],
        paintColors = [],
      } = req.body;
      const userId = req.session.user?.id;

      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      // Ensure servicesOffered is in the format: [{ name: "", cost: 0 }]
      const servicesInput = parseJsonField(servicesOffered, []);
      const servicesArray = Array.isArray(servicesInput)
        ? servicesInput
            .map((s) => {
              if (
                typeof s === "object" &&
                s.name &&
                !isNaN(parseFloat(s.cost))
              ) {
                return {
                  name: s.name.trim(),
                  cost: parseFloat(s.cost),
                };
              }
              return null;
            })
            .filter(Boolean)
        : [];

      console.log("Processed servicesOffered:", servicesArray);

      // Normalize paint colors to a safe list of unique hex strings
      const hexColorRe = /^#[0-9a-fA-F]{6}$/;
      const colorsInput = parseJsonField(paintColors, []);
      const incomingColors = Array.isArray(colorsInput) ? colorsInput : [];
      const normalizedColors = Array.from(
        new Set(
          incomingColors
            .map((c) =>
              String(c || "")
                .trim()
                .toLowerCase(),
            )
            .filter((c) => hexColorRe.test(c)),
        ),
      ).slice(0, 24);

      const hasCarPainting = servicesArray.some((s) => {
        const name = String(s?.name || "").toLowerCase();
        return (
          name.includes("car") &&
          (name.includes("paint") || name.includes("painting"))
        );
      });

      const updateData = {
        name,
        phone,
        district,
        servicesOffered: servicesArray,
        paintColors: hasCarPainting ? normalizedColors : [],
      };

      if (req.file) {
        try {
          const uploadRes = await cloudinary.uploader.upload(req.file.path, {
            folder: "service_provider_profiles",
            resource_type: "image",
            timeout: 120000,
          });
          updateData.profilePicture = uploadRes.secure_url;
        } finally {
          if (req.file.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        }
      }

      await User.findByIdAndUpdate(userId, updateData);

      res.json({
        success: true,
        message: "Profile updated successfully",
        profilePicture: updateData.profilePicture,
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res
        .status(500)
        .json({ success: false, message: "Error updating profile" });
    }
  },
);

module.exports = router;
