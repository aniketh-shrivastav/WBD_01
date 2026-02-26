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
  // For service providers offering Car Painting: list of available paint colors (hex strings like #ff0000)
  paintColors: { type: [String], default: [] },
  // Password reset flow
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  // Email verification via OTP for new signups
  emailVerified: { type: Boolean, default: true }, // existing users remain allowed
  signupOtp: { type: String },
  signupOtpExpires: { type: Date },
  signupOtpAttempts: { type: Number, default: 0 },
});

const User = mongoose.model("User", UserSchema);
module.exports = User;
