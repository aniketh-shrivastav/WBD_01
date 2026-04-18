const mongoose = require("mongoose");

function generateOrderId() {
  const timePart = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ORD-${timePart}-${randomPart}`;
}

const DeliveryAddressSchema = new mongoose.Schema(
  {
    addressLine1: { type: String, required: true },
    addressLine2: { type: String, default: "" },
    landmark: { type: String, default: "" },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, default: "India" },
  },
  { _id: false },
);

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
  orderId: {
    type: String,
    unique: true,
    index: true,
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Same as Cart userId
  items: { type: [OrderItemSchema], required: true },
  totalAmount: { type: Number, required: true },
  deliveryAddress: { type: String, required: true }, // Legacy display text
  deliveryAddressDetails: { type: DeliveryAddressSchema, required: true },
  district: { type: String, default: "" }, // Legacy field mapped from city
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

OrderSchema.index({ userId: 1, placedAt: -1 });
OrderSchema.index({ "items.seller": 1, placedAt: -1 });
OrderSchema.index({ userId: 1, "items.productId": 1, orderStatus: 1 });
OrderSchema.index({ paymentStatus: 1, placedAt: -1 });
OrderSchema.index({ orderStatus: 1, placedAt: -1 });

OrderSchema.pre("validate", function setOrderId(next) {
  if (!this.orderId) {
    this.orderId = generateOrderId();
  }
  next();
});

module.exports = mongoose.model("Order", OrderSchema);
