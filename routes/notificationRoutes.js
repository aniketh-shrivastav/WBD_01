const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const { customerOnly } = require("../middleware");

// All routes are prefixed with /customer (mounted in server.js)

// Get all notifications (paginated)
router.get(
  "/api/notifications",
  customerOnly,
  notificationController.getNotifications,
);

// Get unread count
router.get(
  "/api/notifications/unread-count",
  customerOnly,
  notificationController.getUnreadCount,
);

// Mark all as read
router.put(
  "/api/notifications/mark-all-read",
  customerOnly,
  notificationController.markAllAsRead,
);

// Mark single as read
router.put(
  "/api/notifications/:id/read",
  customerOnly,
  notificationController.markAsRead,
);

// Accept proposed price
router.post(
  "/api/notifications/:id/accept-price",
  customerOnly,
  notificationController.acceptPrice,
);

// Reject proposed price
router.post(
  "/api/notifications/:id/reject-price",
  customerOnly,
  notificationController.rejectPrice,
);

// Cancel service after price rejection
router.post(
  "/api/notifications/:id/cancel-service",
  customerOnly,
  notificationController.cancelServiceFromAlert,
);

// Delete a notification
router.delete(
  "/api/notifications/:id",
  customerOnly,
  notificationController.deleteNotification,
);

module.exports = router;
