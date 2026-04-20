const Product = require("../../models/Product");
const User = require("../../models/User");

function isSolrEnabled() {
  return (process.env.SEARCH_ENGINE || "").toLowerCase() === "solr";
}

function getSolrUpdateUrl() {
  const baseUrl = process.env.SOLR_BASE_URL || "http://localhost:8983";
  const collection = process.env.SOLR_COLLECTION || "products";
  const commitWithin = Number(process.env.SOLR_COMMIT_WITHIN_MS || 1000);
  return `${baseUrl.replace(/\/$/, "")}/solr/${collection}/update?commitWithin=${commitWithin}&wt=json`;
}

function normalizeImages(images) {
  if (!Array.isArray(images)) return [];
  return images
    .map((img) => (typeof img === "string" ? img : img?.url))
    .filter(Boolean);
}

async function resolveSellerVerificationStatus(productDoc) {
  if (productDoc?.seller && typeof productDoc.seller === "object") {
    if (productDoc.seller.verificationStatus) {
      return productDoc.seller.verificationStatus;
    }
  }

  const sellerId = productDoc?.seller;
  if (!sellerId) return "unverified";

  const seller = await User.findById(sellerId, "verificationStatus").lean();
  return seller?.verificationStatus || "unverified";
}

async function toSolrDoc(productDoc) {
  const sellerVerificationStatus =
    await resolveSellerVerificationStatus(productDoc);
  return {
    id: String(productDoc._id),
    name: productDoc.name || "",
    price: Number(productDoc.price || 0),
    description: productDoc.description || "",
    category: productDoc.category || "",
    subcategory: productDoc.subcategory || "",
    brand: productDoc.brand || "",
    quantity: Number(productDoc.quantity || 0),
    sku: productDoc.sku || "",
    compatibility: productDoc.compatibility || "",
    image: productDoc.image || "",
    images: normalizeImages(productDoc.images),
    imagePublicId: productDoc.imagePublicId || "",
    status: productDoc.status || "pending",
    createdAt: productDoc.createdAt
      ? new Date(productDoc.createdAt).toISOString()
      : new Date().toISOString(),
    sellerId: String(productDoc.seller || ""),
    sellerVerificationStatus,
  };
}

async function postSolrUpdate(payload) {
  const res = await fetch(getSolrUpdateUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const details = await res.text().catch(() => "");
    throw new Error(
      `Solr update failed: ${res.status}${details ? ` :: ${details}` : ""}`,
    );
  }
}

async function indexProduct(productId) {
  if (!isSolrEnabled()) return;

  try {
    const product = await Product.findById(productId).lean();
    if (!product) {
      await deleteProductFromIndex(productId);
      return;
    }

    const doc = await toSolrDoc(product);
    await postSolrUpdate([doc]);
  } catch (err) {
    console.warn("Solr indexProduct failed:", err.message);
  }
}

async function deleteProductFromIndex(productId) {
  if (!isSolrEnabled()) return;

  try {
    await postSolrUpdate({ delete: { id: String(productId) } });
  } catch (err) {
    console.warn("Solr deleteProductFromIndex failed:", err.message);
  }
}

async function reindexAllApprovedProducts() {
  if (!isSolrEnabled()) {
    return { indexed: 0, skipped: true, reason: "SEARCH_ENGINE is not solr" };
  }

  const products = await Product.find({ status: "approved" }).lean();
  const docs = [];
  for (const product of products) {
    docs.push(await toSolrDoc(product));
  }

  if (docs.length) {
    await postSolrUpdate(docs);
  }

  return { indexed: docs.length, skipped: false };
}

module.exports = {
  indexProduct,
  deleteProductFromIndex,
  reindexAllApprovedProducts,
};
