const mongoose = require("mongoose");

const ServiceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    cost: { type: Number, required: true },
  },
  { _id: false },
); // No _id needed for subdocuments

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: String,
  password: String,
  role: {
    type: String,
    enum: ["customer", "seller", "service-provider", "manager", "admin"],
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  suspended: { type: Boolean, default: false },
  businessName: String,
  workshopName: String,
  profilePicture: String,
  address: String,
  district: String,
  servicesOffered: [ServiceSchema], // array of { name, cost }
  // Pickup & drop-off rates for service providers
  pickupRate: { type: Number, default: 0 },
  dropoffRate: { type: Number, default: 0 },
  // For service providers offering Car Painting: list of available paint colors (hex strings like #ff0000)
  paintColors: { type: [String], default: [] },

  // Service provider verification documents & status
  verificationDocuments: [
    {
      docType: { type: String, required: true },
      docUrl: { type: String, required: true },
      fileName: { type: String },
      uploadedAt: { type: Date, default: Date.now },
    },
  ],
  verificationStatus: {
    type: String,
    enum: ["unverified", "pending", "verified", "rejected"],
    default: "unverified",
  },
  verifiedAt: { type: Date },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  verificationNote: { type: String },

  // Password reset flow
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  // Email verification via OTP for new signups
  emailVerified: { type: Boolean, default: true }, // existing users remain allowed
  signupOtp: { type: String },
  signupOtpExpires: { type: Date },
  signupOtpAttempts: { type: Number, default: 0 },
  // Firebase UID for Google Sign-In users
  firebaseUid: { type: String },
});

const User = mongoose.model("User", UserSchema);
module.exports = User;
