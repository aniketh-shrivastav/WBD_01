const User = require("../../models/User");
const CustomerProfile = require("../../models/CustomerProfile");
const { createError, uploadFileToCloudinary } = require("./helpers");

async function getProfilePageData(userId) {
  const user = await User.findById(userId);
  let profile = await CustomerProfile.findOne({ userId });

  if (!profile) {
    profile = {
      name: user?.name,
      email: user?.email,
      phone: user?.phone,
      address: "",
      district: "",
      payments: "",
    };
  }

  return { user, profile };
}

async function getProfileApiData(userId) {
  const user = await User.findById(userId);
  let profile = await CustomerProfile.findOne({ userId });

  if (!profile) {
    profile = {
      address: "",
      district: "",
      payments: "",
    };
  }

  return {
    user: {
      id: user?.id,
      name: user?.name,
      phone: user?.phone,
    },
    profile,
  };
}

async function updateProfile(userId, body, files, file) {
  const {
    name,
    phone,
    address,
    district,
    payments,
    registrationNumber,
    vehicleMake,
    vehicleModel,
    vehicleVariant,
    fuelType,
    transmission,
    yearOfManufacture,
    vin,
    currentMileage,
    insuranceProvider,
    insuranceValidTill,
  } = body;

  await User.findByIdAndUpdate(userId, { name, phone }, { new: true });

  const updateData = {
    address,
    district,
    payments,
    registrationNumber: registrationNumber || "",
    vehicleMake: vehicleMake || "",
    vehicleModel: vehicleModel || "",
    vehicleVariant: vehicleVariant || "",
    fuelType: fuelType || "",
    transmission: transmission || "",
    yearOfManufacture: yearOfManufacture ? Number(yearOfManufacture) : null,
    vin: vin || "",
    currentMileage: currentMileage ? Number(currentMileage) : null,
    insuranceProvider: insuranceProvider || "",
    insuranceValidTill: insuranceValidTill || null,
  };

  if (files?.profilePicture?.[0]) {
    updateData.profilePicture = await uploadFileToCloudinary(
      files.profilePicture[0],
      "customer_profiles",
      true,
    );
  } else if (file) {
    updateData.profilePicture = await uploadFileToCloudinary(
      file,
      "customer_profiles",
      true,
    );
  }

  if (files?.rcBook?.[0]) {
    const rcBookUrl = await uploadFileToCloudinary(
      files.rcBook[0],
      "customer_vehicle_docs",
      false,
    );
    if (rcBookUrl) updateData.rcBook = rcBookUrl;
  }

  if (files?.insuranceCopy?.[0]) {
    const insuranceUrl = await uploadFileToCloudinary(
      files.insuranceCopy[0],
      "customer_vehicle_docs",
      false,
    );
    if (insuranceUrl) updateData.insuranceCopy = insuranceUrl;
  }

  if (files?.vehiclePhotos?.length > 0) {
    const urls = [];

    for (const vehiclePhoto of files.vehiclePhotos) {
      const photoUrl = await uploadFileToCloudinary(
        vehiclePhoto,
        "customer_vehicle_photos",
        false,
      );
      if (photoUrl) urls.push(photoUrl);
    }

    if (urls.length > 0) {
      const existing = await CustomerProfile.findOne({ userId });
      updateData.vehiclePhotos = [...(existing?.vehiclePhotos || []), ...urls];
    }
  }

  await CustomerProfile.findOneAndUpdate({ userId }, updateData, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  });

  return { profilePicture: updateData.profilePicture };
}

async function deleteVehiclePhoto(userId, photoUrl) {
  if (!photoUrl) {
    throw createError(400, "Photo URL required");
  }

  await CustomerProfile.findOneAndUpdate(
    { userId },
    { $pull: { vehiclePhotos: photoUrl } },
  );
}

async function deleteProfile(userId) {
  if (!userId) {
    throw createError(400, "User ID missing");
  }

  await User.findByIdAndDelete(userId);
}

module.exports = {
  getProfilePageData,
  getProfileApiData,
  updateProfile,
  deleteVehiclePhoto,
  deleteProfile,
};
