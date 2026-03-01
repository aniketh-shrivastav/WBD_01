const Notification = require("../models/Notification");
const ServiceBooking = require("../models/serviceBooking");

// ─── Helper: create & optionally emit a notification ───
async function createNotification(data, io) {
  const notif = await Notification.create(data);

  // Real-time push via Socket.IO
  if (io && data.customerId) {
    io.to(`customer_${data.customerId}`).emit("notification:new", {
      _id: notif._id,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      createdAt: notif.createdAt,
      read: notif.read,
      priceApproval: notif.priceApproval || null,
      referenceId: notif.referenceId,
      referenceModel: notif.referenceModel,
    });
  }

  return notif;
}

// ─── GET /customer/api/notifications ───
exports.getNotifications = async (req, res) => {
  try {
    const customerId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ customerId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments({ customerId }),
      Notification.countDocuments({ customerId, read: false }),
    ]);

    res.json({
      success: true,
      notifications,
      total,
      unreadCount,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to load notifications" });
  }
};

// ─── GET /customer/api/notifications/unread-count ───
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      customerId: req.user.id,
      read: false,
    });
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ success: false, count: 0 });
  }
};

// ─── PUT /customer/api/notifications/:id/read ───
exports.markAsRead = async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, customerId: req.user.id },
      { read: true },
      { new: true },
    );
    if (!notif)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── PUT /customer/api/notifications/mark-all-read ───
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { customerId: req.user.id, read: false },
      { read: true },
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── POST /customer/api/notifications/:id/accept-price ───
// Customer accepts the proposed price → booking can proceed to Confirmed
exports.acceptPrice = async (req, res) => {
  try {
    const notif = await Notification.findOne({
      _id: req.params.id,
      customerId: req.user.id,
      type: "price_finalized",
    });

    if (!notif) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }
    if (notif.priceApproval?.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Price already ${notif.priceApproval?.status}`,
      });
    }

    // Update notification
    notif.priceApproval.status = "accepted";
    notif.priceApproval.respondedAt = new Date();
    notif.read = true;
    await notif.save();

    // Update the booking — mark price as customer-approved
    const booking = await ServiceBooking.findById(notif.referenceId);
    if (booking) {
      booking.priceApproved = true;
      booking.priceApprovalStatus = "accepted";
      await booking.save();

      // Create a confirmation notification
      const io = req.app.get("io");
      await createNotification(
        {
          customerId: req.user.id,
          type: "price_accepted",
          title: "Price Accepted",
          message: `You accepted the price of ₹${notif.priceApproval.proposedPrice} for your service booking.`,
          referenceId: booking._id,
          referenceModel: "ServiceBooking",
        },
        io,
      );

      // Notify service provider via socket
      if (io && booking.providerId) {
        io.to(`provider_earnings_${booking.providerId}`).emit(
          "price:response",
          {
            bookingId: booking._id,
            status: "accepted",
            customerId: req.user.id,
          },
        );
      }
    }

    res.json({ success: true, message: "Price accepted successfully" });
  } catch (err) {
    console.error("Error accepting price:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── POST /customer/api/notifications/:id/reject-price ───
// Customer rejects the proposed price → option to cancel booking
exports.rejectPrice = async (req, res) => {
  try {
    const notif = await Notification.findOne({
      _id: req.params.id,
      customerId: req.user.id,
      type: "price_finalized",
    });

    if (!notif) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }
    if (notif.priceApproval?.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Price already ${notif.priceApproval?.status}`,
      });
    }

    // Update notification
    notif.priceApproval.status = "rejected";
    notif.priceApproval.respondedAt = new Date();
    notif.read = true;
    await notif.save();

    // Update booking
    const booking = await ServiceBooking.findById(notif.referenceId);
    if (booking) {
      booking.priceApproved = false;
      booking.priceApprovalStatus = "rejected";
      await booking.save();

      const io = req.app.get("io");

      // Create rejection notification
      await createNotification(
        {
          customerId: req.user.id,
          type: "price_rejected",
          title: "Price Rejected",
          message: `You rejected the price of ₹${notif.priceApproval.proposedPrice}. You can cancel the booking if you wish.`,
          referenceId: booking._id,
          referenceModel: "ServiceBooking",
        },
        io,
      );

      // Notify service provider
      if (io && booking.providerId) {
        io.to(`provider_earnings_${booking.providerId}`).emit(
          "price:response",
          {
            bookingId: booking._id,
            status: "rejected",
            customerId: req.user.id,
          },
        );
      }
    }

    res.json({ success: true, message: "Price rejected" });
  } catch (err) {
    console.error("Error rejecting price:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── POST /customer/api/notifications/:id/cancel-service ───
// Customer cancels the booking after rejecting the price
exports.cancelServiceFromAlert = async (req, res) => {
  try {
    const notif = await Notification.findOne({
      _id: req.params.id,
      customerId: req.user.id,
      type: { $in: ["price_rejected", "price_finalized"] },
    });

    if (!notif) {
      return res
        .status(404)
        .json({ success: false, message: "Notification not found" });
    }

    const booking = await ServiceBooking.findById(notif.referenceId);
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    if (["Completed", "Rejected"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a ${booking.status.toLowerCase()} booking`,
      });
    }

    const prevStatus = booking.status;
    booking.status = "Rejected";
    booking.previousStatus = prevStatus;
    booking.statusHistory = booking.statusHistory || [];
    booking.statusHistory.push({
      from: prevStatus,
      to: "Rejected",
      changedAt: new Date(),
      changedBy: { id: req.user.id, role: "customer" },
    });
    await booking.save();

    const io = req.app.get("io");

    // Create cancellation notification
    await createNotification(
      {
        customerId: req.user.id,
        type: "service_cancelled",
        title: "Service Cancelled",
        message: `Your service booking has been cancelled after price disagreement.`,
        referenceId: booking._id,
        referenceModel: "ServiceBooking",
      },
      io,
    );

    // Notify service provider
    if (io && booking.providerId) {
      io.to(`provider_earnings_${booking.providerId}`).emit(
        "booking:cancelled",
        {
          bookingId: booking._id,
          customerId: req.user.id,
        },
      );
    }

    res.json({ success: true, message: "Service booking cancelled" });
  } catch (err) {
    console.error("Error cancelling service:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── DELETE /customer/api/notifications/:id ───
exports.deleteNotification = async (req, res) => {
  try {
    const result = await Notification.findOneAndDelete({
      _id: req.params.id,
      customerId: req.user.id,
    });
    if (!result)
      return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Exported helper so other controllers can create notifications ───
exports.createNotification = createNotification;
