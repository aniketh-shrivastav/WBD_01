const User = require("../../models/User");
const SellerProfile = require("../../models/sellerProfile");
const {
  SELLER_DOC_TYPES_INDIVIDUAL,
  SELLER_DOC_TYPES_BUSINESS,
  createError,
  uploadProfilePictureIfPresent,
} = require("./helpers");

async function getProfileSettingsData(userId, sessionUser) {
  const sellerProfile = await SellerProfile.findOne({
    sellerId: userId,
  }).populate(
    "sellerId",
    "name email phone profilePicture verificationStatus verificationDocuments verifiedAt verificationNote",
  );

  if (!sellerProfile) {
    const user = await User.findById(userId).select(
      "name email phone profilePicture verificationStatus verificationDocuments verifiedAt verificationNote",
    );

    return {
      profile: {
        storeName: user?.name || sessionUser?.name,
        ownerName: "",
        contactEmail: user?.email || sessionUser?.email,
        phone: user?.phone || sessionUser?.phone || "",
        address: "",
        profilePicture: user?.profilePicture || "",
        sellerType: "individual",
        verificationStatus: user?.verificationStatus || "unverified",
        verificationDocuments: user?.verificationDocuments || [],
        verificationNote: user?.verificationNote || "",
        verifiedAt: user?.verifiedAt || null,
      },
      docTypesIndividual: SELLER_DOC_TYPES_INDIVIDUAL,
      docTypesBusiness: SELLER_DOC_TYPES_BUSINESS,
    };
  }

  return {
    profile: {
      storeName: sellerProfile.sellerId.name,
      ownerName: sellerProfile.ownerName || "",
      contactEmail: sellerProfile.sellerId.email,
      phone: sellerProfile.sellerId.phone || "",
      address: sellerProfile.address || "",
      profilePicture: sellerProfile.sellerId.profilePicture || "",
      sellerType: sellerProfile.sellerType || "individual",
      verificationStatus:
        sellerProfile.sellerId.verificationStatus || "unverified",
      verificationDocuments: sellerProfile.sellerId.verificationDocuments || [],
      verificationNote: sellerProfile.sellerId.verificationNote || "",
      verifiedAt: sellerProfile.sellerId.verifiedAt || null,
    },
    docTypesIndividual: SELLER_DOC_TYPES_INDIVIDUAL,
    docTypesBusiness: SELLER_DOC_TYPES_BUSINESS,
  };
}

async function updateProfileSettings(userId, body, file) {
  const { storeName, contactEmail, phone, ownerName, address, sellerType } =
    body;

  if (!storeName?.trim() || !ownerName?.trim()) {
    throw createError(400, "Store and Owner name required");
  }

  const phoneRegex = /^\d{10}$/;
  if (phone && !phoneRegex.test(phone)) {
    throw createError(400, "Phone must be 10 digits");
  }

  const profilePicture = await uploadProfilePictureIfPresent(
    file,
    "seller_profiles",
  );

  const userUpdate = {
    name: storeName,
    email: contactEmail,
    phone,
  };

  if (profilePicture) userUpdate.profilePicture = profilePicture;

  await User.findByIdAndUpdate(userId, userUpdate);

  const profileUpdate = {
    ownerName,
    address,
    sellerId: userId,
  };

  if (sellerType && ["individual", "business"].includes(sellerType)) {
    profileUpdate.sellerType = sellerType;
  }

  await SellerProfile.findOneAndUpdate({ sellerId: userId }, profileUpdate, {
    new: true,
    upsert: true,
  });

  return { profilePicture };
}

module.exports = {
  getProfileSettingsData,
  updateProfileSettings,
};
