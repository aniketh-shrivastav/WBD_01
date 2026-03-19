const mongoose = require("mongoose");
const Order = require("../models/Orders");

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || "").trim());
}

function legacyOrderIdFromMongoId(mongoId) {
  const id = String(mongoId || "").trim();
  if (!id) return "";
  return `ORD-${id.slice(-8).toUpperCase()}`;
}

function getDisplayOrderId(order) {
  if (!order) return "";
  return order.orderId || legacyOrderIdFromMongoId(order._id);
}

function buildOrderIdentifierFilter(identifier, extra = {}) {
  const id = String(identifier || "").trim();
  if (!id) return { ...extra, _id: null };

  const or = [{ orderId: id }];
  if (isValidObjectId(id)) {
    or.push({ _id: id });
  }

  return {
    ...extra,
    $or: or,
  };
}

async function findOrderByIdentifier(
  identifier,
  extra = {},
  projection = null,
) {
  const filter = buildOrderIdentifierFilter(identifier, extra);
  if (projection) {
    return Order.findOne(filter, projection);
  }
  return Order.findOne(filter);
}

module.exports = {
  isValidObjectId,
  legacyOrderIdFromMongoId,
  getDisplayOrderId,
  buildOrderIdentifierFilter,
  findOrderByIdentifier,
};
