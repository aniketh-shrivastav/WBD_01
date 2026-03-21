const ServiceBooking = require("../../models/serviceBooking");

async function getReviews(providerId) {
  const reviews = await ServiceBooking.find({
    providerId,
    rating: { $exists: true },
    review: { $exists: true },
  })
    .populate("customerId", "name profileImage")
    .sort({ createdAt: -1 })
    .lean();

  return reviews.map((review) => ({
    id: review._id,
    customerName: review.customerId?.name || "Unknown",
    customerImage: review.customerId?.profileImage || "",
    rating: review.rating,
    reviewText: review.review || "",
    createdAt: review.createdAt,
  }));
}

module.exports = {
  getReviews,
};
