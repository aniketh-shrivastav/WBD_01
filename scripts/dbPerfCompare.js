/* eslint-disable no-console */
require("dotenv").config();
const mongoose = require("mongoose");

const Order = require("../models/Orders");
const Product = require("../models/Product");

async function compare(label, indexedQuery, collscanQuery) {
  const indexed = await indexedQuery.explain("executionStats");
  const collscan = await collscanQuery.explain("executionStats");

  const i = indexed.executionStats || {};
  const c = collscan.executionStats || {};

  return {
    label,
    indexedTimeMs: i.executionTimeMillis,
    collscanTimeMs: c.executionTimeMillis,
    timeSavedMs: (c.executionTimeMillis || 0) - (i.executionTimeMillis || 0),
    indexedDocsExamined: i.totalDocsExamined,
    collscanDocsExamined: c.totalDocsExamined,
    docsSaved: (c.totalDocsExamined || 0) - (i.totalDocsExamined || 0),
    indexedKeysExamined: i.totalKeysExamined,
    collscanKeysExamined: c.totalKeysExamined,
    nReturned: i.nReturned,
  };
}

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const sampleOrder = await Order.findOne({}, { userId: 1, items: 1 }).lean();
  const sampleProduct = await Product.findOne(
    { status: "approved" },
    { category: 1 },
  ).lean();

  if (!sampleOrder || !sampleProduct) {
    console.log("Not enough sample data to run comparison benchmark.");
    await mongoose.disconnect();
    return;
  }

  const results = [];

  results.push(
    await compare(
      "Order history by user + sort",
      Order.find({ userId: sampleOrder.userId })
        .sort({ placedAt: -1 })
        .limit(20),
      Order.find({ userId: sampleOrder.userId })
        .sort({ placedAt: -1 })
        .limit(20)
        .hint({ $natural: 1 }),
    ),
  );

  const sampleSellerId = (sampleOrder.items || [])[0]?.seller;
  if (sampleSellerId) {
    results.push(
      await compare(
        "Seller feed by items.seller + sort",
        Order.find({ "items.seller": sampleSellerId })
          .sort({ placedAt: -1 })
          .limit(20),
        Order.find({ "items.seller": sampleSellerId })
          .sort({ placedAt: -1 })
          .limit(20)
          .hint({ $natural: 1 }),
      ),
    );
  }

  results.push(
    await compare(
      "Approved products by category + name",
      Product.find({ status: "approved", category: sampleProduct.category })
        .sort({ name: 1 })
        .limit(30),
      Product.find({ status: "approved", category: sampleProduct.category })
        .sort({ name: 1 })
        .limit(30)
        .hint({ $natural: 1 }),
    ),
  );

  console.table(results);

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("DB perf comparison failed:", err.message);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
