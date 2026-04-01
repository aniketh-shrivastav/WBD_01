const path = require("path");
const User = require("../../models/User");
const Product = require("../../models/Product");
const Order = require("../../models/Orders");
const ServiceBooking = require("../../models/serviceBooking");

async function getDashboard(req, res) {
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
}

function getDashboardHtml(req, res) {
  res.sendFile(
    path.join(__dirname, "..", "..", "public", "manager", "dashboard.html"),
  );
}

module.exports = {
  getDashboard,
  getDashboardHtml,
};
