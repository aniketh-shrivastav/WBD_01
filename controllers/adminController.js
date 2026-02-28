const User = require("../models/User");
const Order = require("../models/Orders");
const ServiceBooking = require("../models/serviceBooking");
const ProductReview = require("../models/ProductReview");

const MONTH_HISTORY = 6;

function buildMonthBuckets(count = MONTH_HISTORY) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (count - 1), 1);
  const buckets = [];
  for (let i = 0; i < count; i += 1) {
    const current = new Date(start.getFullYear(), start.getMonth() + i, 1);
    buckets.push({
      year: current.getFullYear(),
      month: current.getMonth() + 1,
      label: current.toLocaleString("default", { month: "short" }),
    });
  }
  return { buckets, startDate: start };
}

function monthKey(year, month) {
  return `${year}-${month}`;
}

async function collectAdminDashboardStats() {
  const roles = ["customer", "service-provider", "seller", "manager", "admin"];
  const { buckets: monthBuckets, startDate } = buildMonthBuckets();

  const [
    totalUsers,
    userCountsAgg,
    latestUsers,
    productMonthlyAgg,
    serviceMonthlyAgg,
    productLossMonthlyAgg,
    serviceLossMonthlyAgg,
    productTotalsAgg,
    serviceTotalsAgg,
    productLossTotalsAgg,
    serviceLossTotalsAgg,
    productRatingAgg,
    serviceRatingAgg,
    latestProductReviews,
    latestServiceReviews,
    baseUserCountsAgg,
    monthlyUserGrowthAgg,
    bestSellerAgg,
    bestProviderAgg,
    repeatOrdersAgg,
    repeatOrdersCountAgg,
    mostOrderedProductAgg,
    topServicesAgg,
  ] = await Promise.all([
    User.countDocuments({ suspended: { $ne: true } }),
    User.aggregate([
      { $match: { suspended: { $ne: true } } },
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]),
    User.find({}, "name email role createdAt suspended")
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),
    Order.aggregate([
      { $match: { placedAt: { $gte: startDate } } },
      { $unwind: "$items" },
      { $match: { "items.itemStatus": "delivered" } },
      {
        $group: {
          _id: {
            year: { $year: "$placedAt" },
            month: { $month: "$placedAt" },
          },
          totalRevenue: {
            $sum: { $multiply: ["$items.price", "$items.quantity"] },
          },
          totalUnits: { $sum: "$items.quantity" },
        },
      },
    ]),
    ServiceBooking.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $in: ["Ready", "Completed"] },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          totalRevenue: { $sum: "$totalCost" },
          totalBookings: { $sum: 1 },
        },
      },
    ]),
    Order.aggregate([
      { $match: { placedAt: { $gte: startDate } } },
      { $unwind: "$items" },
      { $match: { "items.itemStatus": "cancelled" } },
      {
        $group: {
          _id: {
            year: { $year: "$placedAt" },
            month: { $month: "$placedAt" },
          },
          totalLoss: {
            $sum: { $multiply: ["$items.price", "$items.quantity"] },
          },
        },
      },
    ]),
    ServiceBooking.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: "Rejected",
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          totalLoss: { $sum: "$totalCost" },
        },
      },
    ]),
    Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.itemStatus": "delivered" } },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: { $multiply: ["$items.price", "$items.quantity"] },
          },
          totalUnits: { $sum: "$items.quantity" },
        },
      },
    ]),
    ServiceBooking.aggregate([
      { $match: { status: { $in: ["Ready", "Completed"] } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalCost" },
          totalBookings: { $sum: 1 },
        },
      },
    ]),
    Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.itemStatus": "cancelled" } },
      {
        $group: {
          _id: null,
          totalLoss: {
            $sum: { $multiply: ["$items.price", "$items.quantity"] },
          },
        },
      },
    ]),
    ServiceBooking.aggregate([
      { $match: { status: "Rejected" } },
      { $group: { _id: null, totalLoss: { $sum: "$totalCost" } } },
    ]),
    ProductReview.aggregate([
      { $group: { _id: "$rating", count: { $sum: 1 } } },
    ]),
    ServiceBooking.aggregate([
      { $match: { rating: { $gte: 1 } } },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
    ]),
    ProductReview.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("productId", "name")
      .populate("userId", "name email")
      .populate("seller", "name")
      .lean(),
    ServiceBooking.find({ rating: { $gte: 1 }, review: { $ne: "" } })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("providerId", "name")
      .populate("customerId", "name")
      .lean(),
    User.aggregate([
      {
        $match: {
          createdAt: { $lt: startDate },
          suspended: { $ne: true },
        },
      },
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]),
    User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          suspended: { $ne: true },
        },
      },
      {
        $group: {
          _id: {
            role: "$role",
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
    ]),
    // Best Seller aggregation
    Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.itemStatus": "delivered" } },
      {
        $group: {
          _id: "$items.seller",
          revenue: {
            $sum: { $multiply: ["$items.price", "$items.quantity"] },
          },
          units: { $sum: "$items.quantity" },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 1 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "seller",
        },
      },
      { $unwind: { path: "$seller", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          revenue: 1,
          units: 1,
          name: "$seller.name",
          email: "$seller.email",
        },
      },
    ]),
    // Best Service Provider aggregation
    ServiceBooking.aggregate([
      { $match: { status: { $in: ["Ready", "Completed"] } } },
      {
        $group: {
          _id: "$providerId",
          revenue: { $sum: "$totalCost" },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 1 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "provider",
        },
      },
      { $unwind: { path: "$provider", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          revenue: 1,
          bookings: 1,
          name: "$provider.name",
          workshopName: "$provider.workshopName",
          email: "$provider.email",
        },
      },
    ]),
    // Repeat orders top customers
    Order.aggregate([
      { $group: { _id: "$userId", orders: { $sum: 1 } } },
      { $match: { orders: { $gte: 2 } } },
      { $sort: { orders: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          orders: 1,
          name: "$user.name",
          email: "$user.email",
        },
      },
    ]),
    // Repeat orders count
    Order.aggregate([
      { $group: { _id: "$userId", orders: { $sum: 1 } } },
      { $match: { orders: { $gte: 2 } } },
      { $count: "count" },
    ]),
    // Most ordered product
    Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: { productId: "$items.productId", name: "$items.name" },
          quantity: { $sum: "$items.quantity" },
          revenue: {
            $sum: { $multiply: ["$items.price", "$items.quantity"] },
          },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: 1 },
    ]),
    // Top services
    ServiceBooking.aggregate([
      { $unwind: "$selectedServices" },
      { $group: { _id: "$selectedServices", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
  ]);

  const userDistribution = userCountsAgg.reduce(
    (acc, entry) => ((acc[entry._id] = entry.count), acc),
    {},
  );
  const userCounts = roles.map((role) => userDistribution[role] || 0);

  const productTotals = productTotalsAgg[0] || {};
  const serviceTotals = serviceTotalsAgg[0] || {};
  const productLossTotals = productLossTotalsAgg[0] || {};
  const serviceLossTotals = serviceLossTotalsAgg[0] || {};

  const totalProductRevenue = productTotals.totalRevenue || 0;
  const totalServiceRevenue = serviceTotals.totalRevenue || 0;
  const totalRevenue = totalProductRevenue + totalServiceRevenue;
  const totalProductSales = productTotals.totalUnits || 0;
  const totalServiceSales = serviceTotals.totalBookings || 0;
  const totalLoss =
    (productLossTotals.totalLoss || 0) + (serviceLossTotals.totalLoss || 0);
  const netProfit = totalRevenue - totalLoss;

  const productMonthly = new Map(
    (productMonthlyAgg || []).map((entry) => [
      monthKey(entry._id.year, entry._id.month),
      entry,
    ]),
  );
  const serviceMonthly = new Map(
    (serviceMonthlyAgg || []).map((entry) => [
      monthKey(entry._id.year, entry._id.month),
      entry,
    ]),
  );
  const productLossMonthly = new Map(
    (productLossMonthlyAgg || []).map((entry) => [
      monthKey(entry._id.year, entry._id.month),
      entry,
    ]),
  );
  const serviceLossMonthly = new Map(
    (serviceLossMonthlyAgg || []).map((entry) => [
      monthKey(entry._id.year, entry._id.month),
      entry,
    ]),
  );

  const monthlyRevenue = {
    labels: monthBuckets.map((bucket) => bucket.label),
    productRevenue: [],
    serviceRevenue: [],
    totalRevenue: [],
  };
  const monthlySales = {
    labels: monthBuckets.map((bucket) => bucket.label),
    productSales: [],
    serviceSales: [],
  };
  const monthlyProfitLoss = {
    labels: monthBuckets.map((bucket) => bucket.label),
    profit: [],
    loss: [],
  };

  monthBuckets.forEach((bucket) => {
    const key = monthKey(bucket.year, bucket.month);
    const productEntry = productMonthly.get(key) || {};
    const serviceEntry = serviceMonthly.get(key) || {};
    const productLossEntry = productLossMonthly.get(key) || {};
    const serviceLossEntry = serviceLossMonthly.get(key) || {};

    const productRevenue = productEntry.totalRevenue || 0;
    const serviceRevenue = serviceEntry.totalRevenue || 0;
    const totalMonthRevenue = productRevenue + serviceRevenue;
    const productSales = productEntry.totalUnits || 0;
    const serviceSales = serviceEntry.totalBookings || 0;
    const loss =
      (productLossEntry.totalLoss || 0) + (serviceLossEntry.totalLoss || 0);
    const net = totalMonthRevenue - loss;

    monthlyRevenue.productRevenue.push(productRevenue);
    monthlyRevenue.serviceRevenue.push(serviceRevenue);
    monthlyRevenue.totalRevenue.push(totalMonthRevenue);
    monthlySales.productSales.push(productSales);
    monthlySales.serviceSales.push(serviceSales);
    monthlyProfitLoss.profit.push(net > 0 ? net : 0);
    monthlyProfitLoss.loss.push(net < 0 ? Math.abs(net) : loss);
  });

  const baseUserCounts = roles.reduce((acc, role) => {
    acc[role] = 0;
    return acc;
  }, {});
  baseUserCountsAgg.forEach((entry) => {
    baseUserCounts[entry._id] = entry.count;
  });

  const growthByMonth = {};
  monthlyUserGrowthAgg.forEach(({ _id, count }) => {
    if (!_id) return;
    const key = monthKey(_id.year, _id.month);
    if (!growthByMonth[key]) {
      growthByMonth[key] = roles.reduce((acc, role) => {
        acc[role] = 0;
        return acc;
      }, {});
    }
    growthByMonth[key][_id.role] = count;
  });

  const runningTotals = { ...baseUserCounts };
  const userGrowth = {
    labels: monthBuckets.map((b) => b.label),
    totalUsers: [],
    customers: [],
    serviceProviders: [],
    sellers: [],
  };

  monthBuckets.forEach((bucket) => {
    const key = monthKey(bucket.year, bucket.month);
    const additions = growthByMonth[key] || {};
    roles.forEach((role) => {
      runningTotals[role] = (runningTotals[role] || 0) + (additions[role] || 0);
    });
    const totalForMonth = roles.reduce(
      (sum, role) => sum + (runningTotals[role] || 0),
      0,
    );
    userGrowth.totalUsers.push(totalForMonth);
    userGrowth.customers.push(runningTotals.customer || 0);
    userGrowth.serviceProviders.push(runningTotals["service-provider"] || 0);
    userGrowth.sellers.push(runningTotals.seller || 0);
  });

  const ratingLabels = [1, 2, 3, 4, 5];
  const productRatingMap = new Map(
    (productRatingAgg || []).map((r) => [Number(r._id), r.count]),
  );
  const serviceRatingMap = new Map(
    (serviceRatingAgg || []).map((r) => [Number(r._id), r.count]),
  );
  const ratingDistribution = {
    labels: ratingLabels.map((r) => `${r}★`),
    productRatings: ratingLabels.map((r) => productRatingMap.get(r) || 0),
    serviceRatings: ratingLabels.map((r) => serviceRatingMap.get(r) || 0),
  };

  const totalProductReviews = ratingDistribution.productRatings.reduce(
    (sum, val) => sum + val,
    0,
  );
  const totalServiceReviews = ratingDistribution.serviceRatings.reduce(
    (sum, val) => sum + val,
    0,
  );

  // Process highlights data
  const bestSeller = Array.isArray(bestSellerAgg) ? bestSellerAgg[0] : null;
  const bestProvider = Array.isArray(bestProviderAgg)
    ? bestProviderAgg[0]
    : null;
  const repeatCount = repeatOrdersCountAgg?.[0]?.count || 0;
  const mostOrderedProduct = Array.isArray(mostOrderedProductAgg)
    ? mostOrderedProductAgg[0]
    : null;
  const topServices = Array.isArray(topServicesAgg) ? topServicesAgg : [];

  return {
    totals: {
      totalUsers,
      totalRevenue,
      totalProductRevenue,
      totalServiceRevenue,
      totalProductSales,
      totalServiceSales,
      totalLoss,
      netProfit,
      totalReviews: totalProductReviews + totalServiceReviews,
      totalProductReviews,
      totalServiceReviews,
    },
    highlights: {
      bestSeller,
      bestProvider,
      repeatOrders: {
        count: repeatCount,
        topCustomers: repeatOrdersAgg || [],
      },
      mostOrderedProduct,
      topServices,
    },
    users: {
      recent: latestUsers || [],
    },
    reviews: {
      product: latestProductReviews || [],
      service: latestServiceReviews || [],
    },
    charts: {
      userDistribution: {
        labels: [
          "Customers",
          "Service Providers",
          "Sellers",
          "Managers",
          "Admins",
        ],
        counts: userCounts,
      },
      monthlyRevenue,
      monthlySales,
      monthlyProfitLoss,
      userGrowth,
      ratingDistribution,
    },
  };
}

exports.getDashboard = async (req, res) => {
  try {
    const stats = await collectAdminDashboardStats();
    res.json(stats);
  } catch (err) {
    console.error("Admin dashboard API error", err);
    res.status(500).json({ error: "Failed to load admin dashboard data" });
  }
};

// Export helper functions for testing or reuse
exports.buildMonthBuckets = buildMonthBuckets;
exports.monthKey = monthKey;
exports.collectAdminDashboardStats = collectAdminDashboardStats;
