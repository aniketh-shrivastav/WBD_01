const fs = require("fs");
const cloudinary = require("../../config/cloudinaryConfig");

function createError(status, message, code) {
  const err = new Error(message);
  err.status = status;
  if (code) err.code = code;
  return err;
}

function buildServiceProviderData(serviceProvidersData) {
  const uniqueServicesSet = new Set();
  const uniqueDistrictsSet = new Set();
  const serviceProviders = [];
  const serviceCostMap = {};

  serviceProvidersData.forEach((provider) => {
    const services = Array.isArray(provider.servicesOffered)
      ? provider.servicesOffered
          .map((s) => ({
            name: String(s?.name || "").trim(),
            cost: Number(s?.cost),
          }))
          .filter((s) => s.name && !isNaN(s.cost) && s.cost > 0)
      : [];

    if (services.length === 0) return;

    services.forEach((service) => {
      uniqueServicesSet.add(service.name);
      if (!serviceCostMap[service.name]) {
        serviceCostMap[service.name] = service.cost;
      }
    });

    if (provider.district) uniqueDistrictsSet.add(provider.district);

    serviceProviders.push({
      ...provider.toObject(),
      servicesOffered: services,
    });
  });

  return {
    uniqueServices: Array.from(uniqueServicesSet).sort((a, b) =>
      a.localeCompare(b),
    ),
    uniqueDistricts: Array.from(uniqueDistrictsSet).sort((a, b) =>
      a.localeCompare(b),
    ),
    serviceProviders,
    serviceCostMap,
  };
}

function enrichBookings(bookings) {
  return bookings.map((booking) => {
    const data = booking.toObject ? booking.toObject() : booking;
    const provider = data.providerId;
    const servicesOffered = provider?.servicesOffered || [];

    const costMap = {};
    servicesOffered.forEach((s) => {
      costMap[s.name] = s.cost;
    });

    let totalCost = data.totalCost;
    if (!totalCost || totalCost === 0) {
      totalCost = (data.selectedServices || []).reduce((sum, service) => {
        return sum + (costMap[service] || 0);
      }, 0);
    }

    return {
      ...data,
      totalCost,
      statusHistory: data.statusHistory || [],
      costHistory: data.costHistory || [],
    };
  });
}

async function uploadFileToCloudinary(file, folder, hardFail) {
  if (!file?.path) return null;

  try {
    const uploadRes = await cloudinary.uploader.upload(file.path, {
      folder,
      resource_type: "image",
      timeout: 120000,
    });
    return uploadRes.secure_url;
  } catch (err) {
    if (hardFail) {
      throw createError(500, "Failed to upload profile picture");
    }
    return null;
  } finally {
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  }
}

module.exports = {
  createError,
  buildServiceProviderData,
  enrichBookings,
  uploadFileToCloudinary,
};
