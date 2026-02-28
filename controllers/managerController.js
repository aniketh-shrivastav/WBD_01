const ServiceBooking = require("../models/serviceBooking");
const User = require("../models/User");
const CustomerProfile = require("../models/CustomerProfile");
const SellerProfile = require("../models/sellerProfile");
const Order = require("../models/Orders");
const Product = require("../models/Product");
const ContactMessage = require("../models/ContactMessage");
const bcrypt = require("bcryptjs");
const PDFDocument = require("pdfkit");

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
  ]);

  const userDistribution = userCountsAgg.reduce(
    (a, c) => ((a[c._id] = c.count), a),
    {},
  );
  const userCounts = roles.map((r) => userDistribution[r] || 0);

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
    labels: monthBuckets.map((b) => b.label),
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
    labels: monthBuckets.map((b) => b.label),
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
    userGrowth.sellers.push(runningTotals["seller"] || 0);
  });

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
    charts: { monthlyRevenue, userGrowth },
  };
}

// API: Get all users
exports.getApiUsers = async (req, res) => {
  try {
    const users = await User.find({}, "name email role suspended");
    const formatted = users.map((u) => ({
      ...u.toObject(),
      status: u.suspended ? "Suspended" : "Active",
      joined: "2024-01-15",
    }));
    res.json({ users: formatted });
  } catch (err) {
    console.error("Users API error", err);
    res.status(500).json({ error: "Failed to load users" });
  }
};

// API: Get services/profiles
exports.getApiServices = async (req, res) => {
  try {
    const serviceProvidersRaw = await User.find(
      { role: "service-provider", suspended: { $ne: true } },
      "name email phone servicesOffered district profilePicture",
    );

    const providerIds = serviceProvidersRaw.map((p) => p._id).filter(Boolean);
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
      (ratingAgg || []).map((r) => [String(r._id), r]),
    );

    const serviceProviders = serviceProvidersRaw.map((sp) => {
      const stats = statsByProviderId.get(String(sp._id));
      return {
        ...sp.toObject(),
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
      "name email phone profilePicture suspended",
    );
    const sellers = sellersAll.filter(
      (s) => s.sellerId && !s.sellerId.suspended,
    );

    const customersAll = await CustomerProfile.find().populate(
      "userId",
      "name email phone profilePicture suspended",
    );
    const customers = customersAll.filter(
      (c) => c.userId && !c.userId.suspended,
    );

    res.json({ serviceProviders, sellers, customers });
  } catch (err) {
    console.error("Services API error", err);
    res.status(500).json({ error: "Failed to load profiles" });
  }
};

// API: Get orders and bookings
exports.getApiOrders = async (req, res) => {
  try {
    const bookingsRaw = await ServiceBooking.find()
      .populate("customerId")
      .populate("providerId")
      .sort({ createdAt: -1 });
    const bookings = bookingsRaw.filter(
      (b) =>
        b.customerId &&
        !b.customerId.suspended &&
        b.providerId &&
        !b.providerId.suspended,
    );

    const ordersRaw = await Order.find()
      .populate("userId")
      .populate("items.seller")
      .sort({ placedAt: -1 });
    const orders = ordersRaw
      .filter(
        (o) =>
          o.userId &&
          !o.userId.suspended &&
          o.items.every((it) => it.seller && !it.seller.suspended),
      )
      .map((o) => {
        const itemStatuses = (o.items || []).map(
          (it) => it.itemStatus || o.orderStatus || "pending",
        );
        const allCancelled =
          itemStatuses.length > 0 &&
          itemStatuses.every((s) => s === "cancelled");
        const allDelivered =
          itemStatuses.length > 0 &&
          itemStatuses.every((s) => s === "delivered");
        const anyCancelled = itemStatuses.some((s) => s === "cancelled");
        const anyDelivered = itemStatuses.some((s) => s === "delivered");
        let computedStatus = o.orderStatus || "pending";
        if (allCancelled) computedStatus = "cancelled";
        else if (allDelivered) computedStatus = "delivered";
        else if (anyCancelled || anyDelivered) computedStatus = "partial";
        return { ...o.toObject(), computedStatus };
      });

    res.json({ orders, bookings });
  } catch (err) {
    console.error("Orders API error", err);
    res.status(500).json({ error: "Failed to load orders/bookings" });
  }
};

// API: Get payments
exports.getApiPayments = async (req, res) => {
  try {
    const serviceOrdersRaw = await ServiceBooking.find({ status: "Ready" })
      .populate("customerId", "name suspended")
      .populate("providerId", "name suspended")
      .sort({ date: -1 });
    const serviceOrders = serviceOrdersRaw.filter(
      (s) =>
        s.customerId &&
        !s.customerId.suspended &&
        s.providerId &&
        !s.providerId.suspended,
    );

    const ordersRaw = await Order.find()
      .populate("userId", "name suspended")
      .populate("items.seller", "name suspended")
      .sort({ placedAt: -1 });
    const orders = ordersRaw.filter(
      (o) =>
        o.userId &&
        !o.userId.suspended &&
        o.items.every((it) => it.seller && !it.seller.suspended),
    );

    res.json({ orders, serviceOrders });
  } catch (err) {
    console.error("Payments API error", err);
    res.status(500).json({ error: "Failed to load payments data" });
  }
};

// API: Get support tickets
exports.getApiSupport = async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.json({ submissions: messages });
  } catch (err) {
    console.error("Support API error", err);
    res.status(500).json({ error: "Failed to load support tickets" });
  }
};

// API: Get dashboard data
exports.getApiDashboard = async (req, res) => {
  try {
    const stats = await collectDashboardStats();
    res.json(stats);
  } catch (err) {
    console.error("Dashboard API error", err);
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
};

// API: Generate dashboard PDF report
exports.getApiDashboardReport = async (req, res) => {
  try {
    const stats = await collectDashboardStats();
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=manager-dashboard-${Date.now()}.pdf`,
    );
    doc.pipe(res);

    const currency = (val) => `₹${Number(val || 0).toLocaleString("en-IN")}`;
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
      const tableWidth = colWidths.reduce((sum, w) => sum + w, 0);

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
      .text("AutoCustomizer © 2025", 40, doc.page.height - 50, {
        align: "center",
      });
    doc.end();
  } catch (err) {
    console.error("Dashboard report error", err);
    res.status(500).json({ error: "Failed to generate report" });
  }
};

// Render dashboard page
exports.getDashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ suspended: { $ne: true } });
    const userCounts = await User.aggregate([
      { $match: { suspended: { $ne: true } } },
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]);
    const userDistribution = userCounts.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});
    const roles = ["customer", "service-provider", "seller", "manager"];
    const formattedCounts = roles.map((role) => userDistribution[role] || 0);

    const [pendingProducts, approvedProducts, rejectedProducts] =
      await Promise.all([
        Product.find({ status: "pending" }).populate("seller"),
        Product.find({ status: "approved" }).populate("seller"),
        Product.find({ status: "rejected" }).populate("seller"),
      ]);

    const orderEarningsResult = await Order.aggregate([
      { $match: { orderStatus: "pending" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);
    const orderEarnings = orderEarningsResult[0]?.total || 0;

    const serviceEarningsResult = await ServiceBooking.aggregate([
      { $match: { status: "Ready" } },
      { $group: { _id: null, total: { $sum: "$totalCost" } } },
    ]);
    const serviceEarnings = serviceEarningsResult[0]?.total || 0;

    const totalEarnings = orderEarnings + serviceEarnings;
    const commission = totalEarnings * 0.2;

    res.render("manager/dashboard", {
      totalUsers,
      userCounts: formattedCounts,
      pendingProducts,
      approvedProducts,
      rejectedProducts,
      totalEarnings,
      commission,
    });
  } catch (error) {
    console.error("Error loading dashboard:", error);
    res.status(500).send("Error loading dashboard data.");
  }
};

// Render orders page
exports.getOrders = async (req, res) => {
  try {
    const bookings = (
      await ServiceBooking.find()
        .populate("customerId")
        .populate("providerId")
        .sort({ createdAt: -1 })
    ).filter(
      (b) =>
        b.customerId &&
        !b.customerId.suspended &&
        b.providerId &&
        !b.providerId.suspended,
    );

    const orders = (
      await Order.find()
        .populate("userId")
        .populate("items.seller")
        .sort({ placedAt: -1 })
    ).filter(
      (o) =>
        o.userId &&
        !o.userId.suspended &&
        o.items.every((item) => item.seller && !item.seller.suspended),
    );

    res.render("manager/orders", { bookings, orders });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading bookings and orders");
  }
};

// Render services page
exports.getServices = async (req, res) => {
  try {
    const serviceProviders = await User.find({
      role: "service-provider",
      suspended: { $ne: true },
    });
    const sellers = await SellerProfile.find().populate(
      "sellerId",
      "name email phone suspended",
    );
    const activeSellers = sellers.filter(
      (seller) => seller.sellerId && !seller.sellerId.suspended,
    );
    const customers = await CustomerProfile.find().populate(
      "userId",
      "name email phone suspended",
    );
    const activeCustomers = customers.filter(
      (c) => c.userId && !c.userId.suspended,
    );

    res.render("manager/services", {
      serviceProviders,
      sellers: activeSellers,
      customers: activeCustomers,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching data");
  }
};

// Render users page
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({}, "name email role suspended");
    const formattedDB = users.map((user) => ({
      ...user.toObject(),
      status: user.suspended ? "Suspended" : "Active",
      joined: "2024-01-15",
    }));
    res.render("manager/users", { users: formattedDB });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).send("Database error");
  }
};

// Suspend user
exports.suspendUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    if (user.role === "admin" && req.session.user?.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Admins cannot be suspended" });
    }
    user.suspended = true;
    await user.save();
    res.json({ success: true, message: "User suspended successfully" });
  } catch (error) {
    console.error("Error suspending user:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Restore user
exports.restoreUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    if (user.role === "admin" && req.session.user?.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Admins cannot be restored" });
    }
    user.suspended = false;
    await user.save();
    res.json({ success: true, message: "User restored successfully" });
  } catch (error) {
    console.error("Error restoring user:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Create manager
exports.createManager = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body || {};
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "name, email, password required" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ success: false, message: "Invalid email" });
    if (password.length < 6)
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    if (phone && !/^\d{10}$/.test(String(phone).trim())) {
      return res
        .status(400)
        .json({ success: false, message: "Phone must be 10 digits" });
    }
    const existing = await User.findOne({ email });
    if (existing)
      return res
        .status(409)
        .json({ success: false, message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      role: "manager",
    });
    await newUser.save();

    const safeUser = {
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      suspended: newUser.suspended,
    };
    return res.json({ success: true, user: safeUser });
  } catch (error) {
    console.error("Create manager error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error creating manager" });
  }
};

// Cancel booking
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await ServiceBooking.findById(req.params.id);
    if (!booking) {
      return req.accepts("json")
        ? res.status(404).json({ success: false, message: "Booking not found" })
        : res.status(404).send("Booking not found");
    }
    booking.previousStatus = booking.status;
    booking.status = "Rejected";
    await booking.save();
    if (req.accepts("json")) return res.json({ success: true, booking });
    res.redirect("/manager/orders");
  } catch (err) {
    console.error(err);
    if (req.accepts("json"))
      return res
        .status(500)
        .json({ success: false, message: "Error cancelling booking" });
    res.status(500).send("Error cancelling booking");
  }
};

// Restore booking
exports.restoreBooking = async (req, res) => {
  try {
    const booking = await ServiceBooking.findById(req.params.id);
    if (!booking) {
      return req.accepts("json")
        ? res.status(404).json({ success: false, message: "Booking not found" })
        : res.status(404).send("Booking not found");
    }
    booking.status = booking.previousStatus || "Open";
    booking.previousStatus = undefined;
    await booking.save();
    if (req.accepts("json")) return res.json({ success: true, booking });
    res.redirect("/manager/orders");
  } catch (err) {
    console.error(err);
    if (req.accepts("json"))
      return res
        .status(500)
        .json({ success: false, message: "Error restoring booking" });
    res.status(500).send("Error restoring booking");
  }
};

// Approve product
exports.approveProduct = async (req, res) => {
  try {
    const wantsJson =
      (req.headers.accept || "").includes("application/json") ||
      req.xhr === true;
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true },
    );
    if (!product) {
      if (wantsJson)
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      return res.status(404).send("Product not found");
    }
    if (wantsJson) return res.json({ success: true, product });
    if (req.query.from === "static")
      return res.redirect("/manager/dashboard.html");
    res.redirect("/manager/dashboard");
  } catch (err) {
    console.error(err);
    const wantsJson =
      (req.headers.accept || "").includes("application/json") ||
      req.xhr === true;
    if (wantsJson)
      return res
        .status(500)
        .json({ success: false, message: "Error approving product" });
    res.status(500).send("Error approving product");
  }
};

// Reject product
exports.rejectProduct = async (req, res) => {
  try {
    const wantsJson =
      (req.headers.accept || "").includes("application/json") ||
      req.xhr === true;
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true },
    );
    if (!product) {
      if (wantsJson)
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      return res.status(404).send("Product not found");
    }
    if (wantsJson) return res.json({ success: true, product });
    if (req.query.from === "static")
      return res.redirect("/manager/dashboard.html");
    res.redirect("/manager/dashboard");
  } catch (err) {
    console.error(err);
    const wantsJson =
      (req.headers.accept || "").includes("application/json") ||
      req.xhr === true;
    if (wantsJson)
      return res
        .status(500)
        .json({ success: false, message: "Error rejecting product" });
    res.status(500).send("Error rejecting product");
  }
};

// Edit product
exports.editProduct = async (req, res) => {
  try {
    const wantsJson =
      (req.headers.accept || "").includes("application/json") ||
      req.xhr === true;
    const {
      name,
      price,
      description,
      category,
      brand,
      quantity,
      compatibility,
    } = req.body;

    if (
      !name ||
      price === undefined ||
      !description ||
      !category ||
      !brand ||
      quantity === undefined
    ) {
      if (wantsJson)
        return res
          .status(400)
          .json({ success: false, message: "Missing required fields" });
      return res.status(400).send("Missing required fields");
    }

    const parsedPrice = parseFloat(price);
    const parsedQuantity = parseInt(quantity, 10);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      if (wantsJson)
        return res
          .status(400)
          .json({ success: false, message: "Invalid price value" });
      return res.status(400).send("Invalid price value");
    }
    if (isNaN(parsedQuantity) || parsedQuantity < 0) {
      if (wantsJson)
        return res
          .status(400)
          .json({ success: false, message: "Invalid quantity value" });
      return res.status(400).send("Invalid quantity value");
    }

    const updateData = {
      name: name.trim().toUpperCase(),
      price: parsedPrice,
      description: description.trim(),
      category: category.trim().toUpperCase(),
      brand: brand.trim(),
      quantity: parsedQuantity,
    };
    if (compatibility !== undefined)
      updateData.compatibility = compatibility.trim();

    const product = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    }).populate("seller", "name email");
    if (!product) {
      if (wantsJson)
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      return res.status(404).send("Product not found");
    }
    if (wantsJson) return res.json({ success: true, product });
    if (req.query.from === "static")
      return res.redirect("/manager/dashboard.html");
    res.redirect("/manager/dashboard");
  } catch (err) {
    console.error("Error editing product:", err);
    const wantsJson =
      (req.headers.accept || "").includes("application/json") ||
      req.xhr === true;
    if (wantsJson)
      return res
        .status(500)
        .json({ success: false, message: "Error editing product" });
    res.status(500).send("Error editing product");
  }
};

// Get single product
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "seller",
      "name email",
    );
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    return res.json({ success: true, product });
  } catch (err) {
    console.error("Error fetching product:", err);
    return res
      .status(500)
      .json({ success: false, message: "Error fetching product" });
  }
};

// Cancel order
exports.cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).send("Order not found");
    if (order.orderStatus === "cancelled")
      return res.status(400).send("Already cancelled");

    const prevStatus = order.orderStatus;
    order.previousStatus = order.orderStatus;
    order.orderStatus = "cancelled";
    order.orderStatusHistory = order.orderStatusHistory || [];
    order.orderStatusHistory.push({
      from: prevStatus || null,
      to: "cancelled",
      changedAt: new Date(),
      changedBy: { id: req.session.user?.id, role: "manager" },
    });
    await order.save();
    if (req.accepts("json")) return res.json({ success: true, order });
    res.redirect("/manager/orders");
  } catch (err) {
    console.error(err);
    if (req.accepts("json"))
      return res
        .status(500)
        .json({ success: false, message: "Error cancelling order" });
    res.status(500).send("Error cancelling order");
  }
};

// Restore order
exports.restoreOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId);
    if (!order) {
      return req.accepts("json")
        ? res.status(404).json({ success: false, message: "Order not found" })
        : res.status(404).send("Order not found");
    }
    if (order.orderStatus !== "cancelled") {
      return req.accepts("json")
        ? res
            .status(400)
            .json({ success: false, message: "Order is not cancelled" })
        : res.status(400).send("Order is not cancelled");
    }
    const restoreStatus = order.previousStatus || "pending";
    const prevStatus = order.orderStatus;
    order.orderStatus = restoreStatus;
    order.previousStatus = undefined;
    order.orderStatusHistory = order.orderStatusHistory || [];
    order.orderStatusHistory.push({
      from: prevStatus || null,
      to: restoreStatus,
      changedAt: new Date(),
      changedBy: { id: req.session.user?.id, role: "manager" },
    });
    await order.save();
    if (req.accepts("json")) return res.json({ success: true, order });
    res.redirect("/manager/orders");
  } catch (err) {
    console.error(err);
    if (req.accepts("json"))
      return res
        .status(500)
        .json({ success: false, message: "Error restoring order" });
    res.status(500).send("Error restoring order");
  }
};

exports.getProfileData = async (req, res) => {
  try {
    const id = req.params.id;
    let user = null;
    let role = null;
    let details = "";
    let profilePicture = "";
    let name = "",
      email = "",
      phone = "";

    // Check CustomerProfile
    let customer = await CustomerProfile.findById(id).populate("userId");
    if (customer) {
      user = customer.userId;
      role = "Customer";
      profilePicture =
        customer.profilePicture ||
        user.profilePicture ||
        "https://via.placeholder.com/80";
      name = user.name;
      email = user.email;
      phone = user.phone;

      details = `
        <p><strong>Address:</strong> ${customer.address || "N/A"}</p>
        <p><strong>District:</strong> ${customer.district || "N/A"}</p>
      `;
    }

    // Check SellerProfile
    if (!user) {
      let seller = await SellerProfile.findById(id).populate("sellerId");
      if (seller) {
        user = seller.sellerId;
        role = "Seller";
        profilePicture =
          user.profilePicture || "https://via.placeholder.com/80";
        name = user.name;
        email = user.email;
        phone = user.phone;

        details = `
          <p><strong>Owner:</strong> ${seller.ownerName || "N/A"}</p>
          <p><strong>Store Address:</strong> ${seller.address || "N/A"}</p>
        `;
      }
    }

    // Check if it's a service provider directly in User
    if (!user) {
      let serviceProvider = await User.findById(id);
      if (serviceProvider && serviceProvider.role === "service-provider") {
        user = serviceProvider;
        role = "Service Provider";
        profilePicture =
          user.profilePicture || "https://via.placeholder.com/80";
        name = user.workshopName || user.name;
        email = user.email;
        phone = user.phone;

        // Aggregate rating stats from completed bookings (ratings live on ServiceBooking)
        let ratingBlock = "<p><strong>Rating:</strong> No ratings yet</p>";
        try {
          const agg = await ServiceBooking.aggregate([
            {
              $match: {
                providerId: user._id,
                rating: { $gte: 1 },
              },
            },
            { $sort: { createdAt: -1 } },
            {
              $group: {
                _id: "$providerId",
                ratingAvg: { $avg: "$rating" },
                ratingCount: { $sum: 1 },
                latestRating: { $first: "$rating" },
                latestReview: { $first: "$review" },
              },
            },
          ]);
          const stats = Array.isArray(agg) ? agg[0] : null;
          if (
            stats &&
            typeof stats.ratingAvg === "number" &&
            typeof stats.ratingCount === "number"
          ) {
            const avg = Number(stats.ratingAvg).toFixed(1);
            const count = stats.ratingCount;
            ratingBlock = `<p><strong>Rating:</strong> ${avg} / 5 (${count})</p>`;
            if (stats.latestReview) {
              ratingBlock += `<p><strong>Latest Review:</strong> ${stats.latestReview}</p>`;
            }
          }
        } catch (e) {
          // keep default ratingBlock
        }

        const services =
          user.servicesOffered
            ?.map((s) => `<li>${s.name} - ₹${s.cost}</li>`)
            .join("") || "";
        details = `
          <p><strong>District:</strong> ${user.district || "N/A"}</p>
          ${ratingBlock}
          <h4>Services:</h4><ul>${services}</ul>
        `;
      }
    }

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      profilePicture,
      name,
      email,
      phone,
      role,
      extraDetails: details,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getPayments = async (req, res) => {
  try {
    // Load only 'Ready' service bookings, excluding suspended users
    const serviceOrders = (
      await ServiceBooking.find({ status: "Ready" })
        .populate("customerId", "name suspended")
        .populate("providerId", "name suspended")
    ).filter(
      (order) =>
        order.customerId &&
        !order.customerId.suspended &&
        order.providerId &&
        !order.providerId.suspended,
    );

    // Load product orders
    const orders = (
      await Order.find()
        .populate("userId", "name suspended") // Customer
        .populate("items.seller", "name suspended") // Sellers
        .sort({ placedAt: -1 })
    ).filter(
      (order) =>
        order.userId &&
        !order.userId.suspended &&
        order.items.every((item) => item.seller && !item.seller.suspended),
    );

    res.render("manager/payments", {
      serviceOrders,
      orders,
    });
  } catch (err) {
    console.error("Error fetching payments data:", err);
    res.status(500).send("Internal Server Error");
  }
};

exports.getProfileOverview = async (req, res) => {
  try {
    const id = req.params.id;

    // Helper for safe numbers
    const n = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

    // 1) Customer profile document
    const customerProfile = await CustomerProfile.findById(id).populate(
      "userId",
      "name email phone profilePicture suspended",
    );
    if (customerProfile && customerProfile.userId) {
      const user = customerProfile.userId;

      const [recentOrders, recentBookings] = await Promise.all([
        Order.find({ userId: user._id }).sort({ placedAt: -1 }).limit(3).lean(),
        ServiceBooking.find({ customerId: user._id })
          .sort({ createdAt: -1 })
          .limit(3)
          .populate("providerId", "name email phone")
          .lean(),
      ]);

      return res.json({
        role: "Customer",
        subject: {
          kind: "customer",
          profileId: String(customerProfile._id),
          userId: String(user._id),
        },
        profile: {
          name: user.name || "",
          email: user.email || "",
          phone: user.phone || "",
          profilePicture:
            customerProfile.profilePicture ||
            user.profilePicture ||
            "https://via.placeholder.com/120",
          district: customerProfile.district || "",
          address: customerProfile.address || "",
          registrationNumber: customerProfile.registrationNumber || "",
          vehicleMake: customerProfile.vehicleMake || "",
          vehicleModel: customerProfile.vehicleModel || "",
          vehicleVariant: customerProfile.vehicleVariant || "",
          fuelType: customerProfile.fuelType || "",
          transmission: customerProfile.transmission || "",
          yearOfManufacture: customerProfile.yearOfManufacture || "",
          vin: customerProfile.vin || "",
          currentMileage: customerProfile.currentMileage || "",
          insuranceProvider: customerProfile.insuranceProvider || "",
          insuranceValidTill: customerProfile.insuranceValidTill || "",
          rcBook: customerProfile.rcBook || "",
          insuranceCopy: customerProfile.insuranceCopy || "",
          vehiclePhotos: customerProfile.vehiclePhotos || [],
        },
        recent: {
          orders: recentOrders || [],
          serviceBookings: recentBookings || [],
        },
      });
    }

    // 2) Seller profile document
    const sellerProfile = await SellerProfile.findById(id).populate(
      "sellerId",
      "name email phone profilePicture suspended",
    );
    if (sellerProfile && sellerProfile.sellerId) {
      const sellerUser = sellerProfile.sellerId;

      const [recentOrdersRaw, earningsAgg] = await Promise.all([
        Order.find({ "items.seller": sellerUser._id })
          .sort({ placedAt: -1 })
          .limit(3)
          .populate("userId", "name email phone")
          .lean(),
        Order.aggregate([
          { $match: { "items.seller": sellerUser._id } },
          { $unwind: "$items" },
          {
            $match: {
              "items.seller": sellerUser._id,
              "items.itemStatus": "delivered",
            },
          },
          {
            $group: {
              _id: "$items.seller",
              totalEarnings: {
                $sum: { $multiply: ["$items.price", "$items.quantity"] },
              },
              deliveredItems: { $sum: 1 },
            },
          },
        ]),
      ]);

      const sellerEarnings = Array.isArray(earningsAgg) ? earningsAgg[0] : null;

      const recentOrders = (recentOrdersRaw || []).map((o) => {
        const items = Array.isArray(o.items) ? o.items : [];
        const sellerItems = items.filter(
          (it) =>
            String(it?.seller?._id || it?.seller) === String(sellerUser._id),
        );
        return {
          _id: o._id,
          placedAt: o.placedAt,
          orderStatus: o.orderStatus,
          paymentStatus: o.paymentStatus,
          customer: o.userId || null,
          items: sellerItems,
        };
      });

      return res.json({
        role: "Seller",
        subject: {
          kind: "seller",
          profileId: String(sellerProfile._id),
          userId: String(sellerUser._id),
        },
        profile: {
          name: sellerUser.name || "",
          email: sellerUser.email || "",
          phone: sellerUser.phone || "",
          profilePicture:
            sellerUser.profilePicture || "https://via.placeholder.com/120",
          ownerName: sellerProfile.ownerName || "",
          address: sellerProfile.address || "",
        },
        totals: {
          totalEarnings: n(sellerEarnings?.totalEarnings),
          deliveredItems: sellerEarnings?.deliveredItems || 0,
        },
        recent: {
          orders: recentOrders,
        },
      });
    }

    // 3) Service provider is a User document
    const serviceProvider = await User.findById(id).lean();
    if (serviceProvider && serviceProvider.role === "service-provider") {
      const providerUserId = serviceProvider._id;

      const [recentBookings, earningsAgg, reviewsAgg] = await Promise.all([
        ServiceBooking.find({ providerId: providerUserId })
          .sort({ createdAt: -1 })
          .limit(3)
          .populate("customerId", "name email phone")
          .lean(),
        ServiceBooking.aggregate([
          { $match: { providerId: providerUserId, status: "Ready" } },
          {
            $group: {
              _id: "$providerId",
              totalEarnings: { $sum: "$totalCost" },
              completedCount: { $sum: 1 },
            },
          },
        ]),
        ServiceBooking.aggregate([
          { $match: { providerId: providerUserId, rating: { $gte: 1 } } },
          { $sort: { createdAt: -1 } },
          {
            $project: {
              _id: 1,
              createdAt: 1,
              rating: 1,
              review: 1,
              selectedServices: 1,
              customerId: 1,
            },
          },
          { $limit: 50 },
        ]),
      ]);

      // populate customer for reviews (aggregation doesn't populate)
      const reviewCustomerIds = (reviewsAgg || [])
        .map((r) => r.customerId)
        .filter(Boolean);
      const customers = reviewCustomerIds.length
        ? await User.find(
            { _id: { $in: reviewCustomerIds } },
            "name email phone",
          ).lean()
        : [];
      const customersById = new Map(customers.map((c) => [String(c._id), c]));
      const reviews = (reviewsAgg || []).map((r) => ({
        _id: r._id,
        createdAt: r.createdAt,
        rating: r.rating,
        review: r.review,
        selectedServices: r.selectedServices,
        customer: customersById.get(String(r.customerId)) || null,
      }));

      const earnings = Array.isArray(earningsAgg) ? earningsAgg[0] : null;

      return res.json({
        role: "Service Provider",
        subject: {
          kind: "service-provider",
          userId: String(providerUserId),
        },
        profile: {
          name: serviceProvider.workshopName || serviceProvider.name || "",
          email: serviceProvider.email || "",
          phone: serviceProvider.phone || "",
          profilePicture:
            serviceProvider.profilePicture || "https://via.placeholder.com/120",
          district: serviceProvider.district || "",
          servicesOffered: Array.isArray(serviceProvider.servicesOffered)
            ? serviceProvider.servicesOffered
            : [],
          pickupRate: serviceProvider.pickupRate || 0,
          dropoffRate: serviceProvider.dropoffRate || 0,
        },
        totals: {
          totalEarnings: n(earnings?.totalEarnings),
          completedCount: earnings?.completedCount || 0,
        },
        recent: {
          bookings: recentBookings || [],
        },
        reviews,
      });
    }

    return res.status(404).json({ error: "User not found" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// Static HTML page handlers
exports.getDashboardHtml = (req, res) => {
  res.sendFile(
    path.join(__dirname, "..", "public", "manager", "dashboard.html"),
  );
};

exports.getUsersHtml = (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "manager", "users.html"));
};

exports.getServicesHtml = (req, res) => {
  res.sendFile(
    path.join(__dirname, "..", "public", "manager", "services.html"),
  );
};

exports.getPaymentsHtml = (req, res) => {
  res.sendFile(
    path.join(__dirname, "..", "public", "manager", "payments.html"),
  );
};

exports.getSupportHtml = (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "manager", "support.html"));
};
