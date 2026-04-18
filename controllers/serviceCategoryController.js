const ServiceCategory = require("../models/ServiceCategory");
const { deleteByPattern, withCache } = require("../utils/cacheClient");

const SERVICE_CATEGORY_TTL = Number(process.env.CACHE_TTL_CATEGORIES || 300);
const SERVICE_CATEGORIES_ALL_KEY = "cache:service-categories:all:v1";
const SERVICE_CATEGORIES_ACTIVE_KEY = "cache:service-categories:active:v1";

async function invalidateServiceCategoryCache() {
  await deleteByPattern("cache:service-categories:*");
}

const DEFAULT_CATEGORIES = [
  "Exterior Modification",
  "Interior Customization",
  "Audio System Upgrade",
  "Wrap / Paint",
  "Lighting Upgrade",
  "Performance Tuning",
  "Alloy Wheels / Tyres",
  "Body Kit Installation",
  "Seat Upholstery",
  "Sunroof Installation",
  "Ceramic Coating / PPF",
];

// Seed defaults if collection is empty
async function seedDefaults() {
  const count = await ServiceCategory.countDocuments();
  if (count === 0) {
    await ServiceCategory.insertMany(
      DEFAULT_CATEGORIES.map((name) => ({ name, active: true })),
    );
  }
}

// GET all categories (manager + public)
exports.getCategories = async (req, res) => {
  try {
    await seedDefaults();
    const { data } = await withCache(
      SERVICE_CATEGORIES_ALL_KEY,
      SERVICE_CATEGORY_TTL,
      async () => ServiceCategory.find().sort({ name: 1 }).lean(),
    );
    const categories = data;
    res.json({ success: true, categories });
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET only active categories (for service providers & customers)
exports.getActiveCategories = async (req, res) => {
  try {
    await seedDefaults();
    const { data } = await withCache(
      SERVICE_CATEGORIES_ACTIVE_KEY,
      SERVICE_CATEGORY_TTL,
      async () =>
        ServiceCategory.find({ active: true }).sort({ name: 1 }).lean(),
    );
    const categories = data;
    res.json({ success: true, categories });
  } catch (err) {
    console.error("Error fetching active categories:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST add a new category
exports.addCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Category name is required" });
    }
    const existing = await ServiceCategory.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    });
    if (existing) {
      return res
        .status(400)
        .json({ success: false, message: "Category already exists" });
    }
    const category = await ServiceCategory.create({
      name: name.trim(),
      active: true,
    });
    await invalidateServiceCategoryCache();
    res.json({ success: true, category });
  } catch (err) {
    console.error("Error adding category:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// PUT update a category
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, active } = req.body;
    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (active !== undefined) update.active = Boolean(active);
    const category = await ServiceCategory.findByIdAndUpdate(id, update, {
      new: true,
    });
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }
    await invalidateServiceCategoryCache();
    res.json({ success: true, category });
  } catch (err) {
    console.error("Error updating category:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// DELETE a category
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await ServiceCategory.findByIdAndDelete(id);
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }
    await invalidateServiceCategoryCache();
    res.json({ success: true, message: "Category deleted" });
  } catch (err) {
    console.error("Error deleting category:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
