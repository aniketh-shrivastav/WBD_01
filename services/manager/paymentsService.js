const path = require("path");
const ServiceBooking = require("../../models/serviceBooking");
const Order = require("../../models/Orders");

async function getPayments(req, res) {
  try {
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

    const orders = (
      await Order.find()
        .populate("userId", "name suspended")
        .populate("items.seller", "name suspended")
        .sort({ placedAt: -1 })
    ).filter(
      (order) =>
        order.userId &&
        !order.userId.suspended &&
        order.items.every((item) => item.seller && !item.seller.suspended),
    );

    res.render("manager/payments", { serviceOrders, orders });
  } catch (err) {
    console.error("Error fetching payments data:", err);
    res.status(500).send("Internal Server Error");
  }
}

function getPaymentsHtml(req, res) {
  res.sendFile(
    path.join(__dirname, "..", "..", "public", "manager", "payments.html"),
  );
}

module.exports = {
  getPayments,
  getPaymentsHtml,
};
