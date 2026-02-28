const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/serviceCategoryController");
const { isAuthenticated, isManager } = require("../middleware");

// Public: active categories (for SP profile settings + customer booking)
router.get("/active", isAuthenticated, ctrl.getActiveCategories);

// Manager only: full CRUD
router.get("/", isAuthenticated, isManager, ctrl.getCategories);
router.post("/", isAuthenticated, isManager, ctrl.addCategory);
router.put("/:id", isAuthenticated, isManager, ctrl.updateCategory);
router.delete("/:id", isAuthenticated, isManager, ctrl.deleteCategory);

module.exports = router;
