const mongoose = require("mongoose");
const User = require("../models/User");
const ServiceBooking = require("../models/serviceBooking");

function getMonthName(monthIndex) {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return months[monthIndex];
}

function getTimeAgo(date) {
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return date.toLocaleDateString();
}

async function updateProviderRating(providerId) {
  const stats = await ServiceBooking.aggregate([
    { $match: { providerId: providerId, rating: { $exists: true } } },
    {
      $group: { _id: null, avgRating: { $avg: "$rating" }, count: { $sum: 1 } },
    },
  ]);

  await User.findByIdAndUpdate(providerId, {
    averageRating: stats[0]?.avgRating || 0,
    ratingCount: stats[0]?.count || 0,
  });
}

// Dashboard API
exports.getDashboard = async (req, res) => {
  try {
    const providerId = new mongoose.Types.ObjectId(req.user.id);

    const bookings = await ServiceBooking.aggregate([
      { $match: { providerId } },
      { $unwind: "$selectedServices" },
      { $group: { _id: "$selectedServices", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const serviceLabels = bookings.map((b) => b._id);
    const serviceCounts = bookings.map((b) => b.count);

    const totalEarningsResult = await ServiceBooking.aggregate([
      { $match: { providerId, totalCost: { $exists: true } } },
      { $group: { _id: null, total: { $sum: "$totalCost" } } },
    ]);
    const grossEarnings = totalEarningsResult[0]?.total || 0;
    const netEarnings = Math.round(grossEarnings * 0.8);

    const ongoingCount = await ServiceBooking.countDocuments({
      providerId,
      status: "Confirmed",
    });
    const completedCount = await ServiceBooking.countDocuments({
      providerId,
      status: "Ready",
    });

    const ratingData = await ServiceBooking.aggregate([
      { $match: { providerId, rating: { $exists: true } } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]);
    const avgRating = ratingData[0]?.avgRating?.toFixed(1) || "N/A";
    const totalReviews = ratingData[0]?.count || 0;

    res.json({
      serviceLabels,
      serviceCounts,
      totals: {
        earnings: netEarnings,
        ongoing: ongoingCount,
        completed: completedCount,
        avgRating,
        totalReviews,
      },
    });
  } catch (err) {
    console.error("Dashboard API error", err);
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
};

// Update Booking Status
exports.updateBookingStatus = async (req, res) => {
  const { orderId, newStatus } = req.body;

  try {
    const booking = await ServiceBooking.findById(orderId);

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }
    const validTransitions = {
      Open: ["Confirmed", "Rejected"],
      Confirmed: ["Completed", "Rejected"],
      Completed: [],
      Rejected: [],
    };
    if (!validTransitions[booking.status].includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from ${booking.status} to ${newStatus}`,
      });
    }
    const prevStatus = booking.status;
    booking.status = newStatus;
    booking.statusHistory = booking.statusHistory || [];
    booking.statusHistory.push({
      from: prevStatus || null,
      to: newStatus,
      changedAt: new Date(),
      changedBy: { id: req.session.user?.id, role: "service-provider" },
    });
    await booking.save();

    // Emit earnings update event
    if (newStatus === "Ready" || newStatus === "Completed") {
      const io = req.app.get("io");
      if (io && booking.providerId) {
        io.to(`provider_earnings_${booking.providerId}`).emit(
          "earnings:updated",
          {
            providerId: booking.providerId,
            newEarning: booking.totalCost,
            timestamp: new Date(),
          },
        );
      }
    }

    // Emit activity update
    const io = req.app.get("io");
    if (io && booking.providerId) {
      io.to(`provider_earnings_${booking.providerId}`).emit(
        "activity:updated",
        {
          providerId: booking.providerId,
          timestamp: new Date(),
        },
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error updating booking status:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update Multiple Booking Status
exports.updateMultipleBookingStatus = async (req, res) => {
  const { orderIds, newStatus } = req.body;

  try {
    const bookings = await ServiceBooking.find({ _id: { $in: orderIds } });
    await Promise.all(
      bookings.map(async (booking) => {
        const prevStatus = booking.status;
        booking.status = newStatus;
        booking.statusHistory = booking.statusHistory || [];
        booking.statusHistory.push({
          from: prevStatus || null,
          to: newStatus,
          changedAt: new Date(),
          changedBy: { id: req.session.user?.id, role: "service-provider" },
        });
        await booking.save();
      }),
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
};

// Get Earnings
exports.getEarnings = async (req, res) => {
  try {
    const providerId = req.user.id;

    const completedBookings = await ServiceBooking.find({
      providerId: providerId,
      status: "Ready",
      totalCost: { $exists: true },
    });

    const totalEarnings = completedBookings.reduce(
      (sum, booking) => sum + booking.totalCost,
      0,
    );

    const pendingPayouts = totalEarnings;
    const availableBalance = Math.round(pendingPayouts * 0.8);

    const transactions = completedBookings.map((booking) => ({
      date: booking.date.toLocaleDateString(),
      amount: Math.round(booking.totalCost * 0.8),
      status: "Ready",
    }));

    const payoutData = {
      totalEarnings,
      pendingPayouts,
      availableBalance,
      transactions,
    };

    res.render("service/earnings", { payoutData });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

// Get Earnings Data API
exports.getEarningsData = async (req, res) => {
  try {
    const providerId = new mongoose.Types.ObjectId(req.user.id);
    const timeRange = req.query.timeRange || "1";

    const currentDate = new Date();
    const labels = [];
    const data = [];
    let totalEarnings = 0;

    if (timeRange === "1") {
      const daysInMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0,
      ).getDate();
      const monthName = getMonthName(currentDate.getMonth());

      for (let weekStart = 1; weekStart <= daysInMonth; weekStart += 7) {
        const weekEnd = Math.min(weekStart + 6, daysInMonth);
        labels.push(`${monthName} ${weekStart}-${weekEnd}`);

        const weekStartDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          weekStart,
        );
        const weekEndDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          weekEnd + 1,
        );

        const weeklyEarnings = await ServiceBooking.aggregate([
          {
            $match: {
              providerId,
              status: "Ready",
              totalCost: { $exists: true },
              createdAt: { $gte: weekStartDate, $lt: weekEndDate },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$totalCost" },
            },
          },
        ]);

        const weekTotal = weeklyEarnings[0]?.total || 0;
        totalEarnings += weekTotal;
        data.push(weekTotal);
      }
    } else {
      const months = parseInt(timeRange);
      for (let i = months - 1; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setMonth(currentDate.getMonth() - i);
        const monthName = getMonthName(date.getMonth());
        labels.push(monthName);

        const monthStartDate = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEndDate = new Date(
          date.getFullYear(),
          date.getMonth() + 1,
          1,
        );

        const monthlyEarnings = await ServiceBooking.aggregate([
          {
            $match: {
              providerId,
              status: "Ready",
              totalCost: { $exists: true },
              createdAt: { $gte: monthStartDate, $lt: monthEndDate },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$totalCost" },
            },
          },
        ]);

        const monthTotal = monthlyEarnings[0]?.total || 0;
        totalEarnings += monthTotal;
        data.push(monthTotal);
      }
    }

    const commissionData = data.map((amount) => Math.round(amount * 0.8));
    const commissionTotalEarnings = Math.round(totalEarnings * 0.8);

    res.json({
      labels,
      data: commissionData,
      totalEarnings: commissionTotalEarnings,
      timeRange,
    });
  } catch (err) {
    console.error("Earnings API error", err);
    res.status(500).json({ error: "Failed to load earnings data" });
  }
};

// Get Reviews
exports.getReviews = async (req, res) => {
  try {
    const reviews = await ServiceBooking.find({
      providerId: req.user.id,
      rating: { $exists: true },
      review: { $exists: true },
    })
      .populate("customerId", "name profileImage")
      .sort({ createdAt: -1 })
      .lean();

    const shaped = reviews.map((r) => ({
      id: r._id,
      customerName: r.customerId?.name || "Unknown",
      customerImage: r.customerId?.profileImage || "",
      rating: r.rating,
      reviewText: r.review || "",
      createdAt: r.createdAt,
    }));

    res.json({ success: true, reviews: shaped });
  } catch (error) {
    console.error("Reviews API error:", error);
    res.status(500).json({ success: false, message: "Failed to load reviews" });
  }
};

// Delete Profile
exports.deleteProfile = async (req, res) => {
  try {
    const result = await User.findByIdAndDelete(req.params.id);
    if (!result)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res
      .status(200)
      .json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update Booking
exports.updateBooking = async (req, res) => {
  const { orderId, status, totalCost } = req.body;

  try {
    const booking = await ServiceBooking.findById(orderId);
    if (!booking) return res.status(404).send("Booking not found");

    if (status) {
      const prevStatus = booking.status;
      booking.status = status;
      booking.statusHistory = booking.statusHistory || [];
      booking.statusHistory.push({
        from: prevStatus || null,
        to: status,
        changedAt: new Date(),
        changedBy: { id: req.session.user?.id, role: "service-provider" },
      });
    }
    if (typeof totalCost !== "undefined") {
      const prevCost = booking.totalCost;
      booking.totalCost = Number(totalCost);
      booking.costHistory = booking.costHistory || [];
      booking.costHistory.push({
        from: typeof prevCost === "number" ? prevCost : null,
        to: booking.totalCost,
        changedAt: new Date(),
        changedBy: { id: req.session.user?.id, role: "service-provider" },
      });
    }

    await booking.save();
    res.status(200).send("Booking updated successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating booking");
  }
};

// Update Cost
exports.updateCost = async (req, res) => {
  const { id } = req.params;
  const { totalCost } = req.body;

  try {
    const booking = await ServiceBooking.findById(id);
    if (!booking) return res.status(404).send("Booking not found");

    const prevCost = booking.totalCost;
    booking.totalCost = Number(totalCost);
    booking.costHistory = booking.costHistory || [];
    booking.costHistory.push({
      from: typeof prevCost === "number" ? prevCost : null,
      to: booking.totalCost,
      changedAt: new Date(),
      changedBy: { id: req.session.user?.id, role: "service-provider" },
    });
    await booking.save();

    res.redirect("/service/bookingManagement");
  } catch (error) {
    console.error("Cost update failed:", error);
    res.status(500).send("Failed to update cost");
  }
};

// Submit Rating
exports.submitRating = async (req, res) => {
  try {
    const { rating, review } = req.body;
    const bookingId = req.params.id;

    if (!rating || rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ error: "Please provide a valid rating (1-5)" });
    }

    const updatedBooking = await ServiceBooking.findById(bookingId).populate(
      "customerId",
      "name",
    );
    if (!updatedBooking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const prevStatus = updatedBooking.status;
    updatedBooking.rating = parseInt(rating);
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

    res.json({
      success: true,
      message: "Rating submitted successfully!",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Rating submission error:", error);
    res.status(500).json({ error: "Failed to submit rating" });
  }
};

// Get Profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    const {
      _id: id,
      name,
      email,
      phone,
      district = "",
      servicesOffered = [],
      paintColors = [],
      profilePicture = "",
      pickupRate = 0,
      dropoffRate = 0,
    } = user;
    res.json({
      success: true,
      user: {
        id,
        name,
        email,
        phone: phone || "",
        district,
        servicesOffered,
        paintColors,
        profilePicture,
        pickupRate,
        dropoffRate,
      },
    });
  } catch (err) {
    console.error("Profile API error", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get Recent Activity
exports.getRecentActivity = async (req, res) => {
  try {
    const providerId = req.user.id;
    const limit = parseInt(req.query.limit) || 5;

    const recentBookings = await ServiceBooking.find({ providerId })
      .populate("customerId", "name")
      .sort({ createdAt: -1 })
      .limit(limit * 2)
      .lean();

    const activities = [];
    const statusIcons = {
      Open: "fa-calendar",
      Confirmed: "fa-tools",
      Ready: "fa-check-circle",
      Completed: "fa-check-double",
      Rejected: "fa-times-circle",
    };

    for (const booking of recentBookings) {
      if (activities.length >= limit) break;

      const customerName = booking.customerId?.name || "Unknown Customer";
      const createdDate = new Date(booking.createdAt);
      const timeAgo = getTimeAgo(createdDate);
      const services = (booking.selectedServices || []).join(", ") || "Service";
      const status = booking.status || "Open";
      const icon = statusIcons[status] || "fa-info-circle";

      let text = "";
      switch (status) {
        case "Open":
          text = `New Booking: ${services} for ${customerName}`;
          break;
        case "Confirmed":
          text = `Confirmed: ${services} for ${customerName}`;
          break;
        case "Ready":
          text = `Ready for Delivery: ${services} for ${customerName}`;
          break;
        case "Completed":
          text = `Completed: ${services} for ${customerName}`;
          break;
        default:
          text = `${status}: ${services} for ${customerName}`;
      }

      activities.push({
        icon,
        text,
        timeAgo,
        status,
        bookingId: booking._id,
      });
    }

    res.json({ success: true, activities });
  } catch (error) {
    console.error("Recent activity API error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to load recent activity" });
  }
};

// Get Bookings
exports.getBookings = async (req, res) => {
  try {
    const providerId = req.user.id;
    let bookings = await ServiceBooking.find({ providerId })
      .populate("customerId", "name email")
      .sort({ createdAt: -1 })
      .lean();

    const provider = await User.findById(providerId).lean();
    const serviceMap = {};
    (provider.servicesOffered || []).forEach((s) => {
      serviceMap[s.name] = s.cost;
    });

    bookings.forEach((b) => {
      if (!b.totalCost || b.totalCost === 0) {
        let total = 0;
        (b.selectedServices || []).forEach((s) => {
          total += serviceMap[s] || 0;
        });
        b.totalCost = total;
      }
    });

    const shaped = bookings.map((b) => ({
      id: b._id,
      selectedServices: b.selectedServices || [],
      description: b.description || "",
      carModel: b.carModel || "",
      customerName: b.customerId?.name || "Unknown",
      customerEmail: b.customerId?.email || "",
      phone: b.phone || "",
      address: b.address || "",
      district: b.district || "",
      status: b.status,
      createdAt: b.createdAt,
      totalCost: b.totalCost || 0,
      // Pickup / Drop-off
      needsPickup: b.needsPickup || false,
      needsDropoff: b.needsDropoff || false,
      pickupCost: b.pickupCost || 0,
      dropoffCost: b.dropoffCost || 0,
      productCost: b.productCost || 0,
      serviceCategory: b.serviceCategory || "",
      // Extended vehicle details
      registrationNumber: b.registrationNumber || "",
      vehicleMake: b.vehicleMake || "",
      vehicleModel: b.vehicleModel || "",
      vehicleVariant: b.vehicleVariant || "",
      fuelType: b.fuelType || "",
      transmission: b.transmission || "",
      yearOfManufacture: b.yearOfManufacture || null,
      vin: b.vin || "",
      currentMileage: b.currentMileage || null,
      insuranceProvider: b.insuranceProvider || "",
      insuranceValidTill: b.insuranceValidTill || null,
      rcBook: b.rcBook || "",
      insuranceCopy: b.insuranceCopy || "",
      vehiclePhotos: b.vehiclePhotos || [],
      carYear: b.carYear || null,
    }));

    res.json({ success: true, bookings: shaped });
  } catch (err) {
    console.error("Bookings API error", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to load bookings" });
  }
};

// Update product cost for a booking
exports.updateProductCost = async (req, res) => {
  try {
    const providerId = req.user.id;
    const { bookingId, productCost } = req.body;
    if (!bookingId)
      return res
        .status(400)
        .json({ success: false, message: "Booking ID required" });
    const cost = Math.max(0, Number(productCost) || 0);
    const booking = await ServiceBooking.findOne({
      _id: bookingId,
      providerId,
    });
    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });

    const oldTotal = booking.totalCost || 0;
    const oldProductCost = booking.productCost || 0;
    booking.productCost = cost;
    booking.totalCost = oldTotal - oldProductCost + cost;

    booking.costHistory.push({
      from: oldTotal,
      to: booking.totalCost,
      changedAt: new Date(),
      changedBy: { id: providerId, role: "service-provider" },
    });

    await booking.save();
    res.json({
      success: true,
      totalCost: booking.totalCost,
      productCost: cost,
    });
  } catch (err) {
    console.error("Error updating product cost:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Aliases for route compatibility
exports.getDashboardService = exports.getDashboard;
exports.getApiDashboard = exports.getDashboard;
exports.getApiEarningsData = exports.getEarningsData;
exports.getApiReviews = exports.getReviews;
exports.getApiProfile = exports.getProfile;
exports.getApiRecentActivity = exports.getRecentActivity;
exports.getApiBookings = exports.getBookings;

// Profile Settings page
exports.getProfileSettings = async (req, res) => {
  try {
    res.render("service-provider/profileSettings", { user: req.session.user });
  } catch (err) {
    console.error("Error loading profile settings:", err);
    res.status(500).send("Internal Server Error");
  }
};

// Booking Management page
exports.getBookingManagement = async (req, res) => {
  try {
    res.render("service-provider/bookingManagement", {
      user: req.session.user,
    });
  } catch (err) {
    console.error("Error loading booking management:", err);
    res.status(500).send("Internal Server Error");
  }
};

// Customer Communication page
exports.getCustomerCommunication = async (req, res) => {
  try {
    res.render("service-provider/customerCommunication", {
      user: req.session.user,
    });
  } catch (err) {
    console.error("Error loading customer communication:", err);
    res.status(500).send("Internal Server Error");
  }
};
