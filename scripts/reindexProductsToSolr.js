require("dotenv").config();

const connectDB = require("../db");
const { reindexAllApprovedProducts } = require("../services/search/solrIndexer");

async function main() {
  try {
    await connectDB();
    const result = await reindexAllApprovedProducts();

    if (result.skipped) {
      console.log(`[solr-reindex] skipped: ${result.reason}`);
      process.exit(0);
    }

    console.log(`[solr-reindex] indexed products: ${result.indexed}`);
    process.exit(0);
  } catch (err) {
    console.error("[solr-reindex] failed:", err);
    process.exit(1);
  }
}

main();
