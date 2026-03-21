const User = require("../../models/User");
const ServiceBooking = require("../../models/serviceBooking");

function getMonthName(monthIndex) {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return months[monthIndex];
}

function getTimeAgo(date) {
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return date.toLocaleDateString();
}

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function updateProviderRating(providerId) {
  const stats = await ServiceBooking.aggregate([
    { $match: { providerId, rating: { $exists: true } } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  await User.findByIdAndUpdate(providerId, {
    averageRating: stats[0]?.avgRating || 0,
    ratingCount: stats[0]?.count || 0,
  });
}

module.exports = {
  getMonthName,
  getTimeAgo,
  createError,
  updateProviderRating,
};
