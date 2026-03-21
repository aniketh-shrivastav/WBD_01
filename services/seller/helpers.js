const fs = require("fs");
const mongoose = require("mongoose");
const cloudinary = require("../../config/cloudinaryConfig");

const SELLER_DOC_TYPES_INDIVIDUAL = [
  "PAN Card",
  "Aadhaar Card (Masked)",
  "Selfie Verification",
];

const SELLER_DOC_TYPES_BUSINESS = [
  "PAN Card (Business)",
  "GST Certificate",
  "Certificate of Incorporation",
  "Shop & Establishment License",
];

const ALL_SELLER_DOC_TYPES = [
  ...SELLER_DOC_TYPES_INDIVIDUAL,
  ...SELLER_DOC_TYPES_BUSINESS,
];

function deriveOrderStatus(items, fallback = "pending") {
  if (!Array.isArray(items) || items.length === 0) return fallback;
  const statuses = items.map((item) => item.itemStatus || fallback);

  if (statuses.every((s) => s === "cancelled")) return "cancelled";
  if (statuses.every((s) => s === "delivered")) return "delivered";
  if (statuses.some((s) => s === "shipped")) return "shipped";
  if (statuses.some((s) => s === "confirmed")) return "confirmed";
  return "pending";
}

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function uploadProfilePictureIfPresent(file, folderName) {
  if (!file) return null;

  try {
    const uploadRes = await cloudinary.uploader.upload(file.path, {
      folder: folderName,
      resource_type: "image",
      timeout: 120000,
    });

    return uploadRes.secure_url;
  } finally {
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  }
}

function uploadImageBufferToCloudinary(file, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        fetch_format: "auto",
        quality: "auto",
        resource_type: "image",
        timeout: 120000,
      },
      (err, result) => {
        if (err) return reject(err);
        return resolve(result);
      },
    );

    stream.end(file.buffer);
  });
}

async function uploadProductImages(files) {
  const uploadedImages = [];

  for (const file of files) {
    const uploadRes = await uploadImageBufferToCloudinary(
      file,
      "autocustomizer/products",
    );

    uploadedImages.push({
      url: uploadRes.secure_url,
      publicId: uploadRes.public_id,
    });
  }

  return uploadedImages;
}

module.exports = {
  SELLER_DOC_TYPES_INDIVIDUAL,
  SELLER_DOC_TYPES_BUSINESS,
  ALL_SELLER_DOC_TYPES,
  deriveOrderStatus,
  createError,
  isValidObjectId,
  uploadProfilePictureIfPresent,
  uploadProductImages,
};
