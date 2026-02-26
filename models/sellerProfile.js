const mongoose = require("mongoose");

const SellerProfileSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    ownerName: { type: String, required: true }, // Added owner's name
    address: { type: String, required: true },
  },
  { timestamps: true },
);

// Auto-populate User details when fetching SellerProfile
SellerProfileSchema.pre(/^find/, function (next) {
  this.populate({
    path: "sellerId",
    select: "name email phone suspended profilePicture",
  });
  next();
});

const SellerProfile = mongoose.model("SellerProfile", SellerProfileSchema);
module.exports = SellerProfile;
