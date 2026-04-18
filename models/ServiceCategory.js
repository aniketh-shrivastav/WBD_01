const mongoose = require("mongoose");

const ServiceCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

ServiceCategorySchema.index({ active: 1, name: 1 });

module.exports = mongoose.model("ServiceCategory", ServiceCategorySchema);
