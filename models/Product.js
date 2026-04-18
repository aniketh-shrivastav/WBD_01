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
  },
  subcategory: {
    type: String,
    trim: true,
    default: "",
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
  // Stock reservation tracking — quantity allocated to active bookings
  reservedQuantity: {
    type: Number,
    default: 0,
    min: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

ProductSchema.index({ status: 1, createdAt: -1 });
ProductSchema.index({ seller: 1, createdAt: -1 });
ProductSchema.index({ category: 1, subcategory: 1, status: 1, name: 1 });
ProductSchema.index({ status: 1, quantity: 1 });
ProductSchema.index(
  {
    name: "text",
    description: "text",
    brand: "text",
    compatibility: "text",
    sku: "text",
    category: "text",
    subcategory: "text",
  },
  {
    weights: {
      name: 10,
      brand: 6,
      sku: 8,
      category: 4,
      subcategory: 4,
      compatibility: 3,
      description: 1,
    },
    name: "product_text_search_idx",
  },
);

const Product =
  mongoose.models.Product || mongoose.model("Product", ProductSchema);
module.exports = Product;
