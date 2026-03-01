// models/ServiceBooking.js
const mongoose = require("mongoose");

const ServiceBookingSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  selectedServices: [{ type: String, required: true }], // names of selected services
  date: { type: Date, required: true },
  phone: { type: String, required: true },
  carModel: { type: String, required: true },
  address: { type: String, required: true },
  description: { type: String, required: true },
  district: { type: String, required: true },
  carYear: { type: Number, min: 1900, max: new Date().getFullYear() },

  // Extended vehicle details
  registrationNumber: { type: String, default: "" },
  vehicleMake: { type: String, default: "" },
  vehicleModel: { type: String, default: "" },
  vehicleVariant: { type: String, default: "" },
  fuelType: { type: String, default: "" },
  transmission: { type: String, default: "" },
  yearOfManufacture: { type: Number, default: null },
  vin: { type: String, default: "" },
  currentMileage: { type: Number, default: null },
  insuranceProvider: { type: String, default: "" },
  insuranceValidTill: { type: Date, default: null },
  rcBook: { type: String, default: "" },
  insuranceCopy: { type: String, default: "" },
  vehiclePhotos: [{ type: String }],

  // For Car Painting bookings: chosen paint color (hex string like #ff0000)
  paintColor: { type: String },

  // Pickup / Drop-off
  needsPickup: { type: Boolean, default: false },
  needsDropoff: { type: Boolean, default: false },
  pickupCost: { type: Number, default: 0 },
  dropoffCost: { type: Number, default: 0 },

  // Product cost (added by provider after booking)
  productCost: { type: Number, default: 0 },

  // Price approval workflow (customer must agree to finalized price)
  priceApproved: { type: Boolean, default: false },
  priceApprovalStatus: {
    type: String,
    enum: ["none", "pending", "accepted", "rejected"],
    default: "none",
  },

  // Service category (from manager-defined categories)
  serviceCategory: { type: String, default: "" },

  totalCost: {
    type: Number,
    required: false, // make optional for backward compatibility
  },
  status: {
    type: String,
    enum: ["Open", "Confirmed", "Ready", "Completed", "Rejected"],
    default: "Open",
  },
  previousStatus: { type: String },
  rating: {
    type: Number,
    min: 1,
    max: 5,
  },
  review: {
    type: String,
  },
  createdAt: { type: Date, default: Date.now },
  statusHistory: [
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
  costHistory: [
    {
      from: { type: Number },
      to: { type: Number },
      changedAt: { type: Date, default: Date.now },
      changedBy: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        role: { type: String },
      },
    },
  ],
});

module.exports = mongoose.model("ServiceBooking", ServiceBookingSchema);
