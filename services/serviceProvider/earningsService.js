const mongoose = require("mongoose");
const ServiceBooking = require("../../models/serviceBooking");
const { getMonthName } = require("./helpers");

async function getEarningsPageData(providerId) {
  const completedBookings = await ServiceBooking.find({
    providerId,
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

  return {
    totalEarnings,
    pendingPayouts,
    availableBalance,
    transactions,
  };
}

async function getEarningsChartData(providerUserId, timeRange = "1") {
  const providerId = new mongoose.Types.ObjectId(providerUserId);
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
        { $group: { _id: null, total: { $sum: "$totalCost" } } },
      ]);

      const weekTotal = weeklyEarnings[0]?.total || 0;
      totalEarnings += weekTotal;
      data.push(weekTotal);
    }
  } else {
    const months = parseInt(timeRange, 10);

    for (let i = months - 1; i >= 0; i -= 1) {
      const date = new Date(currentDate);
      date.setMonth(currentDate.getMonth() - i);
      labels.push(getMonthName(date.getMonth()));

      const monthStartDate = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEndDate = new Date(date.getFullYear(), date.getMonth() + 1, 1);

      const monthlyEarnings = await ServiceBooking.aggregate([
        {
          $match: {
            providerId,
            status: "Ready",
            totalCost: { $exists: true },
            createdAt: { $gte: monthStartDate, $lt: monthEndDate },
          },
        },
        { $group: { _id: null, total: { $sum: "$totalCost" } } },
      ]);

      const monthTotal = monthlyEarnings[0]?.total || 0;
      totalEarnings += monthTotal;
      data.push(monthTotal);
    }
  }

  return {
    labels,
    data: data.map((amount) => Math.round(amount * 0.8)),
    totalEarnings: Math.round(totalEarnings * 0.8),
    timeRange,
  };
}

module.exports = {
  getEarningsPageData,
  getEarningsChartData,
};
