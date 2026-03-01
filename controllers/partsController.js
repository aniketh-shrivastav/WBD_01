/**
 * Parts Resolution Controller
 *
 * Orchestrates the linkage between Service Bookings and Platform Products.
 * Product module handles inventory; Service module handles scheduling.
 * Bookings reference product IDs — separate systems, connected relationally.
 *
 * Flow:
 *   Service Provider → Search compatible parts → Link to booking →
 *   Reserve stock → Customer approves price → Allocate → Install → Done
 */

const mongoose = require("mongoose");
const Product = require("../models/Product");
const ServiceBooking = require("../models/serviceBooking");
const { createNotification } = require("./notificationController");

/* ─────────────────── Helpers ─────────────────── */

function availableStock(product) {
  return Math.max(0, (product.quantity || 0) - (product.reservedQuantity || 0));
}

/* ─────────────────── Search / Resolve Parts ─────────────────── */

/**
 * GET /api/parts/search?q=keyword&category=...&bookingId=...
 *
 * Service provider searches the platform product catalog for parts
 * that can be linked to a booking. Only approved products with stock.
 */
exports.searchParts = async (req, res) => {
  try {
    const { q, category, subcategory, compatibility, limit } = req.query;

    const filter = { status: "approved" };

    if (q) {
      const regex = new RegExp(q, "i");
      filter.$or = [
        { name: regex },
        { description: regex },
        { brand: regex },
        { compatibility: regex },
        { sku: regex },
      ];
    }
    if (category) filter.category = new RegExp(`^${category}$`, "i");
    if (subcategory) filter.subcategory = new RegExp(`^${subcategory}$`, "i");
    if (compatibility) filter.compatibility = new RegExp(compatibility, "i");

    const products = await Product.find(filter)
      .select(
        "name price category subcategory brand quantity reservedQuantity sku compatibility image images",
      )
      .limit(Number(limit) || 30)
      .sort({ name: 1 })
      .lean();

    // Attach available stock
    const results = products.map((p) => ({
      ...p,
      availableStock: availableStock(p),
    }));

    res.json({ success: true, products: results });
  } catch (err) {
    console.error("Parts search error:", err);
    res.status(500).json({ success: false, message: "Failed to search parts" });
  }
};

/* ─────────────────── Link Product to Booking ─────────────────── */

/**
 * POST /api/parts/link
 * Body: { bookingId, productId, quantity, installationRequired }
 *
 * Reserves stock from the product and links it to the booking.
 * Does NOT trigger shipping — product is marked "Allocated to Booking".
 */
exports.linkProduct = async (req, res) => {
  try {
    const providerId = req.user.id;
    const { bookingId, productId, quantity, installationRequired } = req.body;

    if (!bookingId || !productId) {
      return res
        .status(400)
        .json({ success: false, message: "bookingId and productId required" });
    }

    const qty = Math.max(1, parseInt(quantity, 10) || 1);

    // Validate booking belongs to this provider
    const booking = await ServiceBooking.findOne({
      _id: bookingId,
      providerId,
    });
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    // Check the product exists, is approved, and has stock
    const product = await Product.findById(productId);
    if (!product || product.status !== "approved") {
      return res
        .status(404)
        .json({ success: false, message: "Product not found or not approved" });
    }

    const avail = availableStock(product);
    if (avail < qty) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available: ${avail}, requested: ${qty}`,
      });
    }

    // Check if this product is already linked to this booking
    const existingIdx = booking.linkedProducts.findIndex(
      (lp) => String(lp.productId) === String(productId),
    );

    if (existingIdx >= 0) {
      // Update existing link quantity
      const existing = booking.linkedProducts[existingIdx];
      const oldQty = existing.quantity || 0;
      const diff = qty - oldQty;

      if (diff > 0 && avail < diff) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for increase. Additional available: ${avail}`,
        });
      }

      existing.quantity = qty;
      existing.unitPrice = product.price;
      existing.totalPrice = product.price * qty;
      existing.installationRequired =
        installationRequired !== undefined
          ? installationRequired
          : existing.installationRequired;

      // Update reservation on product
      product.reservedQuantity = (product.reservedQuantity || 0) + diff;
    } else {
      // Add new linked product
      booking.linkedProducts.push({
        productId: product._id,
        productName: product.name,
        quantity: qty,
        unitPrice: product.price,
        totalPrice: product.price * qty,
        installationRequired:
          installationRequired !== undefined ? installationRequired : true,
        allocationStatus: "reserved",
        reservedAt: new Date(),
      });

      // Reserve stock
      product.reservedQuantity = (product.reservedQuantity || 0) + qty;
    }

    // Recalculate productCost from all linked products
    const linkedTotal = booking.linkedProducts.reduce(
      (sum, lp) => sum + (lp.totalPrice || 0),
      0,
    );
    const oldTotal = booking.totalCost || 0;
    const oldProductCost = booking.productCost || 0;
    booking.productCost = linkedTotal;
    booking.totalCost = oldTotal - oldProductCost + linkedTotal;

    // Set price approval to pending
    booking.priceApprovalStatus = "pending";
    booking.priceApproved = false;

    booking.costHistory.push({
      from: oldTotal,
      to: booking.totalCost,
      changedAt: new Date(),
      changedBy: { id: providerId, role: "service-provider" },
    });

    await product.save();
    await booking.save();

    // Notify customer about parts added
    try {
      const io = req.app.get("io");
      await createNotification(
        {
          customerId: booking.customerId,
          type: "price_finalized",
          title: "Parts Added to Booking",
          message: `${product.name} (×${qty}) has been added to your service booking. Updated total: ₹${booking.totalCost}. Please review and accept or reject.`,
          referenceId: booking._id,
          referenceModel: "ServiceBooking",
          priceApproval: {
            proposedPrice: booking.totalCost,
            previousPrice: oldTotal,
            status: "pending",
          },
        },
        io,
      );
    } catch (e) {
      console.error("Parts link notification error:", e);
    }

    res.json({
      success: true,
      message: "Product linked to booking",
      linkedProducts: booking.linkedProducts,
      totalCost: booking.totalCost,
      productCost: booking.productCost,
    });
  } catch (err) {
    console.error("Link product error:", err);
    res.status(500).json({ success: false, message: "Failed to link product" });
  }
};

/* ─────────────────── Unlink Product from Booking ─────────────────── */

/**
 * POST /api/parts/unlink
 * Body: { bookingId, productId }
 *
 * Removes a product from the booking and releases reserved stock.
 */
exports.unlinkProduct = async (req, res) => {
  try {
    const providerId = req.user.id;
    const { bookingId, productId } = req.body;

    if (!bookingId || !productId) {
      return res
        .status(400)
        .json({ success: false, message: "bookingId and productId required" });
    }

    const booking = await ServiceBooking.findOne({
      _id: bookingId,
      providerId,
    });
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    const idx = booking.linkedProducts.findIndex(
      (lp) => String(lp.productId) === String(productId),
    );
    if (idx < 0) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Product not linked to this booking",
        });
    }

    const removed = booking.linkedProducts[idx];

    // Release reserved stock
    const product = await Product.findById(productId);
    if (product) {
      product.reservedQuantity = Math.max(
        0,
        (product.reservedQuantity || 0) - (removed.quantity || 0),
      );
      await product.save();
    }

    booking.linkedProducts.splice(idx, 1);

    // Recalculate productCost
    const linkedTotal = booking.linkedProducts.reduce(
      (sum, lp) => sum + (lp.totalPrice || 0),
      0,
    );
    const oldTotal = booking.totalCost || 0;
    const oldProductCost = booking.productCost || 0;
    booking.productCost = linkedTotal;
    booking.totalCost = oldTotal - oldProductCost + linkedTotal;

    booking.costHistory.push({
      from: oldTotal,
      to: booking.totalCost,
      changedAt: new Date(),
      changedBy: { id: providerId, role: "service-provider" },
    });

    await booking.save();

    res.json({
      success: true,
      message: "Product removed from booking",
      linkedProducts: booking.linkedProducts,
      totalCost: booking.totalCost,
      productCost: booking.productCost,
    });
  } catch (err) {
    console.error("Unlink product error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to unlink product" });
  }
};

/* ─────────────────── Update Allocation Status ─────────────────── */

/**
 * PUT /api/parts/allocation-status
 * Body: { bookingId, productId, status }
 *
 * Transitions: reserved → allocated → installed
 * Or: reserved/allocated → returned (releases stock)
 */
exports.updateAllocationStatus = async (req, res) => {
  try {
    const providerId = req.user.id;
    const { bookingId, productId, status: newStatus } = req.body;

    const validStatuses = ["reserved", "allocated", "installed", "returned"];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid: ${validStatuses.join(", ")}`,
      });
    }

    const booking = await ServiceBooking.findOne({
      _id: bookingId,
      providerId,
    });
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    const linked = booking.linkedProducts.find(
      (lp) => String(lp.productId) === String(productId),
    );
    if (!linked) {
      return res
        .status(404)
        .json({
          success: false,
          message: "Product not linked to this booking",
        });
    }

    const oldStatus = linked.allocationStatus;

    // Validate transition
    const transitions = {
      reserved: ["allocated", "returned"],
      allocated: ["installed", "returned"],
      installed: [], // terminal — can't go back
      returned: [], // terminal — already released
    };

    if (!transitions[oldStatus]?.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from "${oldStatus}" to "${newStatus}"`,
      });
    }

    linked.allocationStatus = newStatus;

    if (newStatus === "allocated") {
      linked.allocatedAt = new Date();
    } else if (newStatus === "installed") {
      linked.installedAt = new Date();
      // Stock was consumed — reduce actual quantity, release reservation
      const product = await Product.findById(productId);
      if (product) {
        product.quantity = Math.max(
          0,
          (product.quantity || 0) - (linked.quantity || 0),
        );
        product.reservedQuantity = Math.max(
          0,
          (product.reservedQuantity || 0) - (linked.quantity || 0),
        );
        await product.save();
      }
    } else if (newStatus === "returned") {
      // Release stock reservation without consuming
      const product = await Product.findById(productId);
      if (product) {
        product.reservedQuantity = Math.max(
          0,
          (product.reservedQuantity || 0) - (linked.quantity || 0),
        );
        await product.save();
      }
    }

    await booking.save();

    res.json({
      success: true,
      message: `Allocation status updated to "${newStatus}"`,
      linkedProducts: booking.linkedProducts,
    });
  } catch (err) {
    console.error("Allocation status error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to update allocation status" });
  }
};

/* ─────────────────── Get Linked Products for a Booking ─────────────────── */

/**
 * GET /api/parts/booking/:bookingId
 *
 * Returns all products linked to a specific booking with full product details.
 */
exports.getLinkedProducts = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await ServiceBooking.findById(bookingId)
      .populate({
        path: "linkedProducts.productId",
        select:
          "name price category subcategory brand image images sku compatibility quantity reservedQuantity",
      })
      .lean();

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    // Verify access: must be provider or customer of this booking
    const userId = req.user.id;
    if (
      String(booking.providerId) !== userId &&
      String(booking.customerId) !== userId
    ) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.json({
      success: true,
      linkedProducts: booking.linkedProducts || [],
      productCost: booking.productCost || 0,
      totalCost: booking.totalCost || 0,
    });
  } catch (err) {
    console.error("Get linked products error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to load linked products" });
  }
};
