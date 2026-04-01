const ServiceBooking = require("../../models/serviceBooking");
const Order = require("../../models/Orders");
const { findOrderByIdentifier } = require("../../utils/orderIdUtils");

async function getOrders(req, res) {
  try {
    const bookings = (
      await ServiceBooking.find()
        .populate("customerId")
        .populate("providerId")
        .sort({ createdAt: -1 })
    ).filter(
      (booking) =>
        booking.customerId &&
        !booking.customerId.suspended &&
        booking.providerId &&
        !booking.providerId.suspended,
    );

    const orders = (
      await Order.find()
        .populate("userId")
        .populate("items.seller")
        .sort({ placedAt: -1 })
    ).filter(
      (order) =>
        order.userId &&
        !order.userId.suspended &&
        order.items.every((item) => item.seller && !item.seller.suspended),
    );

    res.render("manager/orders", { bookings, orders });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading bookings and orders");
  }
}

async function cancelOrder(req, res) {
  try {
    const orderId = req.params.orderId;
    const order = await findOrderByIdentifier(orderId);
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
    if (req.accepts("json")) {
      return res
        .status(500)
        .json({ success: false, message: "Error cancelling order" });
    }
    res.status(500).send("Error cancelling order");
  }
}

async function restoreOrder(req, res) {
  try {
    const orderId = req.params.orderId;
    const order = await findOrderByIdentifier(orderId);
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
    if (req.accepts("json")) {
      return res
        .status(500)
        .json({ success: false, message: "Error restoring order" });
    }
    res.status(500).send("Error restoring order");
  }
}

module.exports = {
  getOrders,
  cancelOrder,
  restoreOrder,
};
