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
  // For Car Painting bookings: chosen paint color (hex string like #ff0000)
  paintColor: { type: String },
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
