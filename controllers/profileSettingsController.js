const User = require("../models/User");
const cloudinary = require("../config/cloudinaryConfig");
const fs = require("fs");

function parseJsonField(value, fallback) {
  if (value === undefined || value === null) return fallback;
  if (Array.isArray(value) || typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

exports.updateProfile = async (req, res) => {
  try {
    console.log("Request body received:", req.body);

    const {
      name,
      phone,
      district,
      servicesOffered = [],
      paintColors = [],
      pickupRate,
      dropoffRate,
    } = req.body;
    const userId = req.session.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Ensure servicesOffered is in the format: [{ name: "", cost: 0 }]
    const servicesInput = parseJsonField(servicesOffered, []);
    const servicesArray = Array.isArray(servicesInput)
      ? servicesInput
          .map((s) => {
            if (typeof s === "object" && s.name && !isNaN(parseFloat(s.cost))) {
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

    // Pickup / drop-off rates (service providers only)
    if (pickupRate !== undefined)
      updateData.pickupRate = Math.max(0, Number(pickupRate) || 0);
    if (dropoffRate !== undefined)
      updateData.dropoffRate = Math.max(0, Number(dropoffRate) || 0);

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
    res.status(500).json({ success: false, message: "Error updating profile" });
  }
};

// Allowed verification document types
const VERIFICATION_DOC_TYPES = [
  "GST Registration Certificate",
  "PAN Card",
  "Business Registration Proof",
  "MSME / Udyam Registration",
  "Shop & Establishment License",
  "Certificate of Incorporation",
  "Aadhaar Card (Masked)",
  "Shop License",
];
exports.VERIFICATION_DOC_TYPES = VERIFICATION_DOC_TYPES;

// Upload a verification document
exports.uploadVerificationDocument = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const { docType } = req.body;
    if (!docType || !VERIFICATION_DOC_TYPES.includes(docType)) {
      if (req.file?.path && fs.existsSync(req.file.path))
        fs.unlinkSync(req.file.path);
      return res
        .status(400)
        .json({ success: false, message: "Invalid document type" });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    // Upload to Cloudinary
    let docUrl;
    try {
      const uploadRes = await cloudinary.uploader.upload(req.file.path, {
        folder: "sp_verification_docs",
        resource_type: "auto",
        timeout: 120000,
      });
      docUrl = uploadRes.secure_url;
    } finally {
      if (req.file.path && fs.existsSync(req.file.path))
        fs.unlinkSync(req.file.path);
    }

    const user = await User.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    // Remove existing document of the same type (replace)
    user.verificationDocuments = (user.verificationDocuments || []).filter(
      (d) => d.docType !== docType,
    );
    user.verificationDocuments.push({
      docType,
      docUrl,
      fileName: req.file.originalname,
      uploadedAt: new Date(),
    });

    // Set status to pending if currently unverified or rejected
    if (
      user.verificationStatus === "unverified" ||
      user.verificationStatus === "rejected"
    ) {
      user.verificationStatus = "pending";
    }

    await user.save();

    res.json({
      success: true,
      message: "Document uploaded successfully",
      verificationDocuments: user.verificationDocuments,
      verificationStatus: user.verificationStatus,
    });
  } catch (error) {
    console.error("Error uploading verification document:", error);
    res
      .status(500)
      .json({ success: false, message: "Error uploading document" });
  }
};

// Delete a verification document
exports.deleteVerificationDocument = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const { docType } = req.params;
    if (!docType)
      return res
        .status(400)
        .json({ success: false, message: "Document type is required" });

    const user = await User.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const before = (user.verificationDocuments || []).length;
    user.verificationDocuments = (user.verificationDocuments || []).filter(
      (d) => d.docType !== decodeURIComponent(docType),
    );

    if (user.verificationDocuments.length === before) {
      return res
        .status(404)
        .json({ success: false, message: "Document not found" });
    }

    // If all docs removed, revert to unverified
    if (
      user.verificationDocuments.length === 0 &&
      user.verificationStatus === "pending"
    ) {
      user.verificationStatus = "unverified";
    }

    await user.save();

    res.json({
      success: true,
      message: "Document deleted",
      verificationDocuments: user.verificationDocuments,
      verificationStatus: user.verificationStatus,
    });
  } catch (error) {
    console.error("Error deleting verification document:", error);
    res
      .status(500)
      .json({ success: false, message: "Error deleting document" });
  }
};
