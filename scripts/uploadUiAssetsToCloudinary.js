const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const cloudinary = require("../config/cloudinaryConfig");

const rootDir = path.resolve(__dirname, "..");
const outputFile = path.join(
  rootDir,
  "client",
  "src",
  "config",
  "cloudinaryAssets.js",
);

const assets = [
  {
    key: "headerLogo",
    localPath: path.join(rootDir, "public", "images3", "logo2.jpg"),
    publicId: "autocustomizer/ui/header-logo",
  },
  {
    key: "cartIcon",
    localPath: path.join(rootDir, "public", "images", "cart-icon.png"),
    publicId: "autocustomizer/ui/cart-icon",
  },
  {
    key: "landingHero",
    localPath: path.join(rootDir, "public", "images2", "car-customization.png"),
    publicId: "autocustomizer/ui/landing-hero",
  },
];

function validateEnv() {
  const required = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
}

function toJsModule(urlMap) {
  return `const cloudinaryAssets = ${JSON.stringify(urlMap, null, 2)};\n\nexport default cloudinaryAssets;\n`;
}

async function uploadAssets() {
  validateEnv();

  const urlMap = {};

  for (const asset of assets) {
    if (!fs.existsSync(asset.localPath)) {
      throw new Error(`Asset file not found: ${asset.localPath}`);
    }

    const result = await cloudinary.uploader.upload(asset.localPath, {
      public_id: asset.publicId,
      overwrite: true,
      resource_type: "image",
      invalidate: true,
      use_filename: false,
      unique_filename: false,
    });

    urlMap[asset.key] = result.secure_url;
  }

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, toJsModule(urlMap), "utf8");

  console.log(`Uploaded ${assets.length} assets to Cloudinary.`);
  console.log(`Updated frontend asset map: ${outputFile}`);
}

uploadAssets().catch((err) => {
  console.error("Cloudinary upload failed:", err.message);
  process.exitCode = 1;
});
