const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Order = require("../models/Orders");
const CustomerProfile = require("../models/CustomerProfile");
const User = require("../models/User");
const { createNotification } = require("./notificationController");
const {
  buildAddressFromLegacy,
  formatDeliveryAddress,
  validateDeliveryAddress,
} = require("../utils/deliveryAddressUtils");
const { getDisplayOrderId } = require("../utils/orderIdUtils");

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

    // Step 3: Get and validate delivery address
    const reqDeliveryAddress = req.body?.deliveryAddress;
    let deliveryAddress = null;

    if (reqDeliveryAddress && typeof reqDeliveryAddress === "object") {
      const customValidation = validateDeliveryAddress(reqDeliveryAddress, {
        requireAll: true,
      });

      if (!customValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: "Invalid custom delivery address.",
          errors: customValidation.errors,
        });
      }

      deliveryAddress = customValidation.value;
    } else {
      const profile = await CustomerProfile.findOne({ userId }).lean();

      if (profile?.deliveryAddress?.addressLine1) {
        deliveryAddress = profile.deliveryAddress;
      } else if (profile?.address || profile?.district) {
        deliveryAddress = buildAddressFromLegacy(
          profile.address,
          profile.district,
        );
      } else {
        const user = await User.findById(userId).lean();
        deliveryAddress = buildAddressFromLegacy(user?.address, user?.district);
      }
    }

    const profileAddressValidation = validateDeliveryAddress(deliveryAddress, {
      requireAll: true,
    });

    if (!profileAddressValidation.isValid) {
      return res.status(400).json({
        success: false,
        message:
          "Complete delivery address not found. Please update your profile with addressLine1, city, state, postalCode, and country.",
        errors: profileAddressValidation.errors,
      });
    }

    const validatedAddress = profileAddressValidation.value;
    const useCustomAddress = !!reqDeliveryAddress;

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
        deliveryAddress: formatDeliveryAddress(validatedAddress),
        deliveryAddressDetails: validatedAddress,
        district: validatedAddress.city,
        useCustomAddress,
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

    // Step 7: Send notifications for each new order
    const io = req.app.get("io");
    for (const order of createdOrders) {
      const itemNames = order.items.map((i) => i.name).join(", ");
      try {
        await createNotification(
          {
            customerId: userId,
            type: "new_order",
            title: "New Order Placed",
            message: `Your order #${getDisplayOrderId(order)} for ${itemNames} (₹${order.totalAmount}) has been placed successfully.`,
            referenceId: order._id,
            referenceModel: "Order",
          },
          io,
        );
      } catch (e) {
        console.error("Failed to create order notification:", e);
      }
    }

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
        "Failed to create orders. Please ensure your profile has a complete delivery address.",
    });
  }
};
