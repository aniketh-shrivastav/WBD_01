const express = require("express");
const Cart = require("../models/Cart");
const router = express.Router();
const Product = require("../models/Product");

const customerOnly = (req, res, next) => {
  if (req.session.user?.role === "customer") return next();
  res.status(403).send("Access Denied: Customers Only");
};
// GET Cart
router.get("/:userId", async (req, res) => {
  const cart = await Cart.findOne({ userId: req.params.userId });
  res.json(cart || { items: [] });
});

// DELETE Remove Item
router.delete("/remove/:userId", async (req, res) => {
  const { productId } = req.body;
  await Cart.updateOne(
    { userId: req.params.userId },
    {
      $pull: { items: { productId } },
    },
  );
  if (req.headers.accept && req.headers.accept.includes("application/json")) {
    return res.json({ success: true });
  }
  res.sendStatus(200);
});

// POST Place Order
router.post("/place-order/:userId", async (req, res) => {
  const cart = await Cart.findOne({ userId: req.params.userId });
  if (!cart || cart.items.length === 0) return res.sendStatus(400);

  const arrival = new Date();
  arrival.setDate(arrival.getDate() + Math.floor(Math.random() * 3) + 5);

  const order = {
    cart: cart.items,
    paymentMethod: req.body.paymentMethod,
    arrivalDate: arrival,
  };

  // Store order logic here (e.g. in Order model)...

  await Cart.deleteOne({ userId: req.params.userId }); // Clear cart
  res.sendStatus(200);
});

router.put("/update/:userId", customerOnly, async (req, res) => {
  try {
    console.log("Update route hit");

    const { userId } = req.params;
    const { productId, action } = req.body;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    const item = cart.items.find(
      (item) => item.productId === productId.toString(),
    );
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found in cart" });
    }

    // Step 1: Get the actual product from DB to check available stock
    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    if (action === "increase") {
      // Check if increasing exceeds stock
      if (item.quantity + 1 > product.quantity) {
        return res
          .status(400)
          .json({ success: false, message: "Not enough stock available" });
      }
      item.quantity += 1;
    } else if (action === "decrease") {
      item.quantity -= 1;
      if (item.quantity <= 0) {
        // Remove item if quantity is 0
        cart.items = cart.items.filter(
          (i) => i.productId !== productId.toString(),
        );
      }
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid action" });
    }

    await cart.save();
    if (req.headers.accept && req.headers.accept.includes("application/json")) {
      return res.json({
        success: true,
        message: "Cart updated",
        items: cart.items,
      });
    }
    res.redirect("/customer/cart");
  } catch (error) {
    console.error("Cart update error:", error.message);
    res.status(500).json({ success: false, message: "Error updating cart" });
  }
});

module.exports = router;
