/* eslint-disable no-console */
require("dotenv").config();
const mongoose = require("mongoose");

const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Orders");
const ServiceBooking = require("../models/serviceBooking");
const Message = require("../models/Message");

async function connect() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required");
  }
  await mongoose.connect(process.env.MONGO_URI, {
    maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 20),
    minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE || 5),
  });
}

function pickPlanStats(label, explainOutput) {
  const stats = explainOutput.executionStats || {};
  return {
    label,
    executionTimeMillis: stats.executionTimeMillis,
    totalDocsExamined: stats.totalDocsExamined,
    totalKeysExamined: stats.totalKeysExamined,
    nReturned: stats.nReturned,
  };
}

async function run() {
  await connect();

  const checks = [];

  checks.push(
    pickPlanStats(
      "User auth lookup by email",
      await User.find({ email: { $exists: true } })
        .limit(1)
        .explain("executionStats"),
    ),
  );

  checks.push(
    pickPlanStats(
      "Order history by user sorted by placedAt",
      await Order.find({ userId: { $exists: true } })
        .sort({ placedAt: -1 })
        .limit(20)
        .explain("executionStats"),
    ),
  );

  checks.push(
    pickPlanStats(
      "Seller order feed by items.seller sorted by placedAt",
      await Order.find({ "items.seller": { $exists: true } })
        .sort({ placedAt: -1 })
        .limit(20)
        .explain("executionStats"),
    ),
  );

  checks.push(
    pickPlanStats(
      "Service provider bookings by provider/status/createdAt",
      await ServiceBooking.find({
        providerId: { $exists: true },
        status: { $in: ["Open", "Confirmed", "Ready", "Completed"] },
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .explain("executionStats"),
    ),
  );

  checks.push(
    pickPlanStats(
      "Product listing by status + category + name sort",
      await Product.find({ status: "approved" })
        .sort({ name: 1 })
        .limit(30)
        .explain("executionStats"),
    ),
  );

  checks.push(
    pickPlanStats(
      "Text search on products",
      await Product.find({ $text: { $search: "brake" }, status: "approved" })
        .limit(20)
        .explain("executionStats"),
    ),
  );

  checks.push(
    pickPlanStats(
      "Unread messages for manager",
      await Message.find({
        customerId: { $exists: true },
        readByManager: false,
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .explain("executionStats"),
    ),
  );

  console.table(checks);

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("DB perf report failed:", err.message);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
