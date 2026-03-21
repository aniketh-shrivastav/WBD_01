const serviceProviderService = require("../services/serviceProviderService");
const { createNotification } = require("./notificationController");

exports.getDashboard = async (req, res) => {
  try {
    const data = await serviceProviderService.getDashboardData(req.user.id);
    return res.json(data);
  } catch (err) {
    console.error("Dashboard API error", err);
    return res.status(500).json({ error: "Failed to load dashboard data" });
  }
};

exports.updateBookingStatus = async (req, res) => {
  const { orderId, newStatus } = req.body;

  try {
    const result = await serviceProviderService.updateBookingStatus(
      orderId,
      newStatus,
      req.session.user?.id,
    );

    try {
      const io = req.app.get("io");
      await createNotification(result.statusNotification, io);
    } catch (error) {
      console.error("Failed to create service status notification:", error);
    }

    const io = req.app.get("io");
    if (io && result.booking.providerId) {
      if (result.emitEarnings) {
        io.to(`provider_earnings_${result.booking.providerId}`).emit(
          "earnings:updated",
          {
            providerId: result.booking.providerId,
            newEarning: result.booking.totalCost,
            timestamp: new Date(),
          },
        );
      }

      io.to(`provider_earnings_${result.booking.providerId}`).emit(
        "activity:updated",
        {
          providerId: result.booking.providerId,
          timestamp: new Date(),
        },
      );
    }

    return res.json({ success: true });
  } catch (err) {
    if (err.status) {
      return res
        .status(err.status)
        .json({ success: false, message: err.message });
    }

    console.error("Error updating booking status:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateMultipleBookingStatus = async (req, res) => {
  const { orderIds, newStatus } = req.body;

  try {
    await serviceProviderService.updateMultipleBookingStatus(
      orderIds,
      newStatus,
      req.session.user?.id,
    );

    return res.json({ success: true });
  } catch (err) {
    if (err.status) {
      return res
        .status(err.status)
        .json({ success: false, message: err.message });
    }

    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getEarnings = async (req, res) => {
  try {
    const payoutData = await serviceProviderService.getEarningsPageData(
      req.user.id,
    );
    return res.render("service/earnings", { payoutData });
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server Error");
  }
};

exports.getEarningsData = async (req, res) => {
  try {
    const data = await serviceProviderService.getEarningsChartData(
      req.user.id,
      req.query.timeRange || "1",
    );

    return res.json(data);
  } catch (err) {
    console.error("Earnings API error", err);
    return res.status(500).json({ error: "Failed to load earnings data" });
  }
};

exports.getReviews = async (req, res) => {
  try {
    const reviews = await serviceProviderService.getReviews(req.user.id);
    return res.json({ success: true, reviews });
  } catch (error) {
    console.error("Reviews API error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load reviews" });
  }
};

exports.deleteProfile = async (req, res) => {
  try {
    await serviceProviderService.deleteProfile(req.params.id);
    return res
      .status(200)
      .json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    if (error.status) {
      return res
        .status(error.status)
        .json({ success: false, message: error.message });
    }

    console.error("Error deleting account:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateBooking = async (req, res) => {
  const { orderId, status, totalCost } = req.body;

  try {
    const result = await serviceProviderService.updateBooking(
      orderId,
      status,
      totalCost,
      req.session.user?.id,
    );

    if (result.priceNotification) {
      try {
        const io = req.app.get("io");
        await createNotification(result.priceNotification, io);
      } catch (error) {
        console.error("Failed to create price notification:", error);
      }
    }

    return res.status(200).send("Booking updated successfully");
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).send("Booking not found");
    }

    console.error(err);
    return res.status(500).send("Error updating booking");
  }
};

exports.updateCost = async (req, res) => {
  const { id } = req.params;
  const { totalCost } = req.body;

  try {
    const result = await serviceProviderService.updateCost(
      id,
      totalCost,
      req.session.user?.id,
    );

    try {
      const io = req.app.get("io");
      await createNotification(result.priceNotification, io);
    } catch (error) {
      console.error("Failed to create price notification:", error);
    }

    return res.redirect("/service/bookingManagement");
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).send("Booking not found");
    }

    console.error("Cost update failed:", error);
    return res.status(500).send("Failed to update cost");
  }
};

exports.submitRating = async (req, res) => {
  try {
    const updatedBooking = await serviceProviderService.submitRating(
      req.params.id,
      req.body.rating,
      req.body.review,
    );

    return res.json({
      success: true,
      message: "Rating submitted successfully!",
      booking: updatedBooking,
    });
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ error: error.message });
    }

    if (error.status === 404) {
      return res.status(404).json({ error: error.message });
    }

    console.error("Rating submission error:", error);
    return res.status(500).json({ error: "Failed to submit rating" });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await serviceProviderService.getProfile(req.user.id);
    return res.json({ success: true, user });
  } catch (err) {
    if (err.status) {
      return res
        .status(err.status)
        .json({ success: false, message: err.message });
    }

    console.error("Profile API error", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getRecentActivity = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 5;
    const activities = await serviceProviderService.getRecentActivity(
      req.user.id,
      limit,
    );

    return res.json({ success: true, activities });
  } catch (error) {
    console.error("Recent activity API error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load recent activity" });
  }
};

exports.getBookings = async (req, res) => {
  try {
    const bookings = await serviceProviderService.getBookings(req.user.id);
    return res.json({ success: true, bookings });
  } catch (err) {
    console.error("Bookings API error", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load bookings" });
  }
};

exports.updateProductCost = async (req, res) => {
  try {
    const result = await serviceProviderService.updateProductCost(
      req.user.id,
      req.body.bookingId,
      req.body.productCost,
    );

    try {
      const io = req.app.get("io");
      await createNotification(result.priceNotification, io);
    } catch (error) {
      console.error("Failed to create product cost notification:", error);
    }

    return res.json({
      success: true,
      totalCost: result.booking.totalCost,
      productCost: result.cost,
    });
  } catch (err) {
    if (err.status) {
      return res
        .status(err.status)
        .json({ success: false, message: err.message });
    }

    console.error("Error updating product cost:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getDashboardService = exports.getDashboard;
exports.getApiDashboard = exports.getDashboard;
exports.getApiEarningsData = exports.getEarningsData;
exports.getApiReviews = exports.getReviews;
exports.getApiProfile = exports.getProfile;
exports.getApiRecentActivity = exports.getRecentActivity;
exports.getApiBookings = exports.getBookings;

exports.getProfileSettings = async (req, res) => {
  try {
    const data = await serviceProviderService.getProfileSettingsPageData(
      req.session.user,
    );
    return res.render("service-provider/profileSettings", data);
  } catch (err) {
    console.error("Error loading profile settings:", err);
    return res.status(500).send("Internal Server Error");
  }
};

exports.getBookingManagement = async (req, res) => {
  try {
    const data = await serviceProviderService.getBookingManagementPageData(
      req.session.user,
    );
    return res.render("service-provider/bookingManagement", data);
  } catch (err) {
    console.error("Error loading booking management:", err);
    return res.status(500).send("Internal Server Error");
  }
};

exports.getCustomerCommunication = async (req, res) => {
  try {
    const data = await serviceProviderService.getCustomerCommunicationPageData(
      req.session.user,
    );
    return res.render("service-provider/customerCommunication", data);
  } catch (err) {
    console.error("Error loading customer communication:", err);
    return res.status(500).send("Internal Server Error");
  }
};
