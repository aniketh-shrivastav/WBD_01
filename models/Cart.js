const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  productId: { type: String, required: true }, // ✅ ensure this is stored
  name: String,
  price: Number,
  image: String,
  quantity: Number,
});

const cartSchema = new mongoose.Schema({
  userId: String,
  items: [itemSchema],
});

cartSchema.index({ userId: 1 });

module.exports = mongoose.model("Cart", cartSchema);
