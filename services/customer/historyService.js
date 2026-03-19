const ServiceBooking = require("../../models/serviceBooking");
const Order = require("../../models/Orders");
const { enrichBookings } = require("./helpers");

async function getHistoryData(customerId, includeSellerDetails = false) {
  const bookingQuery = ServiceBooking.find({ customerId })
    .populate("providerId")
    .sort({ createdAt: -1 });

  const orderQuery = Order.find({ userId: customerId }).sort({ placedAt: -1 });

  if (includeSellerDetails) {
    orderQuery.populate("items.seller", "name email");
    bookingQuery.lean();
    orderQuery.lean();
  }

  const bookings = await bookingQuery;
  const orders = await orderQuery;

  const enrichedBookings = enrichBookings(bookings);

  const upcomingOrders = orders.filter((o) =>
    ["pending", "confirmed", "shipped"].includes(o.orderStatus),
  );

  const pastOrders = orders.filter((o) =>
    ["delivered", "cancelled"].includes(o.orderStatus),
  );

  return {
    bookings: enrichedBookings,
    upcomingOrders,
    pastOrders,
  };
}

async function getOrderDetails(orderId, customerId) {
  return Order.findOne({
    _id: orderId,
    userId: customerId,
  })
    .populate("items.seller", "name email")
    .lean();
}

async function getServiceDetails(bookingId, customerId) {
  return ServiceBooking.findOne({
    _id: bookingId,
    customerId,
  })
    .populate("providerId", "name email phone")
    .lean();
}

async function cancelOrder(orderId, customerId) {
  const order = await Order.findOne({ _id: orderId, userId: customerId });

  if (!order || order.orderStatus !== "pending") {
    return { success: false, message: "Cannot cancel this order." };
  }

  await Order.findByIdAndDelete(order._id);
  return { success: true };
}

async function cancelService(bookingId, customerId) {
  const booking = await ServiceBooking.findOne({
    _id: bookingId,
    customerId,
  });

  if (!booking || booking.status !== "Open") {
    return { success: false, message: "Cannot cancel this service." };
  }

  await ServiceBooking.findByIdAndDelete(booking._id);
  return { success: true };
}

module.exports = {
  getHistoryData,
  getOrderDetails,
  getServiceDetails,
  cancelOrder,
  cancelService,
};
