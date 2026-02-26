const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const User = require("../models/User");
const path = require("path");
const fs = require("fs");
let cloudinary;
try {
  cloudinary = require("../config/cloudinaryConfig");
} catch {}

// Import centralized middleware
const {
  isAuthenticated,
  isManager,
  uploadGeneric,
  UPLOAD_DIR,
} = require("../middleware");

// Use centralized upload middleware
const upload = uploadGeneric;

function cleanupLocalAttachment(attachment) {
  if (!attachment?.url || attachment.provider !== "local") return;
  const relative = attachment.url.replace(/^\/+/, "");
  const fullPath = path.join(__dirname, "..", relative);
  fs.unlink(fullPath, () => {});
}

// A customer can only see their own thread; a manager can see any
function canAccessCustomer(req, res, next) {
  const cid = String(req.params.customerId);
  const user = req.session.user;
  if (user.role === "manager") return next();
  if (user.role === "customer" && String(user.id) === cid) return next();
  return res.status(403).json({ success: false, message: "Forbidden" });
}

const escapeRegex = (str = "") => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// List customers with latest message preview (manager only)
router.get("/chat/customers", isAuthenticated, isManager, async (req, res) => {
  try {
    const latest = await Message.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$customerId",
          lastMessage: { $first: "$text" },
          lastAt: { $first: "$createdAt" },
        },
      },
      { $sort: { lastAt: -1 } },
      { $limit: 100 },
    ]);

    const ids = latest.map((x) => x._id);
    const users = await User.find(
      { _id: { $in: ids } },
      "name email role",
    ).lean();
    const byId = Object.fromEntries(users.map((u) => [String(u._id), u]));
    const results = latest.map((x) => ({
      customerId: x._id,
      customer: byId[String(x._id)]
        ? {
            name: byId[String(x._id)].name || "Customer",
            email: byId[String(x._id)].email || "",
          }
        : { name: "Unknown" },
      role: byId[String(x._id)]?.role || "customer",
      lastMessage: x.lastMessage,
      lastAt: x.lastAt,
    }));
    res.json({ success: true, customers: results });
  } catch (e) {
    console.error("chat/customers", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Search customers (including those without conversations)
router.get(
  "/chat/customers/search",
  isAuthenticated,
  isManager,
  async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      if (!q) return res.json({ success: true, customers: [] });

      const regex = new RegExp(escapeRegex(q), "i");
      const limit = Math.min(Number(req.query.limit) || 20, 50);
      const users = await User.find(
        {
          role: "customer",
          $or: [{ name: regex }, { email: regex }],
        },
        "name email role",
      )
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      if (users.length === 0) {
        return res.json({ success: true, customers: [] });
      }

      const ids = users.map((u) => u._id);
      const latest = await Message.aggregate([
        { $match: { customerId: { $in: ids } } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$customerId",
            lastMessage: { $first: "$text" },
            lastAt: { $first: "$createdAt" },
          },
        },
      ]);
      const preview = Object.fromEntries(
        latest.map((x) => [
          String(x._id),
          { lastMessage: x.lastMessage, lastAt: x.lastAt },
        ]),
      );

      const results = users.map((u) => ({
        customerId: u._id,
        customer: { name: u.name || "Customer", email: u.email || "" },
        role: u.role || "customer",
        lastMessage: preview[String(u._id)]?.lastMessage || "",
        lastAt: preview[String(u._id)]?.lastAt || null,
      }));

      res.json({ success: true, customers: results });
    } catch (e) {
      console.error("chat/customers/search", e);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

// Get messages for a customer thread
router.get(
  "/chat/customer/:customerId/messages",
  isAuthenticated,
  canAccessCustomer,
  async (req, res) => {
    try {
      const { customerId } = req.params;
      const { limit = 100 } = req.query;
      const messages = await Message.find({ customerId })
        .sort({ createdAt: 1 })
        .limit(Math.min(Number(limit) || 100, 200))
        .lean();
      // Mark messages from the opposite role as read for this viewer
      try {
        const viewerRole =
          req.session.user.role === "manager" ? "manager" : "customer";
        if (viewerRole === "manager") {
          await Message.updateMany(
            {
              customerId,
              senderRole: "customer",
              readByManager: { $ne: true },
            },
            { $set: { readByManager: true } },
          );
        } else {
          await Message.updateMany(
            {
              customerId,
              senderRole: "manager",
              readByCustomer: { $ne: true },
            },
            { $set: { readByCustomer: true } },
          );
        }
      } catch {}
      res.json({ success: true, messages });
    } catch (e) {
      console.error("chat messages", e);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

// Post a message to a customer thread
router.post(
  "/chat/customer/:customerId/messages",
  isAuthenticated,
  canAccessCustomer,
  async (req, res) => {
    try {
      const { customerId } = req.params;
      const { text } = req.body || {};
      const trimmed = String(text || "").trim();
      if (!trimmed) {
        return res
          .status(400)
          .json({ success: false, message: "Message cannot be empty" });
      }
      const msg = await Message.create({
        customerId,
        senderId: req.user.id,
        senderRole:
          req.session.user.role === "manager" ? "manager" : "customer",
        text: trimmed,
        // For sender, mark their side as read; receiver side remains unread
        readByCustomer: req.session.user.role === "customer" ? true : false,
        readByManager: req.session.user.role === "manager" ? true : false,
      });

      // Socket broadcast (if io is set on app)
      try {
        const io = req.app.get("io");
        if (io)
          io.to(`customer_${customerId}`).emit("chat:new", msg.toObject());
      } catch {}

      res.json({ success: true, message: msg });
    } catch (e) {
      console.error("chat post", e);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

// Upload an attachment to a customer thread
router.post(
  "/chat/customer/:customerId/attachments",
  isAuthenticated,
  canAccessCustomer,
  upload.single("file"),
  async (req, res) => {
    try {
      const { customerId } = req.params;
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded" });
      }

      let url = `/tmp/uploads/${path.basename(req.file.path)}`;
      let provider = "local";
      if (
        cloudinary &&
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
      ) {
        try {
          const result = await cloudinary.uploader.upload(req.file.path, {
            resource_type: "auto",
            folder: "chat_attachments",
            use_filename: true,
            unique_filename: true,
          });
          url = result.secure_url;
          provider = "cloudinary";
        } catch (e) {
          // fallback to local if cloud upload fails
        }
      }

      const msg = await Message.create({
        customerId,
        senderId: req.user.id,
        senderRole:
          req.session.user.role === "manager" ? "manager" : "customer",
        text:
          (req.body && req.body.text ? String(req.body.text).trim() : "") ||
          undefined,
        attachment: {
          url,
          type: req.file.mimetype,
          name: req.file.originalname,
          size: req.file.size,
          provider,
        },
        readByCustomer: req.session.user.role === "customer" ? true : false,
        readByManager: req.session.user.role === "manager" ? true : false,
      });

      try {
        const io = req.app.get("io");
        if (io)
          io.to(`customer_${customerId}`).emit("chat:new", msg.toObject());
      } catch {}

      res.json({ success: true, message: msg });
    } catch (e) {
      console.error("chat attachment", e);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

// Delete a message from customer thread
router.delete(
  "/chat/customer/:customerId/messages/:messageId",
  isAuthenticated,
  canAccessCustomer,
  async (req, res) => {
    try {
      const { customerId, messageId } = req.params;
      const msg = await Message.findOne({
        _id: messageId,
        customerId,
      });
      if (!msg) {
        return res
          .status(404)
          .json({ success: false, message: "Message not found" });
      }

      const requester = req.session.user;
      const isOwner = String(msg.senderId) === String(requester.id);
      if (!isOwner && requester.role !== "manager") {
        return res
          .status(403)
          .json({ success: false, message: "Cannot delete this message" });
      }

      cleanupLocalAttachment(msg.attachment);
      await msg.deleteOne();

      try {
        const io = req.app.get("io");
        if (io)
          io.to(`customer_${customerId}`).emit("chat:deleted", {
            _id: String(msg._id),
          });
      } catch {}

      res.json({ success: true, deletedId: String(msg._id) });
    } catch (e) {
      console.error("chat delete", e);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

// Get unread count for current user (by role)
router.get("/chat/unread-count", isAuthenticated, async (req, res) => {
  try {
    const user = req.session.user;
    let count = 0;
    if (user.role === "manager") {
      count = await Message.countDocuments({
        senderRole: "customer",
        readByManager: { $ne: true },
      });
    } else if (user.role === "customer") {
      count = await Message.countDocuments({
        customerId: user.id,
        senderRole: "manager",
        readByCustomer: { $ne: true },
      });
    } else {
      count = 0;
    }
    res.json({ success: true, count });
  } catch (e) {
    console.error("chat/unread-count", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
