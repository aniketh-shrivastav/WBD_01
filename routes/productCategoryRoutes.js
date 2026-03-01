const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/productCategoryController");
const { isAuthenticated, isManager } = require("../middleware");

// Public: active categories (for sellers listing products)
router.get("/active", isAuthenticated, ctrl.getActiveCategories);

// Manager only: full CRUD
router.get("/", isAuthenticated, isManager, ctrl.getCategories);
router.post("/", isAuthenticated, isManager, ctrl.addCategory);
router.put("/:id", isAuthenticated, isManager, ctrl.updateCategory);
router.delete("/:id", isAuthenticated, isManager, ctrl.deleteCategory);

// Subcategory management (manager only)
router.post(
  "/:id/subcategory",
  isAuthenticated,
  isManager,
  ctrl.addSubcategory,
);
router.delete(
  "/:id/subcategory/:subIndex",
  isAuthenticated,
  isManager,
  ctrl.removeSubcategory,
);

module.exports = router;
