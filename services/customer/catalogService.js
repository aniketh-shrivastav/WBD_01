const Product = require("../../models/Product");
const ProductReview = require("../../models/ProductReview");
const Order = require("../../models/Orders");
const { createError } = require("./helpers");

async function getIndexData() {
  const products = await Product.find({ status: "approved" });
  return { products };
}

async function getIndexApiData() {
  const products = await Product.find({ status: "approved" }).populate(
    "seller",
    "verificationStatus",
  );

  products.sort((a, b) => {
    const aVerified = a.seller?.verificationStatus === "verified" ? 0 : 1;
    const bVerified = b.seller?.verificationStatus === "verified" ? 0 : 1;
    return aVerified - bVerified;
  });

  return { products };
}

async function getProductDetails(productId, userId) {
  const product = await Product.findById(productId).populate("seller", "name");

  if (!product || product.status !== "approved") {
    return null;
  }

  const ratingAgg = await ProductReview.aggregate([
    { $match: { productId: product._id } },
    {
      $group: {
        _id: "$productId",
        avgRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const ratingSummary = {
    avgRating: Number(ratingAgg[0]?.avgRating?.toFixed?.(1) || 0),
    totalReviews: ratingAgg[0]?.totalReviews || 0,
  };

  const reviews = await ProductReview.find({ productId: product._id })
    .populate("userId", "name")
    .sort({ createdAt: -1 })
    .lean();

  const reviewsWithVerification = await Promise.all(
    reviews.map(async (review) => {
      const reviewerId = review.userId?._id || review.userId;
      const hasVerifiedPurchase = reviewerId
        ? await Order.exists({
            userId: reviewerId,
            $or: [
              {
                items: {
                  $elemMatch: {
                    productId: product._id,
                    $or: [
                      { itemStatus: "delivered" },
                      { itemStatus: { $exists: false } },
                    ],
                  },
                },
              },
              {
                orderStatus: "delivered",
                "items.productId": product._id,
              },
            ],
          })
        : false;

      return {
        ...review,
        verifiedPurchase: Boolean(hasVerifiedPurchase),
      };
    }),
  );

  const existingReview = userId
    ? await ProductReview.findOne({ productId: product._id, userId }).lean()
    : null;

  const hasPurchased = userId
    ? await Order.exists({
        userId,
        $or: [
          {
            items: {
              $elemMatch: {
                productId: product._id,
                $or: [
                  { itemStatus: "delivered" },
                  { itemStatus: { $exists: false } },
                ],
              },
            },
          },
          {
            orderStatus: "delivered",
            "items.productId": product._id,
          },
        ],
      })
    : false;

  return {
    product,
    ratingSummary,
    reviews: reviewsWithVerification,
    canReview: Boolean(hasPurchased),
    userReview: existingReview || null,
  };
}

async function submitProductReview(productId, userId, rating, review) {
  if (!userId) {
    throw createError(401, "Unauthorized");
  }

  const product = await Product.findById(productId);
  if (!product || product.status !== "approved") {
    throw createError(404, "Product not found");
  }

  const parsedRating = Number(rating);
  if (!parsedRating || parsedRating < 1 || parsedRating > 5) {
    throw createError(400, "Rating must be 1-5");
  }

  const hasPurchased = await Order.exists({
    userId,
    $or: [
      {
        items: {
          $elemMatch: {
            productId,
            $or: [
              { itemStatus: "delivered" },
              { itemStatus: { $exists: false } },
            ],
          },
        },
      },
      { orderStatus: "delivered", "items.productId": productId },
    ],
  });

  if (!hasPurchased) {
    throw createError(403, "You can only review products you have purchased");
  }

  return ProductReview.findOneAndUpdate(
    { productId, userId },
    {
      productId,
      userId,
      seller: product.seller,
      rating: parsedRating,
      review: review || "",
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

module.exports = {
  getIndexData,
  getIndexApiData,
  getProductDetails,
  submitProductReview,
};
