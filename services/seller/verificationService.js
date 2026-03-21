const fs = require("fs");
const cloudinary = require("../../config/cloudinaryConfig");
const User = require("../../models/User");
const { ALL_SELLER_DOC_TYPES, createError } = require("./helpers");

async function uploadVerificationDocument(userId, docType, file) {
  if (!docType || !ALL_SELLER_DOC_TYPES.includes(docType)) {
    if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    throw createError(400, "Invalid document type");
  }

  if (!file) {
    throw createError(400, "No file uploaded");
  }

  let docUrl;
  try {
    const uploadRes = await cloudinary.uploader.upload(file.path, {
      folder: "seller_verification_docs",
      resource_type: "auto",
      timeout: 120000,
    });
    docUrl = uploadRes.secure_url;
  } finally {
    if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw createError(404, "User not found");
  }

  user.verificationDocuments = (user.verificationDocuments || []).filter(
    (document) => document.docType !== docType,
  );

  user.verificationDocuments.push({
    docType,
    docUrl,
    fileName: file.originalname,
    uploadedAt: new Date(),
  });

  if (
    user.verificationStatus === "unverified" ||
    user.verificationStatus === "rejected"
  ) {
    user.verificationStatus = "pending";
  }

  await user.save();
  return user;
}

async function deleteVerificationDocument(userId, encodedDocType) {
  if (!encodedDocType) {
    throw createError(400, "Document type is required");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw createError(404, "User not found");
  }

  const docType = decodeURIComponent(encodedDocType);
  const before = (user.verificationDocuments || []).length;

  user.verificationDocuments = (user.verificationDocuments || []).filter(
    (document) => document.docType !== docType,
  );

  if (user.verificationDocuments.length === before) {
    throw createError(404, "Document not found");
  }

  if (
    user.verificationDocuments.length === 0 &&
    user.verificationStatus === "pending"
  ) {
    user.verificationStatus = "unverified";
  }

  await user.save();
  return user;
}

module.exports = {
  uploadVerificationDocument,
  deleteVerificationDocument,
};
