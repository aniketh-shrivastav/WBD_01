const ServiceBooking = require("../../models/serviceBooking");
const Order = require("../../models/Orders");
const { enrichBookings } = require("./helpers");
const {
  findOrderByIdentifier,
  getDisplayOrderId,
} = require("../../utils/orderIdUtils");

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

  const normalizedOrders = orders.map((o) => ({
    ...(typeof o.toObject === "function" ? o.toObject() : o),
    orderId: getDisplayOrderId(o),
  }));

  const enrichedBookings = enrichBookings(bookings);

  const upcomingOrders = normalizedOrders.filter((o) =>
    ["pending", "confirmed", "shipped"].includes(o.orderStatus),
  );

  const pastOrders = normalizedOrders.filter((o) =>
    ["delivered", "cancelled"].includes(o.orderStatus),
  );

  return {
    bookings: enrichedBookings,
    upcomingOrders,
    pastOrders,
  };
}

async function getOrderDetails(orderId, customerId) {
  const matchedOrder = await findOrderByIdentifier(orderId);
  if (!matchedOrder) return null;

  const order = await Order.findById(matchedOrder._id)
    .populate("items.seller", "name email")
    .lean();

  if (!order) return null;

  // Enforce ownership after identifier resolution to avoid query-casting edge cases.
  if (String(order.userId) !== String(customerId)) {
    return null;
  }

  return {
    ...order,
    orderId: getDisplayOrderId(order),
  };
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
  const order = await findOrderByIdentifier(orderId, { userId: customerId });

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
