const Product = require("../../models/Product");

const SOLR_SPECIAL_CHAR_PATTERN = /([+\-!(){}\[\]^"~*?:\\/]|&&|\|\|)/g;

function normalizeLimit(rawLimit) {
  const parsed = Number(rawLimit);
  if (!Number.isFinite(parsed)) return 30;
  return Math.max(1, Math.min(100, Math.trunc(parsed)));
}

function normalizeOffset(rawOffset) {
  const parsed = Number(rawOffset);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.trunc(parsed));
}

function escapeSolrTerm(value) {
  return String(value).replace(SOLR_SPECIAL_CHAR_PATTERN, "\\$1");
}

function buildSolrQuery(rawQuery) {
  const trimmed = String(rawQuery || "").trim();
  if (!trimmed) {
    return "*:*";
  }

  const terms = trimmed
    .split(/\s+/)
    .map((term) => escapeSolrTerm(term))
    .filter(Boolean);

  if (!terms.length) {
    return "*:*";
  }

  const exactClause = terms.join(" ");
  const fuzzyClause = terms
    .map((term) => {
      if (term.length <= 2) return term;
      if (term.length <= 5) return `${term}~1`;
      return `${term}~2`;
    })
    .join(" ");
  const prefixClause = terms.map((term) => `${term}*`).join(" ");

  if (fuzzyClause === exactClause && prefixClause === exactClause) {
    return exactClause;
  }

  const clauses = [exactClause];
  if (fuzzyClause !== exactClause) {
    clauses.push(fuzzyClause);
  }
  if (prefixClause !== exactClause && prefixClause !== fuzzyClause) {
    clauses.push(prefixClause);
  }

  return clauses.map((clause) => `(${clause})`).join(" OR ");
}

function buildMongoFilter({ q, category }) {
  const filter = { status: "approved" };
  if (category) {
    filter.category = category;
  }
  if (q) {
    filter.$text = { $search: q };
  }
  return filter;
}

async function mongoSearch({ q, category, limit, offset }) {
  const filter = buildMongoFilter({ q, category });

  const query = Product.find(filter)
    .populate("seller", "verificationStatus")
    .skip(offset)
    .limit(limit)
    .lean();

  if (q) {
    query.select({ score: { $meta: "textScore" } });
    query.sort({ score: { $meta: "textScore" }, createdAt: -1 });
  } else {
    query.sort({ createdAt: -1 });
  }

  const products = await query;
  products.sort((a, b) => {
    const aVerified = a.seller?.verificationStatus === "verified" ? 0 : 1;
    const bVerified = b.seller?.verificationStatus === "verified" ? 0 : 1;
    if (aVerified !== bVerified) return aVerified - bVerified;
    return 0;
  });

  return {
    engine: "mongo",
    products,
    total: products.length,
  };
}

async function solrSearch({ q, category, limit, offset }) {
  const baseUrl = process.env.SOLR_BASE_URL || "http://localhost:8983";
  const collection = process.env.SOLR_COLLECTION || "products";
  const solrQuery = buildSolrQuery(q);

  const params = new URLSearchParams({
    wt: "json",
    defType: "edismax",
    q: solrQuery,
    qf: "name^6 brand^4 sku^5 category^3 subcategory^2 compatibility^2 description^1",
    mm: "1<75%",
    rows: String(limit),
    start: String(offset),
    sort: q ? "score desc, createdAt desc" : "createdAt desc",
  });

  params.append("fq", "status:approved");
  if (category) {
    params.append(
      "fq",
      `category:\"${String(category).replace(/\"/g, '\\\"')}\"`,
    );
  }

  const url = `${baseUrl.replace(/\/$/, "")}/solr/${collection}/select?${params.toString()}`;

  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    throw new Error(`Solr query failed with status ${res.status}`);
  }

  const data = await res.json();
  const docs = data?.response?.docs || [];

  const products = docs.map((doc) => ({
    _id: doc.id,
    name: doc.name,
    price: doc.price,
    description: doc.description,
    category: doc.category,
    subcategory: doc.subcategory,
    brand: doc.brand,
    quantity: doc.quantity,
    sku: doc.sku,
    compatibility: doc.compatibility,
    image: doc.image,
    images: (doc.images || []).map((urlItem) => ({ url: urlItem })),
    imagePublicId: doc.imagePublicId,
    status: doc.status,
    createdAt: doc.createdAt,
    seller: {
      verificationStatus: doc.sellerVerificationStatus || "unverified",
    },
    score: doc.score,
  }));

  products.sort((a, b) => {
    const aVerified = a.seller?.verificationStatus === "verified" ? 0 : 1;
    const bVerified = b.seller?.verificationStatus === "verified" ? 0 : 1;
    if (aVerified !== bVerified) return aVerified - bVerified;
    return 0;
  });

  return {
    engine: "solr",
    products,
    total: Number(data?.response?.numFound || products.length),
  };
}

async function searchProducts(rawOptions = {}) {
  const q = String(rawOptions.q || "").trim();
  const category = String(rawOptions.category || "").trim();
  const limit = normalizeLimit(rawOptions.limit);
  const offset = normalizeOffset(rawOptions.offset);

  const preferredEngine = (process.env.SEARCH_ENGINE || "mongo").toLowerCase();

  if (preferredEngine === "solr") {
    try {
      return await solrSearch({ q, category, limit, offset });
    } catch (err) {
      console.warn(
        "Solr search unavailable, falling back to Mongo:",
        err.message,
      );
    }
  }

  return mongoSearch({ q, category, limit, offset });
}

module.exports = {
  searchProducts,
  __testables: {
    buildSolrQuery,
    escapeSolrTerm,
  },
};
