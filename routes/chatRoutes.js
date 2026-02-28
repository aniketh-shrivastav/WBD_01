const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");

// Import centralized middleware
const {
  isAuthenticated,
  isManager,
  uploadGeneric,
} = require("../middleware");

// Use centralized upload middleware
const upload = uploadGeneric;

// Middleware to check customer access
function canAccessCustomer(req, res, next) {
  const cid = String(req.params.customerId);
  const user = req.session.user;
  if (user.role === "manager") return next();
  if (user.role === "customer" && String(user.id) === cid) return next();
  return res.status(403).json({ success: false, message: "Forbidden" });
}

// List customers with latest message preview (manager only)
router.get("/chat/customers", isAuthenticated, isManager, chatController.getCustomers);

// Search customers (including those without conversations)
router.get("/chat/customers/search", isAuthenticated, isManager, chatController.searchCustomers);

// Get messages for a customer thread
router.get("/chat/customer/:customerId/messages", isAuthenticated, canAccessCustomer, chatController.getMessages);

// Post a message to a customer thread
router.post("/chat/customer/:customerId/messages", isAuthenticated, canAccessCustomer, chatController.postMessage);

// Upload an attachment to a customer thread
router.post("/chat/customer/:customerId/attachments", isAuthenticated, canAccessCustomer, upload.single("file"), chatController.uploadAttachment);

// Delete a message from customer thread
router.delete("/chat/customer/:customerId/messages/:messageId", isAuthenticated, canAccessCustomer, chatController.deleteMessage);

// Get unread count for current user (by role)
router.get("/chat/unread-count", isAuthenticated, chatController.getUnreadCount);

module.exports = router;