const mongoose = require("mongoose");
const User = require("../../models/User");
const CustomerProfile = require("../../models/CustomerProfile");
const ServiceBooking = require("../../models/serviceBooking");
const { createError, buildServiceProviderData } = require("./helpers");

async function getBookingData(customerId, includeRatings = false) {
  const customerProfile = await CustomerProfile.findOne({ userId: customerId });

  const serviceProvidersData = await User.find(
    {
      role: "service-provider",
      suspended: { $ne: true },
      servicesOffered: {
        $elemMatch: {
          name: { $exists: true, $ne: "" },
          cost: { $gt: 0 },
        },
      },
    },
    "name servicesOffered district paintColors pickupRate dropoffRate verificationStatus",
  );

  const { uniqueServices, uniqueDistricts, serviceProviders, serviceCostMap } =
    buildServiceProviderData(serviceProvidersData);

  let ratingsMap = {};

  if (includeRatings) {
    const providerIds = serviceProviders.map((p) => p?._id).filter(Boolean);

    if (providerIds.length > 0) {
      try {
        const agg = await ServiceBooking.aggregate([
          { $match: { providerId: { $in: providerIds } } },
          { $match: { rating: { $exists: true } } },
          {
            $group: {
              _id: "$providerId",
              avgRating: { $avg: "$rating" },
              totalReviews: { $sum: 1 },
            },
          },
        ]);

        ratingsMap = Object.fromEntries(
          agg.map((r) => [
            String(r._id),
            {
              avgRating: Number(r.avgRating?.toFixed?.(1) || 0),
              totalReviews: r.totalReviews || 0,
            },
          ]),
        );
      } catch (err) {
        ratingsMap = {};
      }
    }
  }

  return {
    uniqueServices,
    uniqueDistricts,
    serviceProviders,
    customerProfile,
    selectedServiceType: "",
    selectedDistrict: "",
    serviceCostMap,
    ratingsMap,
  };
}

async function getProviderReviews(providerId) {
  if (!providerId || !mongoose.Types.ObjectId.isValid(providerId)) {
    throw createError(400, "Invalid provider id");
  }

  const reviews = await ServiceBooking.find({
    providerId,
    rating: { $exists: true },
  })
    .populate("customerId", "name")
    .sort({ createdAt: -1 })
    .lean();

  return reviews.map((r) => ({
    _id: r._id,
    customerName: r.customerId?.name || "Customer",
    rating: r.rating,
    review: r.review || "",
    createdAt: r.createdAt,
  }));
}

async function rateService(bookingId, userId, rating, review) {
  const booking = await ServiceBooking.findById(bookingId);

  if (!booking || String(booking.customerId) !== String(userId)) {
    throw createError(404, "Booking not found");
  }

  if (booking.status !== "Ready") {
    throw createError(400, "You can only rate completed services");
  }

  booking.rating = Number(rating);
  booking.review = review || "";
  await booking.save();
}

module.exports = {
  getBookingData,
  getProviderReviews,
  rateService,
};
