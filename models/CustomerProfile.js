const mongoose = require("mongoose");

const deliveryAddressSchema = new mongoose.Schema(
  {
    addressLine1: { type: String, default: "" },
    addressLine2: { type: String, default: "" },
    landmark: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    postalCode: { type: String, default: "" },
    country: { type: String, default: "India" },
  },
  { _id: false },
);

const customerProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  deliveryAddress: { type: deliveryAddressSchema, default: () => ({}) },
  address: String, // Legacy fallback
  district: String, // Legacy fallback
  payments: String,
  profilePicture: String,

  // Vehicle Details - Basic
  registrationNumber: { type: String, default: "" },
  vehicleMake: { type: String, default: "" },
  vehicleModel: { type: String, default: "" },
  vehicleVariant: { type: String, default: "" },
  fuelType: {
    type: String,
    enum: ["", "Petrol", "Diesel", "Electric", "Hybrid", "CNG"],
    default: "",
  },
  transmission: {
    type: String,
    enum: ["", "Manual", "Automatic"],
    default: "",
  },

  // Vehicle Details - Technical
  yearOfManufacture: { type: Number, default: null },
  vin: { type: String, default: "" },
  currentMileage: { type: Number, default: null },
  insuranceProvider: { type: String, default: "" },
  insuranceValidTill: { type: Date, default: null },

  // Vehicle Documents / Photos (Cloudinary URLs)
  rcBook: { type: String, default: "" },
  insuranceCopy: { type: String, default: "" },
  vehiclePhotos: [{ type: String }], // front, rear, interior etc.
});

customerProfileSchema.index({ registrationNumber: 1 });

module.exports = mongoose.model("CustomerProfile", customerProfileSchema);
