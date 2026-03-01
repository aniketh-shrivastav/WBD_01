const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  // The customer who receives this notification
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // Type of notification
  type: {
    type: String,
    enum: [
      "new_order", // New order placed
      "order_status", // Order status changed
      "new_service", // New service booking created
      "service_status", // Service booking status changed
      "price_finalized", // Service provider finalized a price
      "price_accepted", // Customer accepted the price
      "price_rejected", // Customer rejected the price
      "service_cancelled", // Service cancelled after price rejection
    ],
    required: true,
  },

  // Human-readable title & message
  title: { type: String, required: true },
  message: { type: String, required: true },

  // Reference to the related entity
  referenceId: { type: mongoose.Schema.Types.ObjectId },
  referenceModel: {
    type: String,
    enum: ["Order", "ServiceBooking"],
  },

  // For price_finalized notifications — tracks approval workflow
  priceApproval: {
    proposedPrice: { type: Number },
    previousPrice: { type: Number },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    respondedAt: { type: Date },
  },

  // Read status
  read: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
});

// Index for fast customer queries
NotificationSchema.index({ customerId: 1, createdAt: -1 });
NotificationSchema.index({ customerId: 1, read: 1 });

module.exports = mongoose.model("Notification", NotificationSchema);
