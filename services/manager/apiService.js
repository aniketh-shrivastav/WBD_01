const User = require("../../models/User");
const CustomerProfile = require("../../models/CustomerProfile");
const SellerProfile = require("../../models/sellerProfile");
const ServiceBooking = require("../../models/serviceBooking");
const Order = require("../../models/Orders");
const Product = require("../../models/Product");
const ContactMessage = require("../../models/ContactMessage");
const PDFDocument = require("pdfkit");
const { getDisplayOrderId } = require("../../utils/orderIdUtils");
const { buildMonthBuckets, monthKey } = require("./common");

async function collectDashboardStats() {
  const roles = ["customer", "service-provider", "seller", "manager"];
  const { buckets: monthBuckets, startDate } = buildMonthBuckets();

  const [
    totalUsers,
    userCountsAgg,
    pendingProducts,
    approvedProducts,
    rejectedProducts,
    orderEarningsResult,
    serviceEarningsResult,
    orderRevenueAgg,
    serviceRevenueAgg,
    baseUserCountsAgg,
    monthlyUserGrowthAgg,
    bestSellerAgg,
    bestProviderAgg,
    repeatOrdersAgg,
    repeatOrdersCountAgg,
    mostOrderedProductAgg,
    topServicesAgg,
    productsByCategoryAgg,
    orderRevenueByCategoryAgg,
    productsByCategoryMonthlyAgg,
    bookingsByServiceCategoryAgg,
    serviceRevenueByCategoryAgg,
    serviceBookingsByCategoryMonthlyAgg,
  ] = await Promise.all([
    User.countDocuments({ suspended: { $ne: true } }),
    User.aggregate([
      { $match: { suspended: { $ne: true } } },
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]),
    Product.find({ status: "pending" }).populate("seller", "name"),
    Product.find({ status: "approved" }).populate("seller", "name"),
    Product.find({ status: "rejected" }).populate("seller", "name"),
    Order.aggregate([
      { $match: { orderStatus: "pending" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]),
    ServiceBooking.aggregate([
      { $match: { status: "Ready" } },
      { $group: { _id: null, total: { $sum: "$totalCost" } } },
    ]),
    Order.aggregate([
      { $match: { orderStatus: "pending", placedAt: { $gte: startDate } } },
      {
        $group: {
          _id: { year: { $year: "$placedAt" }, month: { $month: "$placedAt" } },
          total: { $sum: "$totalAmount" },
        },
      },
    ]),
    ServiceBooking.aggregate([
      { $match: { status: "Ready", createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          total: { $sum: "$totalCost" },
        },
      },
    ]),
    User.aggregate([
      { $match: { createdAt: { $lt: startDate }, suspended: { $ne: true } } },
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]),
    User.aggregate([
      { $match: { createdAt: { $gte: startDate }, suspended: { $ne: true } } },
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
    Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.itemStatus": "delivered" } },
      {
        $group: {
          _id: "$items.seller",
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
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
    Order.aggregate([
      { $group: { _id: "$userId", orders: { $sum: 1 } } },
      { $match: { orders: { $gte: 2 } } },
      { $count: "count" },
    ]),
    Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: { productId: "$items.productId", name: "$items.name" },
          quantity: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: 1 },
    ]),
    ServiceBooking.aggregate([
      { $unwind: "$selectedServices" },
      { $group: { _id: "$selectedServices", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]),
    Product.aggregate([
      { $match: { status: "approved" } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Order.aggregate([
      { $unwind: "$items" },
      { $match: { "items.itemStatus": { $ne: "cancelled" } } },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ["$product.category", "Unknown"] },
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          orders: { $sum: "$items.quantity" },
        },
      },
      { $sort: { revenue: -1 } },
    ]),
    Order.aggregate([
      { $match: { placedAt: { $gte: startDate } } },
      { $unwind: "$items" },
      { $match: { "items.itemStatus": { $ne: "cancelled" } } },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            category: { $ifNull: ["$product.category", "Unknown"] },
            year: { $year: "$placedAt" },
            month: { $month: "$placedAt" },
          },
          count: { $sum: "$items.quantity" },
        },
      },
      { $sort: { count: -1 } },
    ]),
    ServiceBooking.aggregate([
      { $unwind: "$selectedServices" },
      { $group: { _id: "$selectedServices", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    ServiceBooking.aggregate([
      { $match: { status: { $in: ["Ready", "Completed"] } } },
      { $unwind: "$selectedServices" },
      {
        $group: {
          _id: "$selectedServices",
          revenue: { $sum: "$totalCost" },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
    ]),
    ServiceBooking.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $unwind: "$selectedServices" },
      {
        $group: {
          _id: {
            service: "$selectedServices",
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]),
  ]);

  const userDistribution = userCountsAgg.reduce(
    (acc, curr) => ((acc[curr._id] = curr.count), acc),
    {},
  );
  const userCounts = roles.map((role) => userDistribution[role] || 0);

  const orderEarnings = orderEarningsResult[0]?.total || 0;
  const serviceEarnings = serviceEarningsResult[0]?.total || 0;
  const totalEarnings = orderEarnings + serviceEarnings;
  const commission = totalEarnings * 0.2;

  const revenueByMonth = {};
  [...orderRevenueAgg, ...serviceRevenueAgg].forEach(({ _id, total }) => {
    if (!_id) return;
    const key = monthKey(_id.year, _id.month);
    revenueByMonth[key] = (revenueByMonth[key] || 0) + total;
  });

  const monthlyRevenue = {
    labels: monthBuckets.map((bucket) => bucket.label),
    totalRevenue: [],
    commission: [],
  };

  monthBuckets.forEach((bucket) => {
    const key = monthKey(bucket.year, bucket.month);
    const revenue = revenueByMonth[key] || 0;
    monthlyRevenue.totalRevenue.push(revenue);
    monthlyRevenue.commission.push(revenue * 0.2);
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
    labels: monthBuckets.map((bucket) => bucket.label),
    totalUsers: [],
    serviceProviders: [],
    sellers: [],
  };

  monthBuckets.forEach((bucket) => {
    const key = monthKey(bucket.year, bucket.month);
    const additions = growthByMonth[key] || {};

    roles.forEach((role) => {
      runningTotals[role] = (runningTotals[role] || 0) + (additions[role] || 0);
    });

    userGrowth.totalUsers.push(
      roles.reduce((sum, role) => sum + (runningTotals[role] || 0), 0),
    );
    userGrowth.serviceProviders.push(runningTotals["service-provider"] || 0);
    userGrowth.sellers.push(runningTotals.seller || 0);
  });

  const productCategoryDistribution = {
    labels: (productsByCategoryAgg || []).map(
      (category) => category._id || "Unknown",
    ),
    data: (productsByCategoryAgg || []).map((category) => category.count),
  };

  const productCategoryRevenue = {
    labels: (orderRevenueByCategoryAgg || []).map(
      (category) => category._id || "Unknown",
    ),
    revenue: (orderRevenueByCategoryAgg || []).map(
      (category) => category.revenue,
    ),
    orders: (orderRevenueByCategoryAgg || []).map(
      (category) => category.orders,
    ),
  };

  const topProductCats = (orderRevenueByCategoryAgg || [])
    .slice(0, 5)
    .map((category) => category._id || "Unknown");

  const productCategoryMonthly = {
    labels: monthBuckets.map((bucket) => bucket.label),
    datasets: topProductCats.map((cat) => {
      const series = monthBuckets.map((bucket) => {
        const key = monthKey(bucket.year, bucket.month);
        const match = (productsByCategoryMonthlyAgg || []).find(
          (row) =>
            (row._id?.category || "Unknown") === cat &&
            monthKey(row._id.year, row._id.month) === key,
        );
        return match ? match.count : 0;
      });
      return { label: cat, data: series };
    }),
  };

  const serviceCategoryDistribution = {
    labels: (bookingsByServiceCategoryAgg || []).map(
      (category) => category._id || "Unknown",
    ),
    data: (bookingsByServiceCategoryAgg || []).map(
      (category) => category.count,
    ),
  };

  const serviceCategoryRevenue = {
    labels: (serviceRevenueByCategoryAgg || []).map(
      (category) => category._id || "Unknown",
    ),
    revenue: (serviceRevenueByCategoryAgg || []).map(
      (category) => category.revenue,
    ),
    bookings: (serviceRevenueByCategoryAgg || []).map(
      (category) => category.bookings,
    ),
  };

  const topServiceCats = (bookingsByServiceCategoryAgg || [])
    .slice(0, 5)
    .map((category) => category._id || "Unknown");

  const serviceCategoryMonthly = {
    labels: monthBuckets.map((bucket) => bucket.label),
    datasets: topServiceCats.map((service) => {
      const series = monthBuckets.map((bucket) => {
        const key = monthKey(bucket.year, bucket.month);
        const match = (serviceBookingsByCategoryMonthlyAgg || []).find(
          (row) =>
            (row._id?.service || "Unknown") === service &&
            monthKey(row._id.year, row._id.month) === key,
        );
        return match ? match.count : 0;
      });
      return { label: service, data: series };
    }),
  };

  return {
    totalUsers,
    userCounts,
    pendingProducts,
    approvedProducts,
    rejectedProducts,
    totalEarnings,
    commission,
    highlights: {
      bestSeller: Array.isArray(bestSellerAgg) ? bestSellerAgg[0] : null,
      bestProvider: Array.isArray(bestProviderAgg) ? bestProviderAgg[0] : null,
      repeatOrders: {
        count: repeatOrdersCountAgg?.[0]?.count || 0,
        topCustomers: repeatOrdersAgg || [],
      },
      mostOrderedProduct: Array.isArray(mostOrderedProductAgg)
        ? mostOrderedProductAgg[0]
        : null,
      topServices: Array.isArray(topServicesAgg) ? topServicesAgg : [],
    },
    charts: {
      monthlyRevenue,
      userGrowth,
      productCategoryDistribution,
      productCategoryRevenue,
      productCategoryMonthly,
      serviceCategoryDistribution,
      serviceCategoryRevenue,
      serviceCategoryMonthly,
    },
  };
}

async function getApiUsers(req, res) {
  try {
    const users = await User.find({}, "name email role suspended");
    const formatted = users.map((user) => ({
      ...user.toObject(),
      status: user.suspended ? "Suspended" : "Active",
      joined: "2024-01-15",
    }));
    res.json({ users: formatted });
  } catch (err) {
    console.error("Users API error", err);
    res.status(500).json({ error: "Failed to load users" });
  }
}

async function getApiServices(req, res) {
  try {
    const serviceProvidersRaw = await User.find(
      { role: "service-provider", suspended: { $ne: true } },
      "name email phone servicesOffered district profilePicture verificationStatus",
    );

    const providerIds = serviceProvidersRaw
      .map((provider) => provider._id)
      .filter(Boolean);
    const ratingAgg = providerIds.length
      ? await ServiceBooking.aggregate([
          { $match: { providerId: { $in: providerIds }, rating: { $gte: 1 } } },
          { $sort: { createdAt: -1 } },
          {
            $group: {
              _id: "$providerId",
              ratingAvg: { $avg: "$rating" },
              ratingCount: { $sum: 1 },
              latestRating: { $first: "$rating" },
              latestReview: { $first: "$review" },
              latestRatedAt: { $first: "$createdAt" },
            },
          },
        ])
      : [];

    const statsByProviderId = new Map(
      (ratingAgg || []).map((row) => [String(row._id), row]),
    );

    const serviceProviders = serviceProvidersRaw.map((provider) => {
      const stats = statsByProviderId.get(String(provider._id));
      return {
        ...provider.toObject(),
        ratingAvg:
          typeof stats?.ratingAvg === "number" ? Number(stats.ratingAvg) : null,
        ratingCount:
          typeof stats?.ratingCount === "number" ? stats.ratingCount : 0,
        latestRating:
          typeof stats?.latestRating === "number" ? stats.latestRating : null,
        latestReview:
          typeof stats?.latestReview === "string" ? stats.latestReview : "",
        latestRatedAt: stats?.latestRatedAt || null,
      };
    });

    const sellersAll = await SellerProfile.find().populate(
      "sellerId",
      "name email phone profilePicture suspended verificationStatus verificationDocuments verifiedAt verificationNote",
    );
    const sellers = sellersAll.filter(
      (seller) => seller.sellerId && !seller.sellerId.suspended,
    );

    const customersAll = await CustomerProfile.find().populate(
      "userId",
      "name email phone profilePicture suspended",
    );
    const customers = customersAll.filter(
      (customer) => customer.userId && !customer.userId.suspended,
    );

    res.json({ serviceProviders, sellers, customers });
  } catch (err) {
    console.error("Services API error", err);
    res.status(500).json({ error: "Failed to load profiles" });
  }
}

async function getApiOrders(req, res) {
  try {
    const bookingsRaw = await ServiceBooking.find()
      .populate("customerId")
      .populate("providerId")
      .sort({ createdAt: -1 });

    const bookings = bookingsRaw.filter(
      (booking) =>
        booking.customerId &&
        !booking.customerId.suspended &&
        booking.providerId &&
        !booking.providerId.suspended,
    );

    const ordersRaw = await Order.find()
      .populate("userId")
      .populate("items.seller")
      .sort({ placedAt: -1 });

    const orders = ordersRaw
      .filter(
        (order) =>
          order.userId &&
          !order.userId.suspended &&
          order.items.every((item) => item.seller && !item.seller.suspended),
      )
      .map((order) => {
        const itemStatuses = (order.items || []).map(
          (item) => item.itemStatus || order.orderStatus || "pending",
        );

        const allCancelled =
          itemStatuses.length > 0 &&
          itemStatuses.every((status) => status === "cancelled");
        const allDelivered =
          itemStatuses.length > 0 &&
          itemStatuses.every((status) => status === "delivered");
        const anyCancelled = itemStatuses.some(
          (status) => status === "cancelled",
        );
        const anyDelivered = itemStatuses.some(
          (status) => status === "delivered",
        );

        let computedStatus = order.orderStatus || "pending";
        if (allCancelled) computedStatus = "cancelled";
        else if (allDelivered) computedStatus = "delivered";
        else if (anyCancelled || anyDelivered) computedStatus = "partial";

        return {
          ...order.toObject(),
          orderId: getDisplayOrderId(order),
          computedStatus,
        };
      });

    res.json({ orders, bookings });
  } catch (err) {
    console.error("Orders API error", err);
    res.status(500).json({ error: "Failed to load orders/bookings" });
  }
}

async function getApiPayments(req, res) {
  try {
    const serviceOrdersRaw = await ServiceBooking.find({ status: "Ready" })
      .populate("customerId", "name suspended")
      .populate("providerId", "name suspended")
      .sort({ date: -1 });

    const serviceOrders = serviceOrdersRaw.filter(
      (serviceOrder) =>
        serviceOrder.customerId &&
        !serviceOrder.customerId.suspended &&
        serviceOrder.providerId &&
        !serviceOrder.providerId.suspended,
    );

    const ordersRaw = await Order.find()
      .populate("userId", "name suspended")
      .populate("items.seller", "name suspended")
      .sort({ placedAt: -1 });

    const orders = ordersRaw.filter(
      (order) =>
        order.userId &&
        !order.userId.suspended &&
        order.items.every((item) => item.seller && !item.seller.suspended),
    );

    res.json({ orders, serviceOrders });
  } catch (err) {
    console.error("Payments API error", err);
    res.status(500).json({ error: "Failed to load payments data" });
  }
}

async function getApiSupport(req, res) {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.json({ submissions: messages });
  } catch (err) {
    console.error("Support API error", err);
    res.status(500).json({ error: "Failed to load support tickets" });
  }
}

async function getApiDashboard(req, res) {
  try {
    const stats = await collectDashboardStats();
    res.json(stats);
  } catch (err) {
    console.error("Dashboard API error", err);
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
}

async function getApiDashboardReport(req, res) {
  try {
    const stats = await collectDashboardStats();
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=manager-dashboard-${Date.now()}.pdf`,
    );
    doc.pipe(res);

    const currency = (val) => `Rs ${Number(val || 0).toLocaleString("en-IN")}`;
    const pageWidth = doc.page.width - 80;

    function drawTable(headers, rows, options = {}) {
      const {
        colWidths = [],
        startX = 40,
        headerBg = "#1e3a5f",
        headerColor = "#ffffff",
        rowBg = "#f8fafc",
        altRowBg = "#e2e8f0",
      } = options;

      let y = doc.y;
      const rowHeight = 25;
      const cellPadding = 8;
      const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);

      doc.fillColor(headerBg).rect(startX, y, tableWidth, rowHeight).fill();
      doc.fillColor(headerColor).font("Helvetica-Bold").fontSize(10);

      let x = startX;
      headers.forEach((header, i) => {
        doc.text(header, x + cellPadding, y + 7, {
          width: colWidths[i] - cellPadding * 2,
        });
        x += colWidths[i];
      });

      y += rowHeight;

      doc.font("Helvetica").fontSize(10);
      rows.forEach((row, rowIndex) => {
        const bg = rowIndex % 2 === 0 ? rowBg : altRowBg;
        doc.fillColor(bg).rect(startX, y, tableWidth, rowHeight).fill();
        doc.fillColor("#1f2937");
        x = startX;

        row.forEach((cell, i) => {
          doc.text(String(cell), x + cellPadding, y + 7, {
            width: colWidths[i] - cellPadding * 2,
          });
          x += colWidths[i];
        });

        y += rowHeight;
      });

      doc.strokeColor("#cbd5e1").lineWidth(1);
      doc
        .rect(
          startX,
          doc.y - rows.length * rowHeight - rowHeight,
          tableWidth,
          (rows.length + 1) * rowHeight,
        )
        .stroke();
      doc.y = y + 10;
    }

    doc
      .fillColor("#1e3a5f")
      .fontSize(24)
      .font("Helvetica-Bold")
      .text("Manager Dashboard Report", { align: "center" });
    doc.moveDown(0.3);
    doc
      .fillColor("#6b7280")
      .fontSize(11)
      .font("Helvetica")
      .text(`Generated on ${new Date().toLocaleString()}`, { align: "center" });
    doc.moveDown(1.5);

    doc
      .fillColor("#1e3a5f")
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("Summary Overview");
    doc.moveDown(0.5);
    const summaryColWidths = [pageWidth * 0.5, pageWidth * 0.5];
    drawTable(
      ["Metric", "Value"],
      [
        ["Total Users", stats.totalUsers],
        ["Total Earnings", currency(stats.totalEarnings)],
        ["Commission (20%)", currency(stats.commission)],
        ["Pending Products", stats.pendingProducts.length],
        ["Approved Products", stats.approvedProducts.length],
        ["Rejected Products", stats.rejectedProducts.length],
      ],
      { colWidths: summaryColWidths },
    );
    doc.moveDown(0.5);

    doc
      .fillColor("#1e3a5f")
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("User Distribution");
    doc.moveDown(0.5);
    const roleLabels = [
      { label: "Customers", idx: 0 },
      { label: "Service Providers", idx: 1 },
      { label: "Sellers", idx: 2 },
      { label: "Managers", idx: 3 },
    ];
    drawTable(
      ["User Type", "Count"],
      roleLabels.map((role) => [role.label, stats.userCounts[role.idx] || 0]),
      { colWidths: summaryColWidths },
    );
    doc.moveDown(0.5);

    const revenueChart = stats?.charts?.monthlyRevenue;
    if (revenueChart && revenueChart.labels && revenueChart.labels.length > 0) {
      doc
        .fillColor("#1e3a5f")
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("Monthly Revenue & Commission");
      doc.moveDown(0.5);

      const revenueColWidths = [
        pageWidth * 0.34,
        pageWidth * 0.33,
        pageWidth * 0.33,
      ];

      const revenueRows = revenueChart.labels.map((label, idx) => [
        label,
        currency(revenueChart.totalRevenue[idx] || 0),
        currency(revenueChart.commission[idx] || 0),
      ]);

      drawTable(["Month", "Revenue", "Commission"], revenueRows, {
        colWidths: revenueColWidths,
      });
      doc.moveDown(0.5);
    }

    const userGrowthChart = stats?.charts?.userGrowth;
    if (
      userGrowthChart &&
      userGrowthChart.labels &&
      userGrowthChart.labels.length > 0
    ) {
      if (doc.y > doc.page.height - 200) doc.addPage();
      doc
        .fillColor("#1e3a5f")
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("User Growth");
      doc.moveDown(0.5);

      const growthColWidths = [
        pageWidth * 0.25,
        pageWidth * 0.25,
        pageWidth * 0.25,
        pageWidth * 0.25,
      ];

      const growthRows = userGrowthChart.labels.map((label, idx) => [
        label,
        userGrowthChart.totalUsers[idx] || 0,
        userGrowthChart.serviceProviders[idx] || 0,
        userGrowthChart.sellers[idx] || 0,
      ]);

      drawTable(
        ["Month", "Total Users", "Service Providers", "Sellers"],
        growthRows,
        { colWidths: growthColWidths },
      );
    }

    doc
      .fillColor("#6b7280")
      .fontSize(10)
      .text("AutoCustomizer (c) 2025", 40, doc.page.height - 50, {
        align: "center",
      });

    doc.end();
  } catch (err) {
    console.error("Dashboard report error", err);
    res.status(500).json({ error: "Failed to generate report" });
  }
}

module.exports = {
  getApiUsers,
  getApiServices,
  getApiOrders,
  getApiPayments,
  getApiSupport,
  getApiDashboard,
  getApiDashboardReport,
};
