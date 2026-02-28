const mongoose = require("mongoose");

const customerProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  address: String,
  district: String,
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

module.exports = mongoose.model("CustomerProfile", customerProfileSchema);
