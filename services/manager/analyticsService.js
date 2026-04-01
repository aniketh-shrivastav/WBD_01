const CustomerProfile = require("../../models/CustomerProfile");
const SellerProfile = require("../../models/sellerProfile");
const ServiceBooking = require("../../models/serviceBooking");
const Order = require("../../models/Orders");
const Product = require("../../models/Product");
const User = require("../../models/User");
const { getDisplayOrderId } = require("../../utils/orderIdUtils");
const { buildMonthBuckets } = require("./common");

async function getProfileOverview(req, res) {
  try {
    const id = req.params.id;
    const n = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

    const customerProfile = await CustomerProfile.findById(id).populate(
      "userId",
      "name email phone profilePicture suspended",
    );

    if (customerProfile && customerProfile.userId) {
      const user = customerProfile.userId;
      const [recentOrders, recentBookings] = await Promise.all([
        Order.find({ userId: user._id }).sort({ placedAt: -1 }).limit(3).lean(),
        ServiceBooking.find({ customerId: user._id })
          .sort({ createdAt: -1 })
          .limit(3)
          .populate("providerId", "name email phone")
          .lean(),
      ]);

      return res.json({
        role: "Customer",
        subject: {
          kind: "customer",
          profileId: String(customerProfile._id),
          userId: String(user._id),
        },
        profile: {
          name: user.name || "",
          email: user.email || "",
          phone: user.phone || "",
          profilePicture:
            customerProfile.profilePicture ||
            user.profilePicture ||
            "https://via.placeholder.com/120",
          district: customerProfile.district || "",
          address: customerProfile.address || "",
          registrationNumber: customerProfile.registrationNumber || "",
          vehicleMake: customerProfile.vehicleMake || "",
          vehicleModel: customerProfile.vehicleModel || "",
          vehicleVariant: customerProfile.vehicleVariant || "",
          fuelType: customerProfile.fuelType || "",
          transmission: customerProfile.transmission || "",
          yearOfManufacture: customerProfile.yearOfManufacture || "",
          vin: customerProfile.vin || "",
          currentMileage: customerProfile.currentMileage || "",
          insuranceProvider: customerProfile.insuranceProvider || "",
          insuranceValidTill: customerProfile.insuranceValidTill || "",
          rcBook: customerProfile.rcBook || "",
          insuranceCopy: customerProfile.insuranceCopy || "",
          vehiclePhotos: customerProfile.vehiclePhotos || [],
        },
        recent: {
          orders: recentOrders || [],
          serviceBookings: recentBookings || [],
        },
      });
    }

    const sellerProfile = await SellerProfile.findById(id).populate(
      "sellerId",
      "name email phone profilePicture suspended verificationStatus verificationDocuments verifiedAt verificationNote",
    );

    if (sellerProfile && sellerProfile.sellerId) {
      const sellerUser = sellerProfile.sellerId;

      const [recentOrdersRaw, earningsAgg, sellerProducts] = await Promise.all([
        Order.find({ "items.seller": sellerUser._id })
          .sort({ placedAt: -1 })
          .limit(3)
          .populate("userId", "name email phone")
          .lean(),
        Order.aggregate([
          { $match: { "items.seller": sellerUser._id } },
          { $unwind: "$items" },
          {
            $match: {
              "items.seller": sellerUser._id,
              "items.itemStatus": "delivered",
            },
          },
          {
            $group: {
              _id: "$items.seller",
              totalEarnings: {
                $sum: { $multiply: ["$items.price", "$items.quantity"] },
              },
              deliveredItems: { $sum: 1 },
            },
          },
        ]),
        Product.find({ seller: sellerUser._id }).sort({ createdAt: -1 }).lean(),
      ]);

      const sellerEarnings = Array.isArray(earningsAgg) ? earningsAgg[0] : null;

      const recentOrders = (recentOrdersRaw || []).map((order) => {
        const items = Array.isArray(order.items) ? order.items : [];
        const sellerItems = items.filter(
          (it) =>
            String(it?.seller?._id || it?.seller) === String(sellerUser._id),
        );

        return {
          _id: order._id,
          placedAt: order.placedAt,
          orderStatus: order.orderStatus,
          paymentStatus: order.paymentStatus,
          customer: order.userId || null,
          items: sellerItems,
        };
      });

      return res.json({
        role: "Seller",
        subject: {
          kind: "seller",
          profileId: String(sellerProfile._id),
          userId: String(sellerUser._id),
        },
        profile: {
          name: sellerUser.name || "",
          email: sellerUser.email || "",
          phone: sellerUser.phone || "",
          profilePicture:
            sellerUser.profilePicture || "https://via.placeholder.com/120",
          ownerName: sellerProfile.ownerName || "",
          address: sellerProfile.address || "",
        },
        verification: {
          status: sellerUser.verificationStatus || "unverified",
          documents: sellerUser.verificationDocuments || [],
          note: sellerUser.verificationNote || "",
          verifiedAt: sellerUser.verifiedAt || null,
        },
        totals: {
          totalEarnings: n(sellerEarnings?.totalEarnings),
          deliveredItems: sellerEarnings?.deliveredItems || 0,
        },
        recent: { orders: recentOrders },
        products: (sellerProducts || []).map((product) => ({
          _id: product._id,
          name: product.name || "",
          image: product.image || "",
          price: product.price || 0,
          category: product.category || "",
          brand: product.brand || "",
          description: product.description || "",
          quantity: product.quantity || 0,
          status: product.status || "pending",
          createdAt: product.createdAt || null,
        })),
      });
    }

    const serviceProvider = await User.findById(id).lean();
    if (serviceProvider && serviceProvider.role === "service-provider") {
      const providerUserId = serviceProvider._id;

      const [recentBookings, earningsAgg, reviewsAgg] = await Promise.all([
        ServiceBooking.find({ providerId: providerUserId })
          .sort({ createdAt: -1 })
          .limit(3)
          .populate("customerId", "name email phone")
          .lean(),
        ServiceBooking.aggregate([
          { $match: { providerId: providerUserId, status: "Ready" } },
          {
            $group: {
              _id: "$providerId",
              totalEarnings: { $sum: "$totalCost" },
              completedCount: { $sum: 1 },
            },
          },
        ]),
        ServiceBooking.aggregate([
          { $match: { providerId: providerUserId, rating: { $gte: 1 } } },
          { $sort: { createdAt: -1 } },
          {
            $project: {
              _id: 1,
              createdAt: 1,
              rating: 1,
              review: 1,
              selectedServices: 1,
              customerId: 1,
            },
          },
          { $limit: 50 },
        ]),
      ]);

      const reviewCustomerIds = (reviewsAgg || [])
        .map((r) => r.customerId)
        .filter(Boolean);
      const customers = reviewCustomerIds.length
        ? await User.find(
            { _id: { $in: reviewCustomerIds } },
            "name email phone",
          ).lean()
        : [];

      const customersById = new Map(
        customers.map((customer) => [String(customer._id), customer]),
      );
      const reviews = (reviewsAgg || []).map((review) => ({
        _id: review._id,
        createdAt: review.createdAt,
        rating: review.rating,
        review: review.review,
        selectedServices: review.selectedServices,
        customer: customersById.get(String(review.customerId)) || null,
      }));

      const earnings = Array.isArray(earningsAgg) ? earningsAgg[0] : null;

      return res.json({
        role: "Service Provider",
        subject: { kind: "service-provider", userId: String(providerUserId) },
        profile: {
          name: serviceProvider.workshopName || serviceProvider.name || "",
          email: serviceProvider.email || "",
          phone: serviceProvider.phone || "",
          profilePicture:
            serviceProvider.profilePicture || "https://via.placeholder.com/120",
          district: serviceProvider.district || "",
          servicesOffered: Array.isArray(serviceProvider.servicesOffered)
            ? serviceProvider.servicesOffered
            : [],
          pickupRate: serviceProvider.pickupRate || 0,
          dropoffRate: serviceProvider.dropoffRate || 0,
        },
        verification: {
          status: serviceProvider.verificationStatus || "unverified",
          documents: serviceProvider.verificationDocuments || [],
          note: serviceProvider.verificationNote || "",
          verifiedAt: serviceProvider.verifiedAt || null,
        },
        totals: {
          totalEarnings: n(earnings?.totalEarnings),
          completedCount: earnings?.completedCount || 0,
        },
        recent: { bookings: recentBookings || [] },
        reviews,
      });
    }

    return res.status(404).json({ error: "User not found" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function getUserAnalytics(req, res) {
  try {
    const id = req.params.id;
    const n = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
    const COMMISSION_RATE = 0.2;
    const MONTHS = 12;
    const { buckets, startDate } = buildMonthBuckets(MONTHS);
    const mk = (y, m) => `${y}-${m}`;

    const customerProfile = await CustomerProfile.findById(id).populate(
      "userId",
      "name email createdAt",
    );

    if (customerProfile && customerProfile.userId) {
      const userId = customerProfile.userId._id;
      const createdAt = customerProfile.userId.createdAt;

      const [orders, bookings] = await Promise.all([
        Order.find({ userId }).lean(),
        ServiceBooking.find({ customerId: userId }).lean(),
      ]);

      const totalOrderSpend = orders.reduce(
        (sum, order) => sum + n(order.totalAmount),
        0,
      );
      const totalServiceSpend = bookings.reduce(
        (sum, booking) => sum + n(booking.totalCost),
        0,
      );
      const totalSpent = totalOrderSpend + totalServiceSpend;

      const orderStatusDist = {};
      orders.forEach((order) => {
        orderStatusDist[order.orderStatus || "unknown"] =
          (orderStatusDist[order.orderStatus || "unknown"] || 0) + 1;
      });

      const bookingStatusDist = {};
      bookings.forEach((booking) => {
        bookingStatusDist[booking.status || "unknown"] =
          (bookingStatusDist[booking.status || "unknown"] || 0) + 1;
      });

      const monthlyOrders = {};
      const monthlyServices = {};
      buckets.forEach((bucket) => {
        const key = mk(bucket.year, bucket.month);
        monthlyOrders[key] = 0;
        monthlyServices[key] = 0;
      });

      orders.forEach((order) => {
        const d = new Date(order.placedAt);
        if (d >= startDate) {
          const key = mk(d.getFullYear(), d.getMonth() + 1);
          if (monthlyOrders[key] !== undefined)
            monthlyOrders[key] += n(order.totalAmount);
        }
      });

      bookings.forEach((booking) => {
        const d = new Date(booking.createdAt);
        if (d >= startDate) {
          const key = mk(d.getFullYear(), d.getMonth() + 1);
          if (monthlyServices[key] !== undefined)
            monthlyServices[key] += n(booking.totalCost);
        }
      });

      const monthlySpending = buckets.map((bucket) => {
        const key = mk(bucket.year, bucket.month);
        return {
          label: bucket.label,
          orders: monthlyOrders[key],
          services: monthlyServices[key],
          total: monthlyOrders[key] + monthlyServices[key],
        };
      });

      const providerSpend = {};
      bookings.forEach((booking) => {
        const pid = String(booking.providerId);
        providerSpend[pid] = (providerSpend[pid] || 0) + n(booking.totalCost);
      });

      const topProviderIds = Object.entries(providerSpend)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      const providerUsers = topProviderIds.length
        ? await User.find(
            { _id: { $in: topProviderIds.map((provider) => provider[0]) } },
            "name email workshopName",
          ).lean()
        : [];

      const providerMap = new Map(providerUsers.map((u) => [String(u._id), u]));
      const topProviders = topProviderIds.map(([pid, total]) => {
        const u = providerMap.get(pid);
        return {
          name: u?.workshopName || u?.name || pid,
          email: u?.email || "",
          totalSpent: total,
        };
      });

      const sellerSpend = {};
      orders.forEach((order) => {
        (order.items || []).forEach((item) => {
          if (item.itemStatus === "delivered") {
            const sid = String(item.seller);
            sellerSpend[sid] =
              (sellerSpend[sid] || 0) + n(item.price) * n(item.quantity);
          }
        });
      });

      const topSellerIds = Object.entries(sellerSpend)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      const sellerUsers = topSellerIds.length
        ? await User.find(
            { _id: { $in: topSellerIds.map((s) => s[0]) } },
            "name email",
          ).lean()
        : [];

      const sellerMap = new Map(sellerUsers.map((u) => [String(u._id), u]));
      const topSellers = topSellerIds.map(([sid, total]) => {
        const u = sellerMap.get(sid);
        return {
          name: u?.name || sid,
          email: u?.email || "",
          totalSpent: total,
        };
      });

      const allDates = [
        ...orders.map((order) => order.placedAt),
        ...bookings.map((booking) => booking.createdAt),
      ]
        .filter(Boolean)
        .sort((a, b) => new Date(a) - new Date(b));

      return res.json({
        role: "Customer",
        userName: customerProfile.userId.name,
        memberSince: createdAt,
        firstActivity: allDates[0] || null,
        lastActivity: allDates[allDates.length - 1] || null,
        summary: {
          totalOrders: orders.length,
          totalBookings: bookings.length,
          totalOrderSpend,
          totalServiceSpend,
          totalSpent,
        },
        orderStatusDist,
        bookingStatusDist,
        monthlySpending,
        topProviders,
        topSellers,
      });
    }

    const sellerProfile = await SellerProfile.findById(id).populate(
      "sellerId",
      "name email createdAt",
    );

    if (sellerProfile && sellerProfile.sellerId) {
      const sellerId = sellerProfile.sellerId._id;
      const createdAt = sellerProfile.sellerId.createdAt;

      const [ordersRaw, products] = await Promise.all([
        Order.find({ "items.seller": sellerId }).lean(),
        Product.find({ seller: sellerId }).lean(),
      ]);

      const sellerItems = [];
      ordersRaw.forEach((order) => {
        (order.items || []).forEach((item) => {
          if (String(item.seller) === String(sellerId)) {
            sellerItems.push({
              ...item,
              placedAt: order.placedAt,
              orderId: getDisplayOrderId(order),
            });
          }
        });
      });

      const deliveredItems = sellerItems.filter(
        (item) => item.itemStatus === "delivered",
      );
      const totalRevenue = deliveredItems.reduce(
        (sum, item) => sum + n(item.price) * n(item.quantity),
        0,
      );
      const totalCommission = totalRevenue * COMMISSION_RATE;
      const totalAfterCommission = totalRevenue - totalCommission;

      const itemStatusDist = {};
      sellerItems.forEach((item) => {
        itemStatusDist[item.itemStatus || "unknown"] =
          (itemStatusDist[item.itemStatus || "unknown"] || 0) + 1;
      });

      const categoryDist = {};
      products.forEach((product) => {
        categoryDist[product.category || "Other"] =
          (categoryDist[product.category || "Other"] || 0) + 1;
      });

      const catRevenue = {};
      deliveredItems.forEach((item) => {
        const product = products.find(
          (p) => String(p._id) === String(item.productId),
        );
        const cat = product?.category || "Other";
        catRevenue[cat] =
          (catRevenue[cat] || 0) + n(item.price) * n(item.quantity);
      });

      const topCategories = Object.entries(catRevenue)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7)
        .map(([category, revenue]) => ({ category, revenue }));

      const prodSold = {};
      deliveredItems.forEach((item) => {
        const key = item.name || String(item.productId);
        prodSold[key] = (prodSold[key] || 0) + n(item.quantity);
      });

      const topProducts = Object.entries(prodSold)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, unitsSold]) => ({ name, unitsSold }));

      const monthlyRev = {};
      buckets.forEach((bucket) => {
        monthlyRev[mk(bucket.year, bucket.month)] = 0;
      });

      deliveredItems.forEach((item) => {
        const d = new Date(item.placedAt);
        if (d >= startDate) {
          const key = mk(d.getFullYear(), d.getMonth() + 1);
          if (monthlyRev[key] !== undefined)
            monthlyRev[key] += n(item.price) * n(item.quantity);
        }
      });

      const monthlyBreakdown = buckets.map((bucket) => {
        const key = mk(bucket.year, bucket.month);
        const rev = monthlyRev[key];
        return {
          label: bucket.label,
          revenue: rev,
          commission: Math.round(rev * COMMISSION_RATE),
          afterCommission: Math.round(rev * (1 - COMMISSION_RATE)),
        };
      });

      const custSpend = {};
      ordersRaw.forEach((order) => {
        const amount = (order.items || [])
          .filter(
            (item) =>
              String(item.seller) === String(sellerId) &&
              item.itemStatus === "delivered",
          )
          .reduce((sum, item) => sum + n(item.price) * n(item.quantity), 0);

        if (amount > 0)
          custSpend[String(order.userId)] =
            (custSpend[String(order.userId)] || 0) + amount;
      });

      const topCustIds = Object.entries(custSpend)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      const custUsers = topCustIds.length
        ? await User.find(
            { _id: { $in: topCustIds.map((c) => c[0]) } },
            "name email",
          ).lean()
        : [];

      const custMap = new Map(custUsers.map((u) => [String(u._id), u]));
      const topCustomers = topCustIds.map(([cid, total]) => {
        const u = custMap.get(cid);
        return {
          name: u?.name || cid,
          email: u?.email || "",
          totalSpent: total,
        };
      });

      const allDates = sellerItems
        .map((item) => item.placedAt)
        .filter(Boolean)
        .sort((a, b) => new Date(a) - new Date(b));

      return res.json({
        role: "Seller",
        userName: sellerProfile.sellerId.name,
        memberSince: createdAt,
        firstActivity: allDates[0] || null,
        lastActivity: allDates[allDates.length - 1] || null,
        summary: {
          totalOrders: ordersRaw.length,
          totalItemsSold: sellerItems.length,
          deliveredCount: deliveredItems.length,
          totalProducts: products.length,
          totalRevenue,
          totalCommission,
          totalAfterCommission,
        },
        itemStatusDist,
        categoryDist,
        topCategories,
        topProducts,
        topCustomers,
        monthlyBreakdown,
      });
    }

    const serviceProvider = await User.findById(id).lean();
    if (serviceProvider && serviceProvider.role === "service-provider") {
      const providerId = serviceProvider._id;
      const createdAt = serviceProvider.createdAt;
      const bookings = await ServiceBooking.find({ providerId }).lean();
      const completedStatuses = ["Ready", "Completed"];
      const completed = bookings.filter((booking) =>
        completedStatuses.includes(booking.status),
      );

      const totalEarnings = completed.reduce(
        (sum, booking) => sum + n(booking.totalCost),
        0,
      );
      const totalCommission = totalEarnings * COMMISSION_RATE;
      const totalAfterCommission = totalEarnings - totalCommission;

      const statusDist = {};
      bookings.forEach((booking) => {
        statusDist[booking.status || "unknown"] =
          (statusDist[booking.status || "unknown"] || 0) + 1;
      });

      const serviceDist = {};
      bookings.forEach((booking) => {
        (booking.selectedServices || []).forEach((service) => {
          serviceDist[service] = (serviceDist[service] || 0) + 1;
        });
      });

      const topServices = Object.entries(serviceDist)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7)
        .map(([name, count]) => ({ name, count }));

      const serviceRevenue = {};
      completed.forEach((booking) => {
        const share =
          n(booking.totalCost) /
          Math.max((booking.selectedServices || []).length, 1);
        (booking.selectedServices || []).forEach((service) => {
          serviceRevenue[service] = (serviceRevenue[service] || 0) + share;
        });
      });

      const topServicesByRevenue = Object.entries(serviceRevenue)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7)
        .map(([name, revenue]) => ({ name, revenue: Math.round(revenue) }));

      const customerRelations = {};
      bookings.forEach((booking) => {
        const cid = String(booking.customerId);
        if (!customerRelations[cid])
          customerRelations[cid] = { count: 0, spent: 0 };
        customerRelations[cid].count += 1;
        customerRelations[cid].spent += n(booking.totalCost);
      });

      const topCustomerIds = Object.entries(customerRelations)
        .sort((a, b) => b[1].spent - a[1].spent)
        .slice(0, 5);

      const relationUsers = topCustomerIds.length
        ? await User.find(
            { _id: { $in: topCustomerIds.map((c) => c[0]) } },
            "name email",
          ).lean()
        : [];

      const relationMap = new Map(relationUsers.map((u) => [String(u._id), u]));
      const topCustomerRelationships = topCustomerIds.map(([cid, data]) => {
        const u = relationMap.get(cid);
        return {
          name: u?.name || cid,
          email: u?.email || "",
          bookings: data.count,
          totalSpent: data.spent,
        };
      });

      const monthlyEarn = {};
      buckets.forEach((bucket) => {
        monthlyEarn[mk(bucket.year, bucket.month)] = 0;
      });

      completed.forEach((booking) => {
        const d = new Date(booking.createdAt);
        if (d >= startDate) {
          const key = mk(d.getFullYear(), d.getMonth() + 1);
          if (monthlyEarn[key] !== undefined)
            monthlyEarn[key] += n(booking.totalCost);
        }
      });

      const monthlyBreakdown = buckets.map((bucket) => {
        const key = mk(bucket.year, bucket.month);
        const earnings = monthlyEarn[key];
        return {
          label: bucket.label,
          earnings,
          commission: Math.round(earnings * COMMISSION_RATE),
          afterCommission: Math.round(earnings * (1 - COMMISSION_RATE)),
        };
      });

      const rated = bookings.filter((booking) => booking.rating >= 1);
      const avgRating = rated.length
        ? (
            rated.reduce((sum, booking) => sum + booking.rating, 0) /
            rated.length
          ).toFixed(1)
        : null;

      const allDates = bookings
        .map((booking) => booking.createdAt)
        .filter(Boolean)
        .sort((a, b) => new Date(a) - new Date(b));

      return res.json({
        role: "Service Provider",
        userName: serviceProvider.workshopName || serviceProvider.name,
        memberSince: createdAt,
        firstActivity: allDates[0] || null,
        lastActivity: allDates[allDates.length - 1] || null,
        summary: {
          totalBookings: bookings.length,
          completedBookings: completed.length,
          totalEarnings,
          totalCommission,
          totalAfterCommission,
          avgRating: avgRating ? Number(avgRating) : null,
          totalReviews: rated.length,
        },
        statusDist,
        topServices,
        topServicesByRevenue,
        topCustomerRelationships,
        monthlyBreakdown,
      });
    }

    return res.status(404).json({ error: "User not found" });
  } catch (err) {
    console.error("getUserAnalytics error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

module.exports = {
  getProfileOverview,
  getUserAnalytics,
};
