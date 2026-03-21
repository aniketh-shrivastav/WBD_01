const Order = require("../../models/Orders");
const {
  findOrderByIdentifier,
  getDisplayOrderId,
} = require("../../utils/orderIdUtils");
const { deriveOrderStatus, createError } = require("./helpers");

async function getOrdersData(sellerId) {
  const orders = await Order.find({ "items.seller": sellerId })
    .populate("userId", "name email")
    .sort({ placedAt: -1 })
    .lean();

  const shaped = [];

  orders.forEach((order) => {
    (order.items || []).forEach((item, itemIndex) => {
      if (String(item.seller) !== String(sellerId)) return;

      shaped.push({
        uniqueId: `${order._id}-${item.productId}-${itemIndex}`,
        _id: order._id,
        orderId: getDisplayOrderId(order),
        productId: item.productId,
        itemIndex,
        customerName: order.userId?.name || "Unknown",
        customerEmail: order.userId?.email || "",
        productName: item.name,
        quantity: item.quantity,
        price: item.price,
        image: item.image,
        deliveryAddress: order.deliveryAddress,
        deliveryAddressDetails: order.deliveryAddressDetails,
        district: order.district,
        status: item.itemStatus || order.orderStatus || "pending",
        deliveryDate: item.deliveryDate || null,
        deliveryOtp: item.deliveryOtp || null,
        placedAt: order.placedAt,
        totalAmount: order.totalAmount,
        paymentStatus: order.paymentStatus,
        itemStatusHistory: item.itemStatusHistory || [],
        orderStatusHistory: order.orderStatusHistory || [],
      });
    });
  });

  return shaped;
}

async function updateOrderStatus(params) {
  const {
    orderId,
    newStatus,
    productId,
    itemIndex,
    deliveryDate,
    otp,
    sellerId,
    actorId,
  } = params;

  const order = await findOrderByIdentifier(orderId);
  if (!order) {
    throw createError(404, "Order not found");
  }

  if (productId !== undefined && itemIndex !== undefined) {
    const item = order.items[itemIndex];
    if (!item) {
      throw createError(404, "Order item not found");
    }

    if (String(item.seller) !== String(sellerId)) {
      throw createError(403, "Access denied: This item does not belong to you");
    }

    const currentItemStatus = item.itemStatus || order.orderStatus;
    if (
      currentItemStatus === "delivered" ||
      currentItemStatus === "cancelled"
    ) {
      throw createError(
        400,
        `Cannot change status after it's marked as ${currentItemStatus}`,
      );
    }

    if (newStatus === "confirmed") {
      const existingDeliveryDate = order.items[itemIndex].deliveryDate;
      if (!deliveryDate && !existingDeliveryDate) {
        throw createError(
          400,
          "Please set a delivery date before confirming the order",
        );
      }
      if (deliveryDate) {
        order.items[itemIndex].deliveryDate = new Date(deliveryDate);
      }
    }

    if (deliveryDate) {
      order.items[itemIndex].deliveryDate = new Date(deliveryDate);
    }

    if (newStatus === "shipped") {
      const otpCode = String(Math.floor(100000 + Math.random() * 900000));
      order.items[itemIndex].deliveryOtp = otpCode;
      order.items[itemIndex].deliveryOtpGeneratedAt = new Date();
    }

    if (newStatus === "delivered") {
      const storedOtp = order.items[itemIndex].deliveryOtp;
      if (!storedOtp) {
        throw createError(
          400,
          "No delivery OTP found. The item must be shipped first.",
        );
      }
      if (!otp || String(otp).trim() !== String(storedOtp).trim()) {
        throw createError(
          400,
          "Invalid delivery OTP. Please enter the correct OTP from the customer.",
        );
      }

      order.items[itemIndex].deliveryOtp = undefined;
      order.items[itemIndex].deliveryOtpGeneratedAt = undefined;
    }

    const prevItemStatus = order.items[itemIndex].itemStatus || null;
    order.items[itemIndex].itemStatus = newStatus;
    order.items[itemIndex].itemStatusHistory =
      order.items[itemIndex].itemStatusHistory || [];
    order.items[itemIndex].itemStatusHistory.push({
      from: prevItemStatus,
      to: newStatus,
      changedAt: new Date(),
      changedBy: { id: actorId, role: "seller" },
    });

    const derivedStatus = deriveOrderStatus(
      order.items,
      order.orderStatus || "pending",
    );
    if (derivedStatus !== order.orderStatus) {
      const prevOrderStatus = order.orderStatus;
      order.previousStatus = order.orderStatus;
      order.orderStatus = derivedStatus;
      order.orderStatusHistory = order.orderStatusHistory || [];
      order.orderStatusHistory.push({
        from: prevOrderStatus || null,
        to: derivedStatus,
        changedAt: new Date(),
        changedBy: { id: actorId, role: "seller" },
      });
    }

    await order.save({ validateBeforeSave: false });

    return {
      success: true,
      message: "Item status updated successfully",
      notifyCustomer: {
        customerId: order.userId,
        title: "Order Status Updated",
        message: `Item \"${item.name}\" in order #${getDisplayOrderId(order)} has been updated to ${newStatus}.`,
        orderId: order._id,
      },
    };
  }

  if (order.orderStatus === "delivered" || order.orderStatus === "cancelled") {
    throw createError(
      400,
      `Cannot change status after it's marked as ${order.orderStatus}`,
    );
  }

  const prevOrderStatus = order.orderStatus;
  order.previousStatus = order.orderStatus;
  order.orderStatus = newStatus;
  order.orderStatusHistory = order.orderStatusHistory || [];
  order.orderStatusHistory.push({
    from: prevOrderStatus || null,
    to: newStatus,
    changedAt: new Date(),
    changedBy: { id: actorId, role: "seller" },
  });

  order.items.forEach((item, idx) => {
    if (newStatus === "shipped") {
      const otpCode = String(Math.floor(100000 + Math.random() * 900000));
      order.items[idx].deliveryOtp = otpCode;
      order.items[idx].deliveryOtpGeneratedAt = new Date();
    }

    if (newStatus === "delivered") {
      const storedOtp = order.items[idx].deliveryOtp;
      if (storedOtp) {
        order.items[idx].deliveryOtp = undefined;
        order.items[idx].deliveryOtpGeneratedAt = undefined;
      }
    }

    const prevItemStatus = order.items[idx].itemStatus || null;
    order.items[idx].itemStatus = newStatus;
    order.items[idx].itemStatusHistory =
      order.items[idx].itemStatusHistory || [];
    order.items[idx].itemStatusHistory.push({
      from: prevItemStatus,
      to: newStatus,
      changedAt: new Date(),
      changedBy: { id: actorId, role: "seller" },
    });
  });

  await order.save({ validateBeforeSave: false });

  return { success: true, message: "Order status updated successfully" };
}

async function updateDeliveryDate(params) {
  const { orderId, itemIndex, deliveryDate, productId, sellerId } = params;

  if (!deliveryDate) {
    throw createError(400, "Delivery date is required");
  }

  let parsedDeliveryDate = new Date(deliveryDate);
  if (Number.isNaN(parsedDeliveryDate.getTime())) {
    const match = String(deliveryDate).match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (match) {
      const [, dd, mm, yyyy] = match;
      parsedDeliveryDate = new Date(`${yyyy}-${mm}-${dd}`);
    }
  }

  if (Number.isNaN(parsedDeliveryDate.getTime())) {
    throw createError(400, "Invalid delivery date format");
  }

  const order = await findOrderByIdentifier(orderId);
  if (!order) {
    throw createError(404, "Order not found");
  }

  let idx = Number(itemIndex);
  if (!Number.isInteger(idx) || idx < 0) {
    idx = -1;
  }

  if (idx < 0 || idx >= order.items.length) {
    idx = order.items.findIndex(
      (item) =>
        String(item.seller) === String(sellerId) &&
        (productId ? String(item.productId) === String(productId) : true),
    );
  }

  const item = idx >= 0 ? order.items[idx] : null;
  if (!item) {
    throw createError(404, "Order item not found");
  }

  if (String(item.seller) !== String(sellerId)) {
    throw createError(403, "Access denied: This item does not belong to you");
  }

  await Order.updateOne(
    { _id: order._id },
    { $set: { [`items.${idx}.deliveryDate`]: parsedDeliveryDate } },
  );
}

module.exports = {
  getOrdersData,
  updateOrderStatus,
  updateDeliveryDate,
};
