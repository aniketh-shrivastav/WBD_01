const ServiceBooking = require("../../models/serviceBooking");
const User = require("../../models/User");
const { createError, updateProviderRating } = require("./helpers");

function ensureCanConfirmAfterPriceChange(booking) {
  // Once provider proposes/changes price, booking must be accepted by customer
  // before the provider can move status to Confirmed.
  if (["pending", "rejected"].includes(booking.priceApprovalStatus)) {
    if (booking.priceApprovalStatus === "pending") {
      throw createError(
        400,
        "Cannot confirm booking: customer has not yet approved the finalized price.",
      );
    }

    throw createError(
      400,
      "Cannot confirm booking: customer has rejected the proposed price.",
    );
  }
}

async function getBookings(providerId) {
  const bookings = await ServiceBooking.find({ providerId })
    .populate("customerId", "name email")
    .sort({ createdAt: -1 })
    .lean();

  const provider = await User.findById(providerId).lean();
  const serviceMap = {};
  (provider?.servicesOffered || []).forEach((service) => {
    serviceMap[service.name] = service.cost;
  });

  bookings.forEach((booking) => {
    if (!booking.totalCost || booking.totalCost === 0) {
      let total = 0;
      (booking.selectedServices || []).forEach((serviceName) => {
        total += serviceMap[serviceName] || 0;
      });
      booking.totalCost = total;
    }
  });

  return bookings.map((booking) => ({
    id: booking._id,
    selectedServices: booking.selectedServices || [],
    description: booking.description || "",
    carModel: booking.carModel || "",
    customerName: booking.customerId?.name || "Unknown",
    customerEmail: booking.customerId?.email || "",
    phone: booking.phone || "",
    address: booking.address || "",
    district: booking.district || "",
    status: booking.status,
    createdAt: booking.createdAt,
    totalCost: booking.totalCost || 0,
    needsPickup: booking.needsPickup || false,
    needsDropoff: booking.needsDropoff || false,
    pickupCost: booking.pickupCost || 0,
    dropoffCost: booking.dropoffCost || 0,
    productCost: booking.productCost || 0,
    serviceCategory: booking.serviceCategory || "",
    registrationNumber: booking.registrationNumber || "",
    vehicleMake: booking.vehicleMake || "",
    vehicleModel: booking.vehicleModel || "",
    vehicleVariant: booking.vehicleVariant || "",
    fuelType: booking.fuelType || "",
    transmission: booking.transmission || "",
    yearOfManufacture: booking.yearOfManufacture || null,
    vin: booking.vin || "",
    currentMileage: booking.currentMileage || null,
    insuranceProvider: booking.insuranceProvider || "",
    insuranceValidTill: booking.insuranceValidTill || null,
    rcBook: booking.rcBook || "",
    insuranceCopy: booking.insuranceCopy || "",
    vehiclePhotos: booking.vehiclePhotos || [],
    carYear: booking.carYear || null,
    linkedProducts: booking.linkedProducts || [],
    priceApprovalStatus: booking.priceApprovalStatus || "none",
  }));
}

async function updateBookingStatus(orderId, newStatus, actorId) {
  const booking = await ServiceBooking.findById(orderId);
  if (!booking) {
    throw createError(404, "Booking not found");
  }

  const validTransitions = {
    Open: ["Confirmed", "Rejected"],
    Confirmed: ["Completed", "Rejected"],
    Completed: [],
    Rejected: [],
  };

  if (!validTransitions[booking.status]?.includes(newStatus)) {
    throw createError(
      400,
      `Invalid status transition from ${booking.status} to ${newStatus}`,
    );
  }

  if (newStatus === "Confirmed") {
    ensureCanConfirmAfterPriceChange(booking);
  }

  const prevStatus = booking.status;
  booking.status = newStatus;
  booking.statusHistory = booking.statusHistory || [];
  booking.statusHistory.push({
    from: prevStatus || null,
    to: newStatus,
    changedAt: new Date(),
    changedBy: { id: actorId, role: "service-provider" },
  });

  await booking.save();

  const statusMessages = {
    Confirmed: "Your service booking has been confirmed by the provider.",
    Completed: "Your service booking has been marked as completed.",
    Rejected: "Your service booking has been rejected by the provider.",
    Ready: "Your service is ready for pickup/completion.",
  };

  return {
    booking,
    statusNotification: {
      customerId: booking.customerId,
      type: "service_status",
      title: `Service ${newStatus}`,
      message:
        statusMessages[newStatus] ||
        `Your service booking status changed to ${newStatus}.`,
      referenceId: booking._id,
      referenceModel: "ServiceBooking",
    },
    emitEarnings: newStatus === "Ready" || newStatus === "Completed",
  };
}

async function updateMultipleBookingStatus(orderIds, newStatus, actorId) {
  const bookings = await ServiceBooking.find({ _id: { $in: orderIds } });

  const validTransitions = {
    Open: ["Confirmed", "Rejected"],
    Confirmed: ["Completed", "Rejected"],
    Completed: [],
    Rejected: [],
  };

  await Promise.all(
    bookings.map(async (booking) => {
      if (!validTransitions[booking.status]?.includes(newStatus)) {
        throw createError(
          400,
          `Invalid status transition from ${booking.status} to ${newStatus}`,
        );
      }

      if (newStatus === "Confirmed") {
        ensureCanConfirmAfterPriceChange(booking);
      }

      const prevStatus = booking.status;
      booking.status = newStatus;
      booking.statusHistory = booking.statusHistory || [];
      booking.statusHistory.push({
        from: prevStatus || null,
        to: newStatus,
        changedAt: new Date(),
        changedBy: { id: actorId, role: "service-provider" },
      });
      await booking.save();
    }),
  );
}

async function updateBooking(orderId, status, totalCost, actorId) {
  const booking = await ServiceBooking.findById(orderId);
  if (!booking) {
    throw createError(404, "Booking not found");
  }

  if (status) {
    if (status === "Confirmed") {
      ensureCanConfirmAfterPriceChange(booking);
    }

    const prevStatus = booking.status;
    booking.status = status;
    booking.statusHistory = booking.statusHistory || [];
    booking.statusHistory.push({
      from: prevStatus || null,
      to: status,
      changedAt: new Date(),
      changedBy: { id: actorId, role: "service-provider" },
    });
  }

  let priceNotification = null;

  if (typeof totalCost !== "undefined") {
    const prevCost = booking.totalCost;
    booking.totalCost = Number(totalCost);
    booking.priceApprovalStatus = "pending";
    booking.priceApproved = false;
    booking.costHistory = booking.costHistory || [];
    booking.costHistory.push({
      from: typeof prevCost === "number" ? prevCost : null,
      to: booking.totalCost,
      changedAt: new Date(),
      changedBy: { id: actorId, role: "service-provider" },
    });

    priceNotification = {
      customerId: booking.customerId,
      type: "price_finalized",
      title: "Price Updated",
      message: `The service provider has set the price for your booking to \u20b9${booking.totalCost}. Please review and accept or reject.`,
      referenceId: booking._id,
      referenceModel: "ServiceBooking",
      priceApproval: {
        proposedPrice: booking.totalCost,
        previousPrice: typeof prevCost === "number" ? prevCost : null,
        status: "pending",
      },
    };
  }

  await booking.save();

  return { booking, priceNotification };
}

async function updateCost(bookingId, totalCost, actorId) {
  const booking = await ServiceBooking.findById(bookingId);
  if (!booking) {
    throw createError(404, "Booking not found");
  }

  const prevCost = booking.totalCost;
  booking.totalCost = Number(totalCost);
  booking.priceApprovalStatus = "pending";
  booking.priceApproved = false;
  booking.costHistory = booking.costHistory || [];
  booking.costHistory.push({
    from: typeof prevCost === "number" ? prevCost : null,
    to: booking.totalCost,
    changedAt: new Date(),
    changedBy: { id: actorId, role: "service-provider" },
  });

  await booking.save();

  return {
    booking,
    priceNotification: {
      customerId: booking.customerId,
      type: "price_finalized",
      title: "Price Finalized",
      message: `The service provider has finalized the price for your booking to \u20b9${booking.totalCost}. Please review and accept or reject.`,
      referenceId: booking._id,
      referenceModel: "ServiceBooking",
      priceApproval: {
        proposedPrice: booking.totalCost,
        previousPrice: typeof prevCost === "number" ? prevCost : null,
        status: "pending",
      },
    },
  };
}

async function submitRating(bookingId, rating, review) {
  if (!rating || rating < 1 || rating > 5) {
    throw createError(400, "Please provide a valid rating (1-5)");
  }

  const updatedBooking = await ServiceBooking.findById(bookingId).populate(
    "customerId",
    "name",
  );

  if (!updatedBooking) {
    throw createError(404, "Booking not found");
  }

  const prevStatus = updatedBooking.status;
  updatedBooking.rating = parseInt(rating, 10);
  updatedBooking.review = review || "";
  updatedBooking.status = "Completed";
  updatedBooking.statusHistory = updatedBooking.statusHistory || [];
  updatedBooking.statusHistory.push({
    from: prevStatus || null,
    to: "Completed",
    changedAt: new Date(),
    changedBy: { id: updatedBooking.customerId?._id, role: "customer" },
  });

  await updatedBooking.save();
  await updateProviderRating(updatedBooking.providerId);

  return updatedBooking;
}

async function updateProductCost(providerId, bookingId, productCost) {
  if (!bookingId) {
    throw createError(400, "Booking ID required");
  }

  const cost = Math.max(0, Number(productCost) || 0);
  const booking = await ServiceBooking.findOne({ _id: bookingId, providerId });

  if (!booking) {
    throw createError(404, "Booking not found");
  }

  const oldTotal = booking.totalCost || 0;
  const oldProductCost = booking.productCost || 0;
  booking.productCost = cost;
  booking.totalCost = oldTotal - oldProductCost + cost;
  booking.costHistory = booking.costHistory || [];
  booking.costHistory.push({
    from: oldTotal,
    to: booking.totalCost,
    changedAt: new Date(),
    changedBy: { id: providerId, role: "service-provider" },
  });

  booking.priceApprovalStatus = "pending";
  booking.priceApproved = false;

  await booking.save();

  return {
    booking,
    cost,
    oldTotal,
    priceNotification: {
      customerId: booking.customerId,
      type: "price_finalized",
      title: "Product Cost Added",
      message: `The service provider has added a product cost of \u20b9${cost}. Updated total: \u20b9${booking.totalCost}. Please review and accept or reject.`,
      referenceId: booking._id,
      referenceModel: "ServiceBooking",
      priceApproval: {
        proposedPrice: booking.totalCost,
        previousPrice: oldTotal,
        status: "pending",
      },
    },
  };
}

module.exports = {
  getBookings,
  updateBookingStatus,
  updateMultipleBookingStatus,
  updateBooking,
  updateCost,
  submitRating,
  updateProductCost,
};
