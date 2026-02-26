const cloudinary = require("cloudinary").v2;

// Configure Cloudinary with sensible defaults and a higher timeout for slower networks
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
  timeout: 120000, // 120s to reduce 499 timeouts on slower connections
});

module.exports = cloudinary;
