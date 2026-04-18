/* eslint-disable no-console */
require("dotenv").config();
const mongoose = require("mongoose");

const Product = require("../models/Product");
const ProductCategory = require("../models/ProductCategory");
const ServiceCategory = require("../models/ServiceCategory");
const catalogService = require("../services/customer/catalogService");
const managerApiService = require("../services/manager/apiService");
const adminApiService = require("../services/admin/apiService");
const {
  getClient,
  deleteByPattern,
  withCache,
  closeClient,
} = require("../utils/cacheClient");

const N = Number(process.env.CACHE_PERF_ITERATIONS || 25);

function nowMs() {
  const [s, ns] = process.hrtime();
  return s * 1000 + ns / 1e6;
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

async function measure(fn, iterations) {
  const times = [];
  for (let i = 0; i < iterations; i += 1) {
    const start = nowMs();
    await fn();
    times.push(Number((nowMs() - start).toFixed(2)));
  }
  return times;
}

function summarize(name, uncachedTimes, cachedWarmTimes, cachedColdMs) {
  const uncachedP50 = percentile(uncachedTimes, 50);
  const uncachedP95 = percentile(uncachedTimes, 95);
  const cachedP50 = percentile(cachedWarmTimes, 50);
  const cachedP95 = percentile(cachedWarmTimes, 95);

  const p50Improvement = uncachedP50
    ? ((uncachedP50 - cachedP50) / uncachedP50) * 100
    : 0;
  const p95Improvement = uncachedP95
    ? ((uncachedP95 - cachedP95) / uncachedP95) * 100
    : 0;

  return {
    name,
    uncachedP50Ms: Number(uncachedP50.toFixed(2)),
    uncachedP95Ms: Number(uncachedP95.toFixed(2)),
    cachedColdMs: Number(cachedColdMs.toFixed(2)),
    cachedWarmP50Ms: Number(cachedP50.toFixed(2)),
    cachedWarmP95Ms: Number(cachedP95.toFixed(2)),
    p50ImprovementPct: Number(p50Improvement.toFixed(2)),
    p95ImprovementPct: Number(p95Improvement.toFixed(2)),
  };
}

async function runSuite(name, uncachedFn, cachedFn, cachePattern) {
  await deleteByPattern(cachePattern);
  const uncachedTimes = await measure(uncachedFn, N);

  await deleteByPattern(cachePattern);
  const coldStart = nowMs();
  await cachedFn();
  const cachedColdMs = Number((nowMs() - coldStart).toFixed(2));
  const cachedWarmTimes = await measure(cachedFn, N);

  return summarize(name, uncachedTimes, cachedWarmTimes, cachedColdMs);
}

async function connectMongo() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required");
  }
  await mongoose.connect(process.env.MONGO_URI);
}

async function main() {
  await connectMongo();

  const redis = await getClient();
  if (!redis || !redis.isReady) {
    throw new Error(
      "Redis is not reachable. Start Redis and set REDIS_URL before running this report.",
    );
  }

  const reports = [];

  reports.push(
    await runSuite(
      "Product listing (customer index API)",
      async () => {
        const products = await Product.find({ status: "approved" })
          .populate("seller", "verificationStatus")
          .lean();
        products.sort((a, b) => {
          const av = a.seller?.verificationStatus === "verified" ? 0 : 1;
          const bv = b.seller?.verificationStatus === "verified" ? 0 : 1;
          return av - bv;
        });
      },
      async () => {
        await catalogService.getIndexApiData();
      },
      "cache:products:index:*",
    ),
  );

  reports.push(
    await runSuite(
      "Service categories (active list)",
      async () => {
        await ServiceCategory.find({ active: true }).sort({ name: 1 }).lean();
      },
      async () => {
        await withCache(
          "cache:service-categories:active:v1",
          Number(process.env.CACHE_TTL_CATEGORIES || 300),
          () => ServiceCategory.find({ active: true }).sort({ name: 1 }).lean(),
        );
      },
      "cache:service-categories:*",
    ),
  );

  reports.push(
    await runSuite(
      "Product categories (active list)",
      async () => {
        await ProductCategory.find({ active: true }).sort({ name: 1 }).lean();
      },
      async () => {
        await withCache(
          "cache:product-categories:active:v1",
          Number(process.env.CACHE_TTL_CATEGORIES || 300),
          () => ProductCategory.find({ active: true }).sort({ name: 1 }).lean(),
        );
      },
      "cache:product-categories:*",
    ),
  );

  reports.push(
    await runSuite(
      "Manager dashboard aggregates",
      async () => {
        await managerApiService.collectDashboardStats();
      },
      async () => {
        await withCache(
          "cache:dashboard:manager:api:v1",
          Number(process.env.CACHE_TTL_DASHBOARD || 60),
          managerApiService.collectDashboardStats,
        );
      },
      "cache:dashboard:manager:*",
    ),
  );

  reports.push(
    await runSuite(
      "Admin dashboard aggregates",
      async () => {
        await adminApiService.collectAdminDashboardStats();
      },
      async () => {
        await withCache(
          "cache:dashboard:admin:api:v1",
          Number(process.env.CACHE_TTL_DASHBOARD || 60),
          adminApiService.collectAdminDashboardStats,
        );
      },
      "cache:dashboard:admin:*",
    ),
  );

  console.table(reports);

  await mongoose.disconnect();
  await closeClient();
}

main().catch(async (err) => {
  console.error("Cache performance report failed:", err.message);
  try {
    await mongoose.disconnect();
  } catch {}
  try {
    await closeClient();
  } catch {}
  process.exit(1);
});
