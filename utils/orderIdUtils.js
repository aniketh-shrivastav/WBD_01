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

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isLegacyDisplayOrderId(value) {
  return /^ORD-[A-Z0-9]{8}$/i.test(String(value || "").trim());
}

function getDisplayOrderId(order) {
  if (!order) return "";
  return order.orderId || legacyOrderIdFromMongoId(order._id);
}

function buildOrderIdentifierFilter(identifier, extra = {}) {
  const id = String(identifier || "").trim();
  if (!id) return { ...extra, _id: null };

  const or = [{ orderId: id }];
  or.push({ orderId: { $regex: `^${escapeRegex(id)}$`, $options: "i" } });

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
  const id = String(identifier || "").trim();
  const filter = buildOrderIdentifierFilter(identifier, extra);
  const directMatch = projection
    ? await Order.findOne(filter, projection)
    : await Order.findOne(filter);

  if (directMatch) {
    return directMatch;
  }

  if (!isLegacyDisplayOrderId(id)) {
    return null;
  }

  const legacyFallbackFilter = {
    ...extra,
    $expr: {
      $eq: [
        {
          $concat: [
            "ORD-",
            {
              $toUpper: {
                $substrBytes: [{ $toString: "$_id" }, 16, 8],
              },
            },
          ],
        },
        id.toUpperCase(),
      ],
    },
  };

  if (projection) {
    return Order.findOne(legacyFallbackFilter, projection);
  }

  return Order.findOne(legacyFallbackFilter);
}

module.exports = {
  isValidObjectId,
  legacyOrderIdFromMongoId,
  getDisplayOrderId,
  buildOrderIdentifierFilter,
  findOrderByIdentifier,
};
