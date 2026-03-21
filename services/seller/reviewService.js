const ProductReview = require("../../models/ProductReview");

async function getReviewsData(sellerId) {
  const reviews = await ProductReview.find({ seller: sellerId })
    .populate("productId", "name image")
    .populate("userId", "name")
    .sort({ createdAt: -1 })
    .lean();

  const summaryMap = new Map();
  reviews.forEach((review) => {
    const productId = String(review.productId?._id || review.productId);
    const existing = summaryMap.get(productId) || {
      productId,
      productName: review.productId?.name || "Unknown",
      productImage: review.productId?.image || "",
      totalReviews: 0,
      totalRating: 0,
    };

    existing.totalReviews += 1;
    existing.totalRating += Number(review.rating || 0);
    summaryMap.set(productId, existing);
  });

  const summaries = Array.from(summaryMap.values()).map((summary) => ({
    productId: summary.productId,
    productName: summary.productName,
    productImage: summary.productImage,
    totalReviews: summary.totalReviews,
    avgRating:
      summary.totalReviews > 0
        ? Number((summary.totalRating / summary.totalReviews).toFixed(1))
        : 0,
  }));

  return { reviews, summaries };
}

module.exports = {
  getReviewsData,
};
