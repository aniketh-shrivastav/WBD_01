const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, trim: true },
    type: { type: String, trim: true },
    name: { type: String, trim: true },
    size: { type: Number, min: 0 },
    provider: {
      type: String,
      enum: ["local", "cloudinary"],
      default: "local",
    },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderRole: { type: String, enum: ["customer", "manager"], required: true },
    text: { type: String, trim: true, maxlength: 2000 },
    attachment: attachmentSchema,
    // Unread tracking by role
    readByCustomer: { type: Boolean, default: false, index: true },
    readByManager: { type: Boolean, default: false, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

messageSchema.index({ customerId: 1, createdAt: 1 });

module.exports = mongoose.model("Message", messageSchema);
