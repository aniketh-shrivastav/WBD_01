const path = require("path");
const fs = require("fs");
const os = require("os");
const mongoose = require("mongoose");
const AdmZip = require("adm-zip");
const csvParser = require("csv-parser");
const ExcelJS = require("exceljs");

const User = require("../models/User");
const SellerProfile = require("../models/sellerProfile");
const cloudinary = require("../config/cloudinaryConfig");
const Product = require("../models/Product");
const Order = require("../models/Orders");
const Cart = require("../models/Cart");
const ProductReview = require("../models/ProductReview");

function deriveOrderStatus(items, fallback = "pending") {
  if (!Array.isArray(items) || items.length === 0) return fallback;
  const statuses = items.map((item) => item.itemStatus || fallback);

  if (statuses.every((s) => s === "cancelled")) return "cancelled";
  if (statuses.every((s) => s === "delivered")) return "delivered";
  if (statuses.some((s) => s === "shipped")) return "shipped";
  if (statuses.some((s) => s === "confirmed")) return "confirmed";
  return "pending";
}

async function uploadProfilePictureIfPresent(file, folderName) {
  if (!file) return null;
  try {
    const uploadRes = await cloudinary.uploader.upload(file.path, {
      folder: folderName,
      resource_type: "image",
      timeout: 120000,
    });
    return uploadRes.secure_url;
  } finally {
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  }
}

// Dashboard JSON API
exports.getDashboard = async (req, res) => {
  try {
    const sellerId = req.user.id;

    const allOrders = await Order.find({ "items.seller": sellerId })
      .populate("userId", "name email")
      .sort({ placedAt: -1 })
      .lean();

    const sellerIdStr = String(sellerId);

    // Calculate Total Sales: Count of items with status "delivered" only
    let totalSales = 0;
    allOrders.forEach((order) => {
      if (!order.items || !Array.isArray(order.items)) return;
      order.items.forEach((item) => {
        const itemSellerId = item.seller ? String(item.seller) : null;
        if (itemSellerId === sellerIdStr) {
          const itemStatus = item.itemStatus || order.orderStatus || "pending";
          if (itemStatus === "delivered") {
            totalSales++;
          }
        }
      });
    });

    const totalOrders = allOrders.length;

    // Calculate Total Earnings
    let totalEarnings = 0;
    let deliveredItemsCount = 0;

    allOrders.forEach((order) => {
      if (!order.items || !Array.isArray(order.items)) return;

      order.items.forEach((item) => {
        const itemSellerId = item.seller ? String(item.seller) : null;
        if (itemSellerId === sellerIdStr) {
          const itemStatus = item.itemStatus || order.orderStatus || "pending";
          if (itemStatus === "delivered") {
            const price = Number(item.price) || 0;
            const quantity = Number(item.quantity) || 0;
            totalEarnings += price * quantity;
            deliveredItemsCount++;
          }
        }
      });
    });

    console.log(
      `[Dashboard] Seller ${sellerIdStr}: Total Earnings = ${totalEarnings} from ${deliveredItemsCount} delivered items`,
    );

    // Get Stock Alerts
    const lowStockProducts = await Product.find({
      seller: sellerId,
      quantity: { $lte: 15 },
    })
      .select("name quantity")
      .sort({ quantity: 1 })
      .limit(5)
      .lean();

    const stockAlerts = lowStockProducts.map((product) => ({
      product: product.name,
      stock: product.quantity,
    }));

    // Get Recent Orders
    const recentOrders = allOrders.slice(0, 5).map((order) => {
      const sellerItem = order.items.find(
        (item) => String(item.seller) === String(sellerId),
      );
      const itemStatus = sellerItem
        ? sellerItem.itemStatus || order.orderStatus || "pending"
        : order.orderStatus || "pending";
      return {
        orderId: order._id.toString().substring(0, 8).toUpperCase(),
        customer: order.userId?.name || "Unknown",
        status: itemStatus,
        productName: sellerItem?.name || "N/A",
        amount: sellerItem ? sellerItem.price * sellerItem.quantity : 0,
      };
    });

    // Calculate status distribution
    const statusDistribution = {};
    allOrders.forEach((order) => {
      if (!order.items || !Array.isArray(order.items)) return;
      order.items.forEach((item) => {
        if (String(item.seller) !== sellerIdStr) return;
        const itemStatus = item.itemStatus || order.orderStatus || "pending";
        statusDistribution[itemStatus] =
          (statusDistribution[itemStatus] || 0) + 1;
      });
    });

    const dashboardData = {
      totalSales,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      totalOrders,
      stockAlerts,
      recentOrders,
    };

    res.json({ success: true, ...dashboardData, statusDistribution });
  } catch (err) {
    console.error("Seller dashboard API error", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to load dashboard" });
  }
};

// Get profile settings
exports.getProfileSettings = async (req, res) => {
  try {
    const sellerProfile = await SellerProfile.findOne({
      sellerId: req.user.id,
    }).populate("sellerId", "name email phone profilePicture");

    if (!sellerProfile) {
      const user = await User.findById(req.user.id).select(
        "name email phone profilePicture",
      );
      return res.json({
        success: true,
        profile: {
          storeName: user?.name || req.session.user.name,
          ownerName: "",
          contactEmail: user?.email || req.session.user.email,
          phone: user?.phone || req.session.user.phone || "",
          address: "",
          profilePicture: user?.profilePicture || "",
        },
      });
    }
    res.json({
      success: true,
      profile: {
        storeName: sellerProfile.sellerId.name,
        ownerName: sellerProfile.ownerName || "",
        contactEmail: sellerProfile.sellerId.email,
        phone: sellerProfile.sellerId.phone || "",
        address: sellerProfile.address || "",
        profilePicture: sellerProfile.sellerId.profilePicture || "",
      },
    });
  } catch (err) {
    console.error("Profile settings GET API error", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update profile settings
exports.updateProfileSettings = async (req, res) => {
  try {
    const { storeName, contactEmail, phone, ownerName, address } = req.body;

    if (!storeName?.trim() || !ownerName?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Store and Owner name required" });
    }
    const phoneRegex = /^\d{10}$/;
    if (phone && !phoneRegex.test(phone)) {
      return res
        .status(400)
        .json({ success: false, message: "Phone must be 10 digits" });
    }

    const profilePicture = await uploadProfilePictureIfPresent(
      req.file,
      "seller_profiles",
    );
    const userUpdate = {
      name: storeName,
      email: contactEmail,
      phone: phone,
    };
    if (profilePicture) userUpdate.profilePicture = profilePicture;

    await User.findByIdAndUpdate(req.user.id, userUpdate);

    await SellerProfile.findOneAndUpdate(
      { sellerId: req.user.id },
      { ownerName, address, sellerId: req.user.id },
      { new: true, upsert: true },
    );

    if (profilePicture) {
      req.session.user.profilePicture = profilePicture;
    }

    res.json({
      success: true,
      message: "Profile updated",
      profilePicture,
    });
  } catch (err) {
    console.error("Profile settings POST API error", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get orders
exports.getOrders = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const orders = await Order.find({ "items.seller": sellerId })
      .populate("userId", "name email")
      .sort({ placedAt: -1 })
      .lean();
    const shaped = [];
    orders.forEach((order) => {
      (order.items || []).forEach((item, itemIndex) => {
        if (String(item.seller) === String(sellerId)) {
          const uniqueId = `${order._id}-${item.productId}-${itemIndex}`;
          const itemStatus = item.itemStatus || order.orderStatus || "pending";
          shaped.push({
            uniqueId: uniqueId,
            orderId: order._id,
            productId: item.productId,
            itemIndex: itemIndex,
            customerName: order.userId?.name || "Unknown",
            customerEmail: order.userId?.email || "",
            productName: item.name,
            quantity: item.quantity,
            deliveryAddress: order.deliveryAddress,
            district: order.district,
            status: itemStatus,
            deliveryDate: item.deliveryDate || null,
            placedAt: order.placedAt,
          });
        }
      });
    });
    res.json({ success: true, orders: shaped });
  } catch (err) {
    console.error("Seller orders API error", err);
    res.status(500).json({ success: false, message: "Failed to load orders" });
  }
};

// Get reviews
exports.getReviews = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const reviews = await ProductReview.find({ seller: sellerId })
      .populate("productId", "name image")
      .populate("userId", "name")
      .sort({ createdAt: -1 })
      .lean();

    const summaryMap = new Map();
    reviews.forEach((r) => {
      const pid = String(r.productId?._id || r.productId);
      const existing = summaryMap.get(pid) || {
        productId: pid,
        productName: r.productId?.name || "Unknown",
        productImage: r.productId?.image || "",
        totalReviews: 0,
        totalRating: 0,
      };
      existing.totalReviews += 1;
      existing.totalRating += Number(r.rating || 0);
      summaryMap.set(pid, existing);
    });

    const summaries = Array.from(summaryMap.values()).map((s) => ({
      productId: s.productId,
      productName: s.productName,
      productImage: s.productImage,
      totalReviews: s.totalReviews,
      avgRating:
        s.totalReviews > 0
          ? Number((s.totalRating / s.totalReviews).toFixed(1))
          : 0,
    }));

    return res.json({ success: true, reviews, summaries });
  } catch (err) {
    console.error("Seller reviews API error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load reviews" });
  }
};

// Add product
exports.addProduct = async (req, res) => {
  try {
    const {
      name,
      price,
      description,
      category,
      brand,
      quantity,
      sku,
      compatibility,
    } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one product image required.",
      });
    }

    // Upload all images to Cloudinary
    const uploadedImages = [];
    for (const file of req.files) {
      const uploadRes = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "autocustomizer/products",
            fetch_format: "auto",
            quality: "auto",
            resource_type: "image",
            timeout: 120000,
          },
          (err, result) => {
            if (err) return reject(err);
            return resolve(result);
          },
        );
        stream.end(file.buffer);
      });
      uploadedImages.push({
        url: uploadRes.secure_url,
        publicId: uploadRes.public_id,
      });
    }

    const newProduct = new Product({
      name,
      price,
      description,
      category,
      brand,
      quantity,
      sku,
      compatibility,
      image: uploadedImages[0].url,
      imagePublicId: uploadedImages[0].publicId,
      images: uploadedImages,
      seller: req.user.id,
    });

    await newProduct.save();

    return res.status(200).json({
      success: true,
      message: "Product added successfully",
      product: newProduct,
    });
  } catch (error) {
    const msg =
      error?.message || error?.error?.message || "Unknown error adding product";
    console.error("Error adding product:", msg);
    console.error("Full Error Object:", JSON.stringify(error, null, 2));

    if (error.name === "ValidationError") {
      for (let field in error.errors) {
        console.error(
          `Validation error on field "${field}": ${error.errors[field].message}`,
        );
      }
      return res
        .status(400)
        .send(
          Object.fromEntries(
            Object.entries(error.errors).map(([field, errObj]) => [
              field,
              errObj.message,
            ]),
          ),
        );
    }

    if (error.message && error.message.includes("api_key")) {
      return res
        .status(500)
        .send(
          "Cloudinary configuration error: Please configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file.",
        );
    }

    res.status(500).send(msg || "Internal Server Error: " + error.message);
  }
};

// Get products
exports.getProducts = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const products = await Product.find({ seller: sellerId }).lean();
    res.json({ success: true, products });
  } catch (err) {
    console.error("Error fetching products for seller:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to load products" });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid product id" });
    }

    const sellerId = req.user.id;
    const product = await Product.findOne({
      _id: productId,
      seller: sellerId,
    });
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    if (product?.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(product.imagePublicId);
      } catch (err) {
        console.warn("Cloudinary delete failed:", err.message);
      }
    }

    await Product.deleteOne({ _id: productId });
    await Cart.updateMany(
      { "items.productId": productId },
      { $pull: { items: { productId: productId } } },
    );

    const wantsJSON =
      (req.headers.accept || "").includes("application/json") ||
      (req.headers["content-type"] || "").includes("application/json");
    if (wantsJSON) {
      return res.json({ success: true });
    }

    return res.redirect("/seller/productmanagement");
  } catch (err) {
    console.error("Error deleting product:", err);
    const wantsJSON =
      (req.headers.accept || "").includes("application/json") ||
      (req.headers["content-type"] || "").includes("application/json");
    if (wantsJSON) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to delete product" });
    }
    return res.status(500).send("Failed to delete product");
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { newStatus, productId, itemIndex, deliveryDate } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // If productId and itemIndex are provided, update specific item status
    if (productId !== undefined && itemIndex !== undefined) {
      const item = order.items[itemIndex];
      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Order item not found",
        });
      }

      if (String(item.seller) !== String(req.user.id)) {
        return res.status(403).json({
          success: false,
          message: "Access denied: This item does not belong to you",
        });
      }

      const currentItemStatus = item.itemStatus || order.orderStatus;
      if (
        currentItemStatus === "delivered" ||
        currentItemStatus === "cancelled"
      ) {
        return res.status(400).json({
          success: false,
          message: `Cannot change status after it's marked as ${currentItemStatus}`,
        });
      }

      if (newStatus === "confirmed") {
        const existingDeliveryDate = order.items[itemIndex].deliveryDate;
        if (!deliveryDate && !existingDeliveryDate) {
          return res.status(400).json({
            success: false,
            message: "Please set a delivery date before confirming the order",
          });
        }
        if (deliveryDate) {
          order.items[itemIndex].deliveryDate = new Date(deliveryDate);
        }
      }

      if (deliveryDate) {
        order.items[itemIndex].deliveryDate = new Date(deliveryDate);
      }

      const prevItemStatus = order.items[itemIndex].itemStatus || null;
      order.items[itemIndex].itemStatus = newStatus;
      order.items[itemIndex].itemStatusHistory =
        order.items[itemIndex].itemStatusHistory || [];
      order.items[itemIndex].itemStatusHistory.push({
        from: prevItemStatus,
        to: newStatus,
        changedAt: new Date(),
        changedBy: { id: req.session.user?.id, role: "seller" },
      });

      const derivedStatus = deriveOrderStatus(
        order.items,
        order.orderStatus || "pending",
      );
      if (derivedStatus !== order.orderStatus) {
        const prevOrderStatus = order.orderStatus;
        order.previousStatus = order.orderStatus;
        order.orderStatus = derivedStatus;
        order.orderStatusHistory = order.orderStatusHistory || [];
        order.orderStatusHistory.push({
          from: prevOrderStatus || null,
          to: derivedStatus,
          changedAt: new Date(),
          changedBy: { id: req.session.user?.id, role: "seller" },
        });
      }

      await order.save();

      return res.json({
        success: true,
        message: "Item status updated successfully",
      });
    }

    // Fallback: Update entire order status
    if (
      order.orderStatus === "delivered" ||
      order.orderStatus === "cancelled"
    ) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status after it's marked as ${order.orderStatus}`,
      });
    }

    const prevOrderStatus = order.orderStatus;
    order.previousStatus = order.orderStatus;
    order.orderStatus = newStatus;
    order.orderStatusHistory = order.orderStatusHistory || [];
    order.orderStatusHistory.push({
      from: prevOrderStatus || null,
      to: newStatus,
      changedAt: new Date(),
      changedBy: { id: req.session.user?.id, role: "seller" },
    });
    order.items.forEach((item, idx) => {
      const prevItemStatus = order.items[idx].itemStatus || null;
      order.items[idx].itemStatus = newStatus;
      order.items[idx].itemStatusHistory =
        order.items[idx].itemStatusHistory || [];
      order.items[idx].itemStatusHistory.push({
        from: prevItemStatus,
        to: newStatus,
        changedAt: new Date(),
        changedBy: { id: req.session.user?.id, role: "seller" },
      });
    });
    await order.save();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update delivery date
exports.updateDeliveryDate = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { itemIndex, deliveryDate } = req.body;

    if (!deliveryDate) {
      return res
        .status(400)
        .json({ success: false, message: "Delivery date is required" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const item = order.items[itemIndex];
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Order item not found" });
    }

    if (String(item.seller) !== String(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "Access denied: This item does not belong to you",
      });
    }

    order.items[itemIndex].deliveryDate = new Date(deliveryDate);
    await order.save();

    res.json({
      success: true,
      message: "Delivery date updated successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get bulk upload result
exports.getBulkUploadResult = (req, res) => {
  const result = req.session?.bulkUploadResult || {
    created: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };
  res.json({ success: true, result });
};

// Aliases for route compatibility
exports.getDashboardApi = exports.getDashboard;
exports.postProfileSettings = exports.updateProfileSettings;
exports.getApiProfileSettings = exports.getProfileSettings;
exports.postApiProfileSettings = exports.updateProfileSettings;
exports.getApiOrders = exports.getOrders;
exports.getApiReviews = exports.getReviews;
exports.getProductManagement = exports.getProducts;
exports.getApiProducts = exports.getProducts;
exports.getApiBulkUploadResult = exports.getBulkUploadResult;

// Earnings & Payouts (placeholder)
exports.getEarningsPayouts = async (req, res) => {
  try {
    res.render("seller/earnings-payouts", { user: req.session.user });
  } catch (err) {
    console.error("Error loading earnings page:", err);
    res.status(500).send("Internal Server Error");
  }
};

exports.requestPayout = async (req, res) => {
  try {
    res.json({ success: true, message: "Payout request submitted" });
  } catch (err) {
    console.error("Error requesting payout:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Bulk Upload pages
exports.getBulkUpload = (req, res) => {
  res.render("seller/bulk-upload", { user: req.session.user });
};

exports.downloadSampleCsv = (req, res) => {
  const sampleCsv =
    "name,description,price,quantity,category\nSample Product,Description here,19.99,10,Category1";
  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=sample-products.csv",
  );
  res.send(sampleCsv);
};

exports.postBulkUpload = async (req, res) => {
  try {
    // Basic bulk upload handler
    req.session.bulkUploadResult = {
      created: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };
    res.redirect("/seller/bulk-upload/result");
  } catch (err) {
    console.error("Error processing bulk upload:", err);
    res.status(500).send("Error processing upload");
  }
};
