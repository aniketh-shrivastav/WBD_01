const ProductCategory = require("../models/ProductCategory");

const DEFAULT_CATEGORIES = [
  {
    name: "Exterior Customization",
    subcategories: [
      "Body Kits",
      "Spoilers",
      "Car Wraps",
      "Decals",
      "Alloy Wheels",
      "Grilles",
      "Chrome Deletes",
      "Mud Flaps",
      "Window Visors",
    ],
  },
  {
    name: "Interior Customization",
    subcategories: [
      "Seat Covers / Upholstery",
      "Ambient Lighting",
      "Dashboard Kits",
      "Steering Wheels",
      "Floor Mats",
      "Armrests",
      "Roof Lining",
    ],
  },
  {
    name: "Lighting & Electrical",
    subcategories: [
      "Headlights",
      "Tail Lights",
      "DRLs",
      "Fog Lamps",
      "Underglow",
      "Interior LED Kits",
    ],
  },
  {
    name: "Audio & Infotainment",
    subcategories: [
      "Android Systems",
      "Subwoofers",
      "Amplifiers",
      "Speakers",
      "Reverse Camera",
      "Dashcams",
    ],
  },
  {
    name: "Performance Upgrades",
    subcategories: [
      "Exhaust Systems",
      "ECU Tuning",
      "Air Intake",
      "Brake Kits",
      "Suspension",
      "Turbo Kits",
    ],
    requiresCompliance: true,
  },
  {
    name: "Protection & Detailing",
    subcategories: [
      "Ceramic Coating",
      "PPF",
      "Interior Detailing",
      "Underbody Coating",
      "Anti-rust Treatment",
    ],
  },
  {
    name: "Utility & Accessories",
    subcategories: [
      "Roof Racks",
      "Phone Mounts",
      "Organizers",
      "Air Compressors",
      "Car Covers",
    ],
  },
];

// Seed defaults if collection is empty
async function seedDefaults() {
  const count = await ProductCategory.countDocuments();
  if (count === 0) {
    await ProductCategory.insertMany(
      DEFAULT_CATEGORIES.map((c) => ({
        name: c.name,
        subcategories: c.subcategories || [],
        active: true,
        requiresCompliance: c.requiresCompliance || false,
      })),
    );
  }
}

// GET all categories (manager view)
exports.getCategories = async (req, res) => {
  try {
    await seedDefaults();
    const categories = await ProductCategory.find().sort({ name: 1 }).lean();
    res.json({ success: true, categories });
  } catch (err) {
    console.error("Error fetching product categories:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET active categories only (for sellers & customers)
exports.getActiveCategories = async (req, res) => {
  try {
    await seedDefaults();
    const categories = await ProductCategory.find({ active: true })
      .sort({ name: 1 })
      .lean();
    res.json({ success: true, categories });
  } catch (err) {
    console.error("Error fetching active product categories:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST add a new category
exports.addCategory = async (req, res) => {
  try {
    const { name, subcategories, requiresCompliance } = req.body;
    if (!name || !name.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Category name is required" });
    }
    const existing = await ProductCategory.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    });
    if (existing) {
      return res
        .status(400)
        .json({ success: false, message: "Category already exists" });
    }
    const subs = Array.isArray(subcategories)
      ? subcategories.map((s) => s.trim()).filter(Boolean)
      : [];
    const category = await ProductCategory.create({
      name: name.trim(),
      subcategories: subs,
      active: true,
      requiresCompliance: !!requiresCompliance,
    });
    res.json({ success: true, category });
  } catch (err) {
    console.error("Error adding product category:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// PUT update a category
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, active, subcategories, requiresCompliance } = req.body;
    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (active !== undefined) update.active = Boolean(active);
    if (requiresCompliance !== undefined)
      update.requiresCompliance = Boolean(requiresCompliance);
    if (subcategories !== undefined) {
      update.subcategories = Array.isArray(subcategories)
        ? subcategories.map((s) => s.trim()).filter(Boolean)
        : [];
    }
    const category = await ProductCategory.findByIdAndUpdate(id, update, {
      new: true,
    });
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }
    res.json({ success: true, category });
  } catch (err) {
    console.error("Error updating product category:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST add a subcategory to an existing category
exports.addSubcategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { subcategory } = req.body;
    if (!subcategory || !subcategory.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Subcategory name is required" });
    }
    const category = await ProductCategory.findById(id);
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }
    const trimmed = subcategory.trim();
    const duplicate = category.subcategories.some(
      (s) => s.toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) {
      return res
        .status(400)
        .json({ success: false, message: "Subcategory already exists" });
    }
    category.subcategories.push(trimmed);
    await category.save();
    res.json({ success: true, category });
  } catch (err) {
    console.error("Error adding subcategory:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// DELETE remove a subcategory from a category
exports.removeSubcategory = async (req, res) => {
  try {
    const { id, subIndex } = req.params;
    const category = await ProductCategory.findById(id);
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }
    const idx = parseInt(subIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= category.subcategories.length) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid subcategory index" });
    }
    category.subcategories.splice(idx, 1);
    await category.save();
    res.json({ success: true, category });
  } catch (err) {
    console.error("Error removing subcategory:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// DELETE a category
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await ProductCategory.findByIdAndDelete(id);
    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }
    res.json({ success: true, message: "Category deleted" });
  } catch (err) {
    console.error("Error deleting product category:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
