const mongoose = require("mongoose");
const ServiceBooking = require("../../models/serviceBooking");

async function getDashboardData(providerUserId) {
  const providerId = new mongoose.Types.ObjectId(providerUserId);

  const bookings = await ServiceBooking.aggregate([
    { $match: { providerId } },
    { $unwind: "$selectedServices" },
    { $group: { _id: "$selectedServices", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const serviceLabels = bookings.map((booking) => booking._id);
  const serviceCounts = bookings.map((booking) => booking.count);

  const totalEarningsResult = await ServiceBooking.aggregate([
    { $match: { providerId, totalCost: { $exists: true } } },
    { $group: { _id: null, total: { $sum: "$totalCost" } } },
  ]);

  const grossEarnings = totalEarningsResult[0]?.total || 0;
  const netEarnings = Math.round(grossEarnings * 0.8);

  const ongoingCount = await ServiceBooking.countDocuments({
    providerId,
    status: "Confirmed",
  });

  const completedCount = await ServiceBooking.countDocuments({
    providerId,
    status: "Ready",
  });

  const ratingData = await ServiceBooking.aggregate([
    { $match: { providerId, rating: { $exists: true } } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  const avgRating = ratingData[0]?.avgRating?.toFixed(1) || "N/A";
  const totalReviews = ratingData[0]?.count || 0;

  return {
    serviceLabels,
    serviceCounts,
    totals: {
      earnings: netEarnings,
      ongoing: ongoingCount,
      completed: completedCount,
      avgRating,
      totalReviews,
    },
  };
}

module.exports = {
  getDashboardData,
};
