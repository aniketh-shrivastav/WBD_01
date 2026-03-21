const ServiceBooking = require("../../models/serviceBooking");
const { getTimeAgo } = require("./helpers");

async function getRecentActivity(providerId, limit = 5) {
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
    const timeAgo = getTimeAgo(new Date(booking.createdAt));
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

  return activities;
}

module.exports = {
  getRecentActivity,
};
