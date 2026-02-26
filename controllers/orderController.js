const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Order = require("../models/Orders");
const CustomerProfile = require("../models/CustomerProfile");
const User = require("../models/User");

const isAuthenticated = (req, res, next) => {
  if (req.session.user) return next();
  res.redirect("/login");
};

exports.createOrderFromCart = async (req, res) => {
  try {
    const userId = req.session.user.id;

    const cart = await Cart.findOne({ userId });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cart is empty. Please add items to your cart before placing an order.",
      });
    }

    // Step 1: Fetch products and prepare order items
    const orderItems = [];
    for (const item of cart.items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.productId} not found.`,
        });
      }

      // Check stock before placing order
      if (item.quantity > product.quantity) {
        return res.status(400).json({
          success: false,
          message: `Not enough stock for product ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}`,
        });
      }

      orderItems.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: item.quantity,
        seller: product.seller,
        itemStatus: "pending", // Initialize each item with pending status
        itemStatusHistory: [
          {
            from: null,
            to: "pending",
            changedAt: new Date(),
            changedBy: { id: userId, role: "customer" },
          },
        ],
      });
    }

    // Step 2: Group items by seller
    const itemsBySeller = {};
    for (const item of orderItems) {
      const sellerId = item.seller.toString();
      if (!itemsBySeller[sellerId]) {
        itemsBySeller[sellerId] = [];
      }
      itemsBySeller[sellerId].push(item);
    }

    // Step 3: Get customer profile info
    let address = "";
    let district = "";

    const profile = await CustomerProfile.findOne({ userId });
    if (profile) {
      address = profile.address;
      district = profile.district;
    } else {
      const user = await User.findById(userId);
      if (user) {
        address = user.address;
        district = user.district;
      }
    }

    if (!address || !district) {
      return res.status(400).json({
        success: false,
        message:
          "Delivery address or district not found. Please update your profile with complete address and district information.",
      });
    }

    // Step 4: Create separate orders per seller
    const createdOrders = [];
    for (const sellerId in itemsBySeller) {
      const sellerItems = itemsBySeller[sellerId];
      const totalAmount = sellerItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      const order = new Order({
        userId,
        items: sellerItems,
        totalAmount,
        deliveryAddress: address,
        district,
        orderStatus: "pending",
        paymentStatus: "paid",
        orderStatusHistory: [
          {
            from: null,
            to: "pending",
            changedAt: new Date(),
            changedBy: { id: userId, role: "customer" },
          },
        ],
      });

      await order.save();
      createdOrders.push(order);
    }

    // Step 5: Reduce stock quantity for each product
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { quantity: -item.quantity }, // Decrease stock
      });
    }

    // Step 6: Clear cart
    await Cart.deleteOne({ userId });

    res.status(201).json({
      success: true,
      message: "Orders placed successfully",
      orders: createdOrders,
    });
  } catch (err) {
    console.error("Order creation error:", err);
    res.status(500).json({
      success: false,
      message:
        err.message ||
        "Failed to create orders. Please ensure your profile has complete address and district information.",
    });
  }
};
