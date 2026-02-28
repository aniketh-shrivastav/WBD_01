const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    name: { type: String, required: true }, // Snapshot at time of order
    price: { type: Number, required: true },
    image: { type: String },
    quantity: { type: Number, required: true },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }, // populated at order time
    itemStatus: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
    }, // Individual status for each product/item
    deliveryDate: {
      type: Date,
    }, // Expected delivery date set by seller
    deliveryOtp: { type: String }, // OTP generated when shipped, customer must share with seller to confirm delivery
    deliveryOtpGeneratedAt: { type: Date },
    itemStatusHistory: [
      {
        from: { type: String },
        to: { type: String },
        changedAt: { type: Date, default: Date.now },
        changedBy: {
          id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          role: { type: String },
        },
      },
    ],
  },
  { _id: false },
);

const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Same as Cart userId
  items: { type: [OrderItemSchema], required: true },
  totalAmount: { type: Number, required: true },
  deliveryAddress: { type: String, required: true },
  district: { type: String, required: true },
  useCustomAddress: { type: Boolean, default: false }, // true if customer provided a different address
  orderStatus: {
    type: String,
    enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
    default: "pending",
  },
  previousStatus: { type: String },
  orderStatusHistory: [
    {
      from: { type: String },
      to: { type: String },
      changedAt: { type: Date, default: Date.now },
      changedBy: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        role: { type: String },
      },
    },
  ],
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "paid",
  },
  placedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Order", OrderSchema);
