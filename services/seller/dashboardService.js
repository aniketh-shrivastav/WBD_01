const Order = require("../../models/Orders");
const Product = require("../../models/Product");
const { getDisplayOrderId } = require("../../utils/orderIdUtils");

async function getDashboardData(sellerId) {
  const allOrders = await Order.find({ "items.seller": sellerId })
    .populate("userId", "name email")
    .sort({ placedAt: -1 })
    .lean();

  const sellerIdStr = String(sellerId);

  let totalSales = 0;
  let totalEarnings = 0;
  let deliveredItemsCount = 0;

  allOrders.forEach((order) => {
    if (!Array.isArray(order.items)) return;

    order.items.forEach((item) => {
      const itemSellerId = item.seller ? String(item.seller) : null;
      if (itemSellerId !== sellerIdStr) return;

      const itemStatus = item.itemStatus || order.orderStatus || "pending";
      if (itemStatus === "delivered") {
        totalSales += 1;
        totalEarnings +=
          (Number(item.price) || 0) * (Number(item.quantity) || 0);
        deliveredItemsCount += 1;
      }
    });
  });

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

  const recentOrders = allOrders.slice(0, 5).map((order) => {
    const sellerItem = (order.items || []).find(
      (item) => String(item.seller) === sellerIdStr,
    );

    const itemStatus = sellerItem
      ? sellerItem.itemStatus || order.orderStatus || "pending"
      : order.orderStatus || "pending";

    return {
      orderId: getDisplayOrderId(order),
      customer: order.userId?.name || "Unknown",
      status: itemStatus,
      productName: sellerItem?.name || "N/A",
      amount: sellerItem ? sellerItem.price * sellerItem.quantity : 0,
    };
  });

  const statusDistribution = {};
  allOrders.forEach((order) => {
    if (!Array.isArray(order.items)) return;

    order.items.forEach((item) => {
      if (String(item.seller) !== sellerIdStr) return;
      const itemStatus = item.itemStatus || order.orderStatus || "pending";
      statusDistribution[itemStatus] =
        (statusDistribution[itemStatus] || 0) + 1;
    });
  });

  return {
    totalSales,
    totalEarnings: Math.round(totalEarnings * 100) / 100,
    totalOrders: allOrders.length,
    stockAlerts,
    recentOrders,
    statusDistribution,
    deliveredItemsCount,
  };
}

module.exports = {
  getDashboardData,
};
