const express = require("express");
const router = express.Router();
const User = require("../models/User");
const ServiceBooking = require("../models/serviceBooking");
const mongoose = require("mongoose");
const path = require("path");

// Import centralized middleware
const {
  isAuthenticated,
  isServiceProvider,
  serviceOnly,
} = require("../middleware");

// Routes

// Dashboard
router.get("/dashboardService", serviceOnly, async (req, res) => {
  const filePath = path.join(
    __dirname,
    "../public/service/dashboardService.html",
  );
  return res.sendFile(filePath);
});

// JSON API for dashboard (static HTML hydration)
router.get("/api/dashboard", serviceOnly, async (req, res) => {
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
});

// Profile Settings
router.get("/profileSettings", serviceOnly, async (req, res) => {
  const filePath = require("path").join(
    __dirname,
    "../public/service/profileSettings.html",
  );
  return res.sendFile(filePath);
});

// Booking Management
// This route handles rendering booking data for the service provider
router.get("/bookingManagement", serviceOnly, async (req, res) => {
  const filePath = require("path").join(
    __dirname,
    "../public/service/bookingManagement.html",
  );
  return res.sendFile(filePath);
});

router.post("/updateBookingStatus", serviceOnly, async (req, res) => {
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
      Completed: [], // Can't change from completed
      Rejected: [], // Can't change from rejected
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

    // Emit earnings update event when booking status changes to "Ready" or "Completed"
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

    // Also emit activity update for all booking status changes
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
});

router.post("/updateMultipleBookingStatus", serviceOnly, async (req, res) => {
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
});

// Earnings
router.get("/earnings", serviceOnly, async (req, res) => {
  try {
    const providerId = req.user.id;

    // Get all bookings for this provider with status "Ready"
    const completedBookings = await ServiceBooking.find({
      providerId: providerId,
      status: "Ready",
      totalCost: { $exists: true },
    });

    const totalEarnings = completedBookings.reduce(
      (sum, booking) => sum + booking.totalCost,
      0,
    );

    // Assuming all Ready bookings are considered for payout
    const pendingPayouts = totalEarnings; // You can change this if there's a status or flag to indicate if it's paid or not

    // Available balance is 80% after 20% commission deduction
    const availableBalance = Math.round(pendingPayouts * 0.8);

    const transactions = completedBookings.map((booking) => ({
      date: booking.date.toLocaleDateString(),
      amount: Math.round(booking.totalCost * 0.8),
      status: "Ready", // You can expand this logic later
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
});

// API endpoint for dynamic earnings data
router.get("/api/earnings-data", serviceOnly, async (req, res) => {
  try {
    const providerId = new mongoose.Types.ObjectId(req.user.id);
    const timeRange = req.query.timeRange || "1"; // 1 = current month, 6 = 6 months, 12 = 1 year

    const currentDate = new Date();
    const labels = [];
    const data = [];
    let totalEarnings = 0;

    if (timeRange === "1") {
      // Weekly breakdown for current month
      const daysInMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0,
      ).getDate();
      const monthName = getMonthName(currentDate.getMonth());

      for (let weekStart = 1; weekStart <= daysInMonth; weekStart += 7) {
        const weekEnd = Math.min(weekStart + 6, daysInMonth);
        labels.push(`${monthName} ${weekStart}-${weekEnd}`);

        // Get earnings for this week
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
      // Monthly breakdown for 6 months or 1 year
      const months = parseInt(timeRange);
      for (let i = months - 1; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setMonth(currentDate.getMonth() - i);
        const monthName = getMonthName(date.getMonth());
        labels.push(monthName);

        // Get earnings for this month
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

    // Apply 80% commission (20% deduction)
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
});

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

// Customer Communication
router.get("/customerCommunication", serviceOnly, (req, res) => {
  res.render("service/customerCommunication");
});
router.get("/reviews", serviceOnly, async (req, res) => {
  const filePath = path.join(__dirname, "../public/service/reviews.html");
  return res.sendFile(filePath);
});

// JSON API for reviews (for static HTML hydration)
router.get("/api/reviews", serviceOnly, async (req, res) => {
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
});

// DELETE /service/profile/delete/:id
router.delete("/profile/delete/:id", async (req, res) => {
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
});

router.put("/updateBooking", serviceOnly, async (req, res) => {
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
});

// Add this in your service routes
router.post("/updateCost/:id", serviceOnly, async (req, res) => {
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
});

// Updated rating submission route
router.post("/submit-rating/:id", async (req, res) => {
  try {
    const { rating, review } = req.body;
    const bookingId = req.params.id;

    // Validate rating
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
    updatedBooking.status = "Completed"; // Ensure status is marked as completed
    updatedBooking.statusHistory = updatedBooking.statusHistory || [];
    updatedBooking.statusHistory.push({
      from: prevStatus || null,
      to: "Completed",
      changedAt: new Date(),
      changedBy: { id: updatedBooking.customerId?._id, role: "customer" },
    });
    await updatedBooking.save();

    // Update provider's average rating
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
});

// Helper function to update provider's average rating
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

// New API endpoint to get service provider profile data
router.get("/api/profile", serviceOnly, async (req, res) => {
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
      },
    });
  } catch (err) {
    console.error("Profile API error", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// API endpoint for recent activity
router.get("/api/recent-activity", serviceOnly, async (req, res) => {
  try {
    const providerId = req.user.id;
    const limit = parseInt(req.query.limit) || 5; // Default to 5 activities

    // Get recent bookings with various statuses
    const recentBookings = await ServiceBooking.find({ providerId })
      .populate("customerId", "name")
      .sort({ createdAt: -1 })
      .limit(limit * 2) // Get more to filter
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
});

function getTimeAgo(date) {
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return date.toLocaleDateString();
}

// Static JSON API for booking management (service provider)
router.get("/api/bookings", serviceOnly, async (req, res) => {
  try {
    const providerId = req.user.id;
    let bookings = await ServiceBooking.find({ providerId })
      .populate("customerId", "name email")
      .sort({ createdAt: -1 })
      .lean();

    // Build map for cost calculation if needed
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
    }));

    res.json({ success: true, bookings: shaped });
  } catch (err) {
    console.error("Bookings API error", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to load bookings" });
  }
});

module.exports = router;
