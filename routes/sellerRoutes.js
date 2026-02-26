// routes/sellerRoutes.js
const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const os = require("os");
const mongoose = require("mongoose");
const AdmZip = require("adm-zip");
const csvParser = require("csv-parser");
const ExcelJS = require("exceljs");

const User = require("../models/User");
const SellerProfile = require("../models/sellerProfile");
const cloudinary = require("../config/cloudinaryConfig"); // plain cloudinary
const Product = require("../models/Product");
const Order = require("../models/Orders");
const Cart = require("../models/Cart");
const ProductReview = require("../models/ProductReview");

// Import centralized middleware
const {
  isAuthenticated,
  isSeller,
  wantsJSON,
  uploadImageToMemory,
  uploadImageToDisk,
  uploadDocumentToDisk,
  UPLOAD_DIR,
  handleUploadError,
} = require("../middleware");

// Aliases for backward compatibility
const memoryUpload = uploadImageToMemory;
const upload = uploadDocumentToDisk;

function requestWantsJSON(req) {
  return wantsJSON(req);
}

function deriveOrderStatus(items, fallback = "pending") {
  if (!Array.isArray(items) || items.length === 0) return fallback;
  const statuses = items.map((item) => item.itemStatus || fallback);

  if (statuses.every((s) => s === "cancelled")) return "cancelled";
  if (statuses.every((s) => s === "delivered")) return "delivered";
  if (statuses.some((s) => s === "shipped")) return "shipped";
  if (statuses.some((s) => s === "confirmed")) return "confirmed";
  return "pending";
}

// --- Dashboard JSON API (for static HTML hydration) ---
router.get("/api/dashboard", isAuthenticated, isSeller, async (req, res) => {
  try {
    const sellerId = req.user.id;

    // Get all orders that have items belonging to this seller
    const allOrders = await Order.find({ "items.seller": sellerId })
      .populate("userId", "name email")
      .sort({ placedAt: -1 })
      .lean();

    // Convert sellerId to string for consistent comparison
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

    // Calculate Total Orders: Count of all orders (all statuses)
    const totalOrders = allOrders.length;

    // Calculate Total Earnings: Sum of item prices * quantities for delivered items
    let totalEarnings = 0;
    let deliveredItemsCount = 0;

    allOrders.forEach((order) => {
      if (!order.items || !Array.isArray(order.items)) return;

      order.items.forEach((item) => {
        // Compare seller IDs - item.seller is an ObjectId when using .lean()
        const itemSellerId = item.seller ? String(item.seller) : null;
        if (itemSellerId === sellerIdStr) {
          // Use itemStatus if available, otherwise fall back to orderStatus
          const itemStatus = item.itemStatus || order.orderStatus || "pending";

          // Only count delivered items for earnings
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

    // Get Stock Alerts: Products with quantity <= 15
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

    // Get Recent Orders: Last 5 orders with customer info (use item-specific status)
    const recentOrders = allOrders.slice(0, 5).map((order) => {
      // Get the first item from this seller in the order
      const sellerItem = order.items.find(
        (item) => String(item.seller) === String(sellerId),
      );
      // Prefer item-specific status, fall back to order status
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

    // Calculate status distribution from all ITEMS belonging to this seller (counts all statuses)
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
      totalEarnings: Math.round(totalEarnings * 100) / 100, // Round to 2 decimal places
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
});

// --- Dashboard static file route (replaces EJS) ---
router.get("/dashboard", isAuthenticated, isSeller, (req, res) => {
  const filePath = path.join(__dirname, "../public/seller/dashboard.html");
  return res.sendFile(filePath);
});

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

// --- Profile Settings (unchanged) ---
router.get("/profileSettings", isAuthenticated, isSeller, async (req, res) => {
  const filePath = path.join(
    __dirname,
    "../public/seller/profileSettings.html",
  );
  return res.sendFile(filePath);
});

router.post(
  "/profileSettings",
  isAuthenticated,
  isSeller,
  uploadImageToDisk.single("profilePicture"),
  handleUploadError,
  async (req, res) => {
    try {
      const { storeName, contactEmail, phone, ownerName, address } = req.body;

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
        {
          ownerName,
          address,
          sellerId: req.user.id,
        },
        { new: true, upsert: true },
      );

      console.log("Updated Profile Data:", {
        storeName,
        contactEmail,
        phone,
        ownerName,
        address,
        profilePicture,
      });
      res.redirect("/seller/profileSettings");
    } catch (error) {
      console.error("Error updating seller profile:", error);
      res.status(500).send("Error updating profile settings.");
    }
  },
);

// JSON API: Get seller profile settings
router.get(
  "/api/profileSettings",
  isAuthenticated,
  isSeller,
  async (req, res) => {
    try {
      const sellerProfile = await SellerProfile.findOne({
        sellerId: req.user.id,
      }).populate("sellerId", "name email phone profilePicture");

      if (!sellerProfile) {
        // Fetch fresh user data from database instead of stale session
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
  },
);

// JSON API: Update seller profile settings
router.post(
  "/api/profileSettings",
  isAuthenticated,
  isSeller,
  uploadImageToDisk.single("profilePicture"),
  handleUploadError,
  async (req, res) => {
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

      // Update session with new profile picture so it persists on reload
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
  },
);

// --- Orders (unchanged) ---
const ordersFilePath = path.join(__dirname, "../data", "orders.json");
const getOrders = () => JSON.parse(fs.readFileSync(ordersFilePath, "utf8"));
const saveOrders = (orders) =>
  fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2), "utf8");

router.get("/orders", isAuthenticated, isSeller, async (req, res) => {
  const filePath = path.join(__dirname, "../public/seller/orders.html");
  return res.sendFile(filePath);
});

// JSON API for seller orders (static HTML hydration)
router.get("/api/orders", isAuthenticated, isSeller, async (req, res) => {
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
          // Create unique identifier: orderId + productId + index
          const uniqueId = `${order._id}-${item.productId}-${itemIndex}`;
          // Use itemStatus if available, otherwise fall back to orderStatus
          const itemStatus = item.itemStatus || order.orderStatus || "pending";
          shaped.push({
            uniqueId: uniqueId, // Unique identifier for each product row
            orderId: order._id,
            productId: item.productId,
            itemIndex: itemIndex, // Store index for updating specific item
            customerName: order.userId?.name || "Unknown",
            customerEmail: order.userId?.email || "",
            productName: item.name,
            quantity: item.quantity,
            deliveryAddress: order.deliveryAddress,
            district: order.district,
            status: itemStatus, // Use item-specific status
            deliveryDate: item.deliveryDate || null, // Expected delivery date
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
});

// --- Earnings & Payouts (unchanged) ---
const payoutData = {
  totalEarnings: 15000,
  pendingPayouts: 2000,
  availableBalance: 5000,
  transactions: [
    { date: "2024-03-01", amount: 500, status: "Completed" },
    { date: "2024-03-10", amount: 1000, status: "Pending" },
    { date: "2024-03-15", amount: 700, status: "Completed" },
  ],
};

router.get("/earnings-payouts", isAuthenticated, isSeller, (req, res) => {
  res.render("Seller/earningsPayouts", { payoutData });
});

router.post("/request-payout", isAuthenticated, isSeller, (req, res) => {
  const { amount } = req.body;
  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).send("Invalid payout amount");
  }
  res.redirect("/seller/earnings-payouts");
});

// --- Reviews (seller) ---
router.get("/api/reviews", isAuthenticated, isSeller, async (req, res) => {
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
});

// --- Product Management (SINGLE product upload adjusted to manual Cloudinary upload) ---
router.post(
  "/add-product",
  isAuthenticated,
  isSeller,
  memoryUpload.array("images", 5),
  async (req, res) => {
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
        image: uploadedImages[0].url, // Primary image for backward compatibility
        imagePublicId: uploadedImages[0].publicId,
        images: uploadedImages,
        seller: req.user.id,
      });

      await newProduct.save();

      // Return JSON response instead of redirect for fetch API compatibility
      return res.status(200).json({
        success: true,
        message: "Product added successfully",
        product: newProduct,
      });
    } catch (error) {
      // Cloudinary and other libraries sometimes nest details under error.error
      const msg =
        error?.message ||
        error?.error?.message ||
        "Unknown error adding product";
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

      // Provide clearer Cloudinary-related error messages
      if (error.message && error.message.includes("api_key")) {
        return res
          .status(500)
          .send(
            "Cloudinary configuration error: Please configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file.",
          );
      }

      // Bubble up clearer message for troubleshooting (but still return 500)
      res.status(500).send(msg || "Internal Server Error: " + error.message);
    }
  },
);

// --- Show only products added by seller (unchanged) ---
// Serve static HTML page for product management
router.get(
  "/productmanagement",
  isAuthenticated,
  isSeller,
  async (req, res) => {
    const filePath = path.join(
      __dirname,
      "../public/seller/productManagement.html",
    );
    return res.sendFile(filePath);
  },
);

// JSON API to get seller products (for static HTML hydration)
router.get("/api/products", isAuthenticated, isSeller, async (req, res) => {
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
});

// --- Delete product: remove cloudinary image as well if public id present ---
router.post(
  "/delete-product/:id",
  isAuthenticated,
  isSeller,
  async (req, res) => {
    try {
      const productId = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid product id" });
      }

      // Ensure seller can only delete their own products
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

      if (requestWantsJSON(req)) {
        return res.json({ success: true });
      }

      // Keep browser navigation behavior working (but use correct lowercase route)
      return res.redirect("/seller/productmanagement");
    } catch (err) {
      console.error("Error deleting product:", err);
      if (requestWantsJSON(req)) {
        return res
          .status(500)
          .json({ success: false, message: "Failed to delete product" });
      }
      return res.status(500).send("Failed to delete product");
    }
  },
);

// --- Orders status update - now supports per-item status ---
router.post(
  "/orders/:orderId/status",
  isAuthenticated,
  isSeller,
  async (req, res) => {
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

        // Verify this item belongs to the seller
        if (String(item.seller) !== String(req.user.id)) {
          return res.status(403).json({
            success: false,
            message: "Access denied: This item does not belong to you",
          });
        }

        // Check if item is already in final status
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

        // Require delivery date when confirming an order
        if (newStatus === "confirmed") {
          const existingDeliveryDate = order.items[itemIndex].deliveryDate;
          if (!deliveryDate && !existingDeliveryDate) {
            return res.status(400).json({
              success: false,
              message: "Please set a delivery date before confirming the order",
            });
          }
          // Update delivery date if provided
          if (deliveryDate) {
            order.items[itemIndex].deliveryDate = new Date(deliveryDate);
          }
        }

        // Update delivery date if provided (for any status)
        if (deliveryDate) {
          order.items[itemIndex].deliveryDate = new Date(deliveryDate);
        }

        // Update the specific item's status
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

      // Fallback: Update entire order status (for backward compatibility)
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
  },
);

// --- Update delivery date for an order item ---
router.post(
  "/orders/:orderId/delivery-date",
  isAuthenticated,
  isSeller,
  async (req, res) => {
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

      // Verify this item belongs to the seller
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
  },
);

/* ------------------------------
   BULK UPLOAD ROUTES (CSV / XLSX / ZIP)
   - GET /bulk-upload      -> shows upload form
   - GET /bulk-upload/sample-csv -> download sample csv
   - POST /bulk-upload     -> process upload (CSV/XLSX/ZIP)
   ------------------------------ */

// helper to parse CSV file path into rows
function parseCsvFile(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(
        csvParser({ mapHeaders: ({ header }) => header.trim().toLowerCase() }),
      )
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", (err) => reject(err));
  });
}

// helper to parse Excel file (XLSX/XLS) into rows
async function parseExcelFile(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0]; // Get first sheet

  const rows = [];
  const headers = [];

  // Get headers from first row
  worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber] = (cell.value || "").toString().trim().toLowerCase();
  });

  // Convert rows to JSON objects
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header row

    const rowData = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber];
      if (header) {
        rowData[header] =
          cell.value !== null && cell.value !== undefined
            ? cell.value.toString().trim()
            : "";
      }
    });
    rows.push(rowData);
  });

  return rows;
}

// GET page
router.get("/bulk-upload", isAuthenticated, isSeller, (req, res) => {
  const filePath = path.join(__dirname, "../public/seller/bulkUpload.html");
  return res.sendFile(filePath);
});

// Download sample CSV
router.get("/bulk-upload/sample-csv", isAuthenticated, isSeller, (req, res) => {
  const sample = `name,price,description,category,brand,quantity,sku,compatibility,image
Alloy Rims,12000,16-inch alloy rims,WHEELS,OZ,20,RIM123,Henry|Civic,rim1.jpg
Car Spoiler,8000,Rear spoiler,BodyKit,Mugen,15,SPOILR,Accord,spoiler.jpg
`;
  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=product_upload_sample.csv",
  );
  res.send(sample);
});

// POST process
router.post(
  "/bulk-upload",
  isAuthenticated,
  isSeller,
  upload.single("file"),
  async (req, res) => {
    if (!req.file) return res.status(400).send("No file uploaded.");

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();

    const resultSummary = {
      total: 0,
      inserted: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    try {
      let rows = [];

      if (ext === ".zip") {
        // unzip into a temp folder
        const extractPath = path.join(UPLOAD_DIR, `ex-${Date.now()}`);
        fs.mkdirSync(extractPath, { recursive: true });

        const zip = new AdmZip(filePath);
        zip.extractAllTo(extractPath, true);

        // find CSV or XLSX inside extracted
        const files = fs.readdirSync(extractPath);
        const csvFile = files.find((f) => f.toLowerCase().endsWith(".csv"));
        const xlsxFile = files.find(
          (f) =>
            f.toLowerCase().endsWith(".xlsx") ||
            f.toLowerCase().endsWith(".xls"),
        );

        if (csvFile) {
          rows = await parseCsvFile(path.join(extractPath, csvFile));
        } else if (xlsxFile) {
          rows = await parseExcelFile(path.join(extractPath, xlsxFile));
        } else {
          throw new Error("No CSV or XLSX file found inside ZIP.");
        }

        // We'll assume any image filenames in CSV live under extracted folder (e.g., ./images/...)
        // process rows below, looking up images relative to extractPath
        for (let i = 0; i < rows.length; i++) {
          resultSummary.total++;
          const row = rows[i];
          try {
            // Normalize headers: name, price, description, category, brand, quantity, sku, compatibility, image
            const name = (row.name || "").trim();
            const price = Number(row.price);
            const description = (row.description || "").trim();
            const category = (row.category || "").trim().toUpperCase();
            const brand = (row.brand || "").trim();
            const quantity = Number(row.quantity);
            const sku = (row.sku || "").trim().toUpperCase();
            const compatibility = (row.compatibility || "").trim();
            const imageField = (row.image || "").trim(); // either filename or remote url

            // basic validation
            const missing = [];
            if (!name) missing.push("name");
            if (!price && price !== 0) missing.push("price");
            if (!description) missing.push("description");
            if (!category) missing.push("category");
            if (!brand) missing.push("brand");
            if (!Number.isInteger(quantity)) missing.push("quantity");
            if (!sku || sku.length !== 6) missing.push("sku");
            if (!imageField) missing.push("image");

            if (missing.length) {
              resultSummary.failed++;
              resultSummary.errors.push({
                row: i + 1,
                reason: `Missing/invalid fields: ${missing.join(", ")}`,
              });
              continue;
            }

            // prevent duplicate by seller+sku
            const existing = await Product.findOne({
              seller: req.user.id,
              sku,
            });
            if (existing) {
              resultSummary.skipped++;
              resultSummary.errors.push({
                row: i + 1,
                reason: `SKU ${sku} already exists`,
              });
              continue;
            }

            // find image: if it's URL (starts with http), upload directly; else find local file in extractPath
            let uploaded;
            if (/^https?:\/\//i.test(imageField)) {
              uploaded = await cloudinary.uploader.upload(imageField, {
                folder: "autocustomizer/products",
                fetch_format: "auto",
                quality: "auto",
                resource_type: "image",
                timeout: 120000,
              });
            } else {
              // search inside extractPath and extractPath/images
              const candidatePaths = [
                path.join(extractPath, imageField),
                path.join(extractPath, "images", imageField),
                path.join(extractPath, "Images", imageField),
              ];
              const found = candidatePaths.find((p) => fs.existsSync(p));
              if (!found) {
                resultSummary.failed++;
                resultSummary.errors.push({
                  row: i + 1,
                  reason: `Image file not found: ${imageField}`,
                });
                continue;
              }
              uploaded = await cloudinary.uploader.upload(found, {
                folder: "autocustomizer/products",
                fetch_format: "auto",
                quality: "auto",
                resource_type: "image",
                timeout: 120000,
              });
            }

            // create product
            const newProd = new Product({
              name,
              price,
              description,
              category,
              brand,
              quantity,
              sku,
              compatibility,
              image: uploaded.secure_url,
              imagePublicId: uploaded.public_id,
              seller: req.user.id,
            });
            await newProd.save();
            resultSummary.inserted++;
          } catch (errRow) {
            resultSummary.failed++;
            resultSummary.errors.push({ row: i + 1, reason: errRow.message });
          }
        }

        // cleanup extracted files
        try {
          fs.rmSync(extractPath, { recursive: true, force: true });
        } catch (e) {}
      } else if (ext === ".csv" || ext === ".xlsx" || ext === ".xls") {
        // CSV or Excel uploaded directly (not zipped). For CSV, images must be remote URLs (image column).
        if (ext === ".csv") {
          rows = await parseCsvFile(filePath);
        } else {
          rows = await parseExcelFile(filePath);
        }

        for (let i = 0; i < rows.length; i++) {
          resultSummary.total++;
          const row = rows[i];
          try {
            const name = (row.name || "").trim();
            const price = Number(row.price);
            const description = (row.description || "").trim();
            const category = (row.category || "").trim().toUpperCase();
            const brand = (row.brand || "").trim();
            const quantity = Number(row.quantity);
            const sku = (row.sku || "").trim().toUpperCase();
            const compatibility = (row.compatibility || "").trim();
            const imageField = (row.image || row.image_url || "").trim();

            const missing = [];
            if (!name) missing.push("name");
            if (!price && price !== 0) missing.push("price");
            if (!description) missing.push("description");
            if (!category) missing.push("category");
            if (!brand) missing.push("brand");
            if (!Number.isInteger(quantity)) missing.push("quantity");
            if (!sku || sku.length !== 6) missing.push("sku");
            if (!imageField) missing.push("image_url");

            if (missing.length) {
              resultSummary.failed++;
              resultSummary.errors.push({
                row: i + 1,
                reason: `Missing/invalid: ${missing.join(", ")}`,
              });
              continue;
            }

            const existing = await Product.findOne({
              seller: req.user.id,
              sku,
            });
            if (existing) {
              resultSummary.skipped++;
              resultSummary.errors.push({
                row: i + 1,
                reason: `SKU ${sku} already exists`,
              });
              continue;
            }

            // imageField must be an HTTP URL in this path
            if (!/^https?:\/\//i.test(imageField)) {
              resultSummary.failed++;
              resultSummary.errors.push({
                row: i + 1,
                reason: `image must be a public URL for standalone CSV/XLSX (or use ZIP with images)`,
              });
              continue;
            }

            const uploaded = await cloudinary.uploader.upload(imageField, {
              folder: "autocustomizer/products",
              fetch_format: "auto",
              quality: "auto",
              resource_type: "image",
              timeout: 120000,
            });

            const newProd = new Product({
              name,
              price,
              description,
              category,
              brand,
              quantity,
              sku,
              compatibility,
              image: uploaded.secure_url,
              imagePublicId: uploaded.public_id,
              seller: req.user.id,
            });
            await newProd.save();
            resultSummary.inserted++;
          } catch (errRow) {
            resultSummary.failed++;
            resultSummary.errors.push({ row: i + 1, reason: errRow.message });
          }
        }
      } else {
        throw new Error(
          "Unsupported file type. Upload .zip (csv + images) or .csv or .xlsx",
        );
      }

      // cleanup uploaded file
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        /* ignore */
      }

      // store result in session and redirect to static result page
      req.session.bulkUploadResult = resultSummary;
      return res.redirect("/seller/bulk-upload/result");
    } catch (err) {
      console.error("Bulk upload error:", err);
      try {
        fs.unlinkSync(filePath);
      } catch (e) {}
      res.status(500).send("Bulk upload failed: " + err.message);
    }
  },
);

// Static result page and JSON API to retrieve last summary
router.get("/bulk-upload/result", isAuthenticated, isSeller, (req, res) => {
  const filePath = path.join(
    __dirname,
    "../public/seller/bulkUploadResult.html",
  );
  return res.sendFile(filePath);
});

router.get("/api/bulk-upload-result", isAuthenticated, isSeller, (req, res) => {
  const results = req.session.bulkUploadResult;
  if (!results) return res.json({ success: false, message: "No results" });
  return res.json({ success: true, results });
});

module.exports = router;
