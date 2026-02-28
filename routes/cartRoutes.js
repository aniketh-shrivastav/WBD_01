const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");

const customerOnly = (req, res, next) => {
  if (req.session.user?.role === "customer") return next();
  res.status(403).send("Access Denied: Customers Only");
};

router.get("/:userId", cartController.getCart);
router.delete("/remove/:userId", cartController.removeItem);
router.post("/place-order/:userId", cartController.placeOrder);
router.put("/update/:userId", customerOnly, cartController.updateCart);

module.exports = router;
