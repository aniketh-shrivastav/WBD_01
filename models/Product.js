const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
  },
  brand: {
    type: String,
    required: true,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: Number.isInteger,
      message: "Quantity must be an integer",
    },
  },
  sku: {
    type: String,
    required: true,
    length: 6,
    uppercase: true,
  },
  compatibility: {
    type: String,
    trim: true,
  },
  image: {
    type: String,
    required: true,
  },
  images: [
    {
      url: { type: String, required: true },
      publicId: { type: String },
    },
  ],
  imagePublicId: {
    type: String, // Cloudinary public_id (optional)
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Product =
  mongoose.models.Product || mongoose.model("Product", ProductSchema);
module.exports = Product;
