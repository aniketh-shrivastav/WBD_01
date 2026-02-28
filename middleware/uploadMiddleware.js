/**
 * File Upload Middleware (Third-Party + Custom Middleware)
 *
 * Uses multer (third-party) with custom configurations
 *
 * Type: Third-Party Middleware (multer) with Custom Configuration
 */

const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directory exists
const UPLOAD_DIR = path.join(__dirname, "..", "tmp", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Disk Storage Configuration
 * Stores files to disk (useful for large files or when you need file path)
 */
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const cleanName = file.originalname.replace(/\s+/g, "-");
    const uniqueName = `${Date.now()}-${cleanName}`;
    cb(null, uniqueName);
  },
});

/**
 * Memory Storage Configuration
 * Stores files in memory as Buffer (faster for small files, direct cloud upload)
 */
const memoryStorage = multer.memoryStorage();

/**
 * File filter for images only
 */
const imageFilter = (req, file, cb) => {
  const allowedMimes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  const allowedExts = [".jpeg", ".jpg", ".png", ".gif", ".webp"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
    return cb(null, true);
  }
  cb(new Error("Only image files are allowed (jpeg, jpg, png, gif, webp)"));
};

/**
 * File filter for documents (CSV, Excel, ZIP)
 */
const documentFilter = (req, file, cb) => {
  const allowedMimes = [
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/zip",
    "application/x-zip-compressed",
  ];
  const allowedExts = [".csv", ".xls", ".xlsx", ".zip"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
    return cb(null, true);
  }
  cb(new Error("Only CSV, Excel, or ZIP files are allowed"));
};

/**
 * File filter for verification documents (images + PDF)
 */
const verificationDocFilter = (req, file, cb) => {
  const allowedMimes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
  ];
  const allowedExts = [".jpeg", ".jpg", ".png", ".gif", ".webp", ".pdf"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
    return cb(null, true);
  }
  cb(
    new Error(
      "Only image files (jpeg, jpg, png, gif, webp) and PDF files are allowed",
    ),
  );
};

/**
 * Verification document upload to disk (10MB limit)
 */
const uploadVerificationDoc = multer({
  storage: diskStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: verificationDocFilter,
});

// Pre-configured upload instances

/**
 * Image upload to disk (50MB limit)
 */
const uploadImageToDisk = multer({
  storage: diskStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: imageFilter,
});

/**
 * Image upload to memory (50MB limit) - faster for cloud uploads
 */
const uploadImageToMemory = multer({
  storage: memoryStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: imageFilter,
});

/**
 * Document upload to disk (100MB limit)
 */
const uploadDocumentToDisk = multer({
  storage: diskStorage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: documentFilter,
});

/**
 * Generic upload to disk (no filter, 50MB limit)
 */
const uploadGeneric = multer({
  storage: diskStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

/**
 * Handle multer errors
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum size allowed is 50MB.",
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || "File upload failed",
    });
  }

  next();
};

/**
 * Clean up uploaded file after processing
 */
const cleanupUpload = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.warn("Failed to cleanup uploaded file:", err.message);
    }
  }
};

module.exports = {
  UPLOAD_DIR,
  diskStorage,
  memoryStorage,
  imageFilter,
  documentFilter,
  verificationDocFilter,
  uploadImageToDisk,
  uploadImageToMemory,
  uploadDocumentToDisk,
  uploadVerificationDoc,
  uploadGeneric,
  handleUploadError,
  cleanupUpload,
};
