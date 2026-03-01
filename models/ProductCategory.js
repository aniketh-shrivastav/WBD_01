const mongoose = require("mongoose");

const ProductCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  subcategories: [{ type: String, trim: true }],
  active: { type: Boolean, default: true },
  // If true, products in this category need legal/compliance approval
  requiresCompliance: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ProductCategory", ProductCategorySchema);
