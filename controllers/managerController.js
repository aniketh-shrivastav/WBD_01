const ServiceBooking = require("../models/serviceBooking");
const User = require("../models/User");
const CustomerProfile = require("../models/CustomerProfile");
const SellerProfile = require("../models/sellerProfile");
const Order = require("../models/Orders");

exports.getProfileData = async (req, res) => {
  try {
    const id = req.params.id;
    let user = null;
    let role = null;
    let details = "";
    let profilePicture = "";
    let name = "",
      email = "",
      phone = "";

    // Check CustomerProfile
    let customer = await CustomerProfile.findById(id).populate("userId");
    if (customer) {
      user = customer.userId;
      role = "Customer";
      profilePicture =
        customer.profilePicture ||
        user.profilePicture ||
        "https://via.placeholder.com/80";
      name = user.name;
      email = user.email;
      phone = user.phone;

      details = `
        <p><strong>Address:</strong> ${customer.address || "N/A"}</p>
        <p><strong>District:</strong> ${customer.district || "N/A"}</p>
        <p><strong>Car Model:</strong> ${customer.carModel || "N/A"}</p>
      `;
    }

    // Check SellerProfile
    if (!user) {
      let seller = await SellerProfile.findById(id).populate("sellerId");
      if (seller) {
        user = seller.sellerId;
        role = "Seller";
        profilePicture =
          user.profilePicture || "https://via.placeholder.com/80";
        name = user.name;
        email = user.email;
        phone = user.phone;

        details = `
          <p><strong>Owner:</strong> ${seller.ownerName || "N/A"}</p>
          <p><strong>Store Address:</strong> ${seller.address || "N/A"}</p>
        `;
      }
    }

    // Check if it's a service provider directly in User
    if (!user) {
      let serviceProvider = await User.findById(id);
      if (serviceProvider && serviceProvider.role === "service-provider") {
        user = serviceProvider;
        role = "Service Provider";
        profilePicture =
          user.profilePicture || "https://via.placeholder.com/80";
        name = user.workshopName || user.name;
        email = user.email;
        phone = user.phone;

        // Aggregate rating stats from completed bookings (ratings live on ServiceBooking)
        let ratingBlock = "<p><strong>Rating:</strong> No ratings yet</p>";
        try {
          const agg = await ServiceBooking.aggregate([
            {
              $match: {
                providerId: user._id,
                rating: { $gte: 1 },
              },
            },
            { $sort: { createdAt: -1 } },
            {
              $group: {
                _id: "$providerId",
                ratingAvg: { $avg: "$rating" },
                ratingCount: { $sum: 1 },
                latestRating: { $first: "$rating" },
                latestReview: { $first: "$review" },
              },
            },
          ]);
          const stats = Array.isArray(agg) ? agg[0] : null;
          if (
            stats &&
            typeof stats.ratingAvg === "number" &&
            typeof stats.ratingCount === "number"
          ) {
            const avg = Number(stats.ratingAvg).toFixed(1);
            const count = stats.ratingCount;
            ratingBlock = `<p><strong>Rating:</strong> ${avg} / 5 (${count})</p>`;
            if (stats.latestReview) {
              ratingBlock += `<p><strong>Latest Review:</strong> ${stats.latestReview}</p>`;
            }
          }
        } catch (e) {
          // keep default ratingBlock
        }

        const services =
          user.servicesOffered
            ?.map((s) => `<li>${s.name} - ₹${s.cost}</li>`)
            .join("") || "";
        details = `
          <p><strong>District:</strong> ${user.district || "N/A"}</p>
          ${ratingBlock}
          <h4>Services:</h4><ul>${services}</ul>
        `;
      }
    }

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      profilePicture,
      name,
      email,
      phone,
      role,
      extraDetails: details,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getPayments = async (req, res) => {
  try {
    // Load only 'Ready' service bookings, excluding suspended users
    const serviceOrders = (
      await ServiceBooking.find({ status: "Ready" })
        .populate("customerId", "name suspended")
        .populate("providerId", "name suspended")
    ).filter(
      (order) =>
        order.customerId &&
        !order.customerId.suspended &&
        order.providerId &&
        !order.providerId.suspended,
    );

    // Load product orders
    const orders = (
      await Order.find()
        .populate("userId", "name suspended") // Customer
        .populate("items.seller", "name suspended") // Sellers
        .sort({ placedAt: -1 })
    ).filter(
      (order) =>
        order.userId &&
        !order.userId.suspended &&
        order.items.every((item) => item.seller && !item.seller.suspended),
    );

    res.render("manager/payments", {
      serviceOrders,
      orders,
    });
  } catch (err) {
    console.error("Error fetching payments data:", err);
    res.status(500).send("Internal Server Error");
  }
};

exports.getProfileOverview = async (req, res) => {
  try {
    const id = req.params.id;

    // Helper for safe numbers
    const n = (v) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

    // 1) Customer profile document
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
          carModel: customerProfile.carModel || "",
        },
        recent: {
          orders: recentOrders || [],
          serviceBookings: recentBookings || [],
        },
      });
    }

    // 2) Seller profile document
    const sellerProfile = await SellerProfile.findById(id).populate(
      "sellerId",
      "name email phone profilePicture suspended",
    );
    if (sellerProfile && sellerProfile.sellerId) {
      const sellerUser = sellerProfile.sellerId;

      const [recentOrdersRaw, earningsAgg] = await Promise.all([
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
      ]);

      const sellerEarnings = Array.isArray(earningsAgg) ? earningsAgg[0] : null;

      const recentOrders = (recentOrdersRaw || []).map((o) => {
        const items = Array.isArray(o.items) ? o.items : [];
        const sellerItems = items.filter(
          (it) =>
            String(it?.seller?._id || it?.seller) === String(sellerUser._id),
        );
        return {
          _id: o._id,
          placedAt: o.placedAt,
          orderStatus: o.orderStatus,
          paymentStatus: o.paymentStatus,
          customer: o.userId || null,
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
        totals: {
          totalEarnings: n(sellerEarnings?.totalEarnings),
          deliveredItems: sellerEarnings?.deliveredItems || 0,
        },
        recent: {
          orders: recentOrders,
        },
      });
    }

    // 3) Service provider is a User document
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

      // populate customer for reviews (aggregation doesn't populate)
      const reviewCustomerIds = (reviewsAgg || [])
        .map((r) => r.customerId)
        .filter(Boolean);
      const customers = reviewCustomerIds.length
        ? await User.find(
            { _id: { $in: reviewCustomerIds } },
            "name email phone",
          ).lean()
        : [];
      const customersById = new Map(customers.map((c) => [String(c._id), c]));
      const reviews = (reviewsAgg || []).map((r) => ({
        _id: r._id,
        createdAt: r.createdAt,
        rating: r.rating,
        review: r.review,
        selectedServices: r.selectedServices,
        customer: customersById.get(String(r.customerId)) || null,
      }));

      const earnings = Array.isArray(earningsAgg) ? earningsAgg[0] : null;

      return res.json({
        role: "Service Provider",
        subject: {
          kind: "service-provider",
          userId: String(providerUserId),
        },
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
        },
        totals: {
          totalEarnings: n(earnings?.totalEarnings),
          completedCount: earnings?.completedCount || 0,
        },
        recent: {
          bookings: recentBookings || [],
        },
        reviews,
      });
    }

    return res.status(404).json({ error: "User not found" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
