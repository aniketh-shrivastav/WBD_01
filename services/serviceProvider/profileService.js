const User = require("../../models/User");
const { createError } = require("./helpers");

async function getProfile(providerId) {
  const user = await User.findById(providerId).lean();

  if (!user) {
    throw createError(404, "User not found");
  }

  const {
    _id: id,
    name,
    email,
    phone,
    district = "",
    servicesOffered = [],
    paintColors = [],
    profilePicture = "",
    pickupRate = 0,
    dropoffRate = 0,
    verificationDocuments = [],
    verificationStatus = "unverified",
    verificationNote = "",
  } = user;

  return {
    id,
    name,
    email,
    phone: phone || "",
    district,
    servicesOffered,
    paintColors,
    profilePicture,
    pickupRate,
    dropoffRate,
    verificationDocuments,
    verificationStatus,
    verificationNote,
  };
}

async function deleteProfile(userId) {
  const result = await User.findByIdAndDelete(userId);

  if (!result) {
    throw createError(404, "User not found");
  }
}

module.exports = {
  getProfile,
  deleteProfile,
};
