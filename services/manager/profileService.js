const CustomerProfile = require("../../models/CustomerProfile");
const SellerProfile = require("../../models/sellerProfile");
const ServiceBooking = require("../../models/serviceBooking");
const User = require("../../models/User");
const { getProfileOverview } = require("./analyticsService");

async function getProfileData(req, res) {
  try {
    const id = req.params.id;
    let user = null;
    let role = null;
    let details = "";
    let profilePicture = "";
    let name = "";
    let email = "";
    let phone = "";

    const customer = await CustomerProfile.findById(id).populate("userId");
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
      details = `\n        <p><strong>Address:</strong> ${customer.address || "N/A"}</p>\n        <p><strong>District:</strong> ${customer.district || "N/A"}</p>\n      `;
    }

    if (!user) {
      const seller = await SellerProfile.findById(id).populate("sellerId");
      if (seller) {
        user = seller.sellerId;
        role = "Seller";
        profilePicture =
          user.profilePicture || "https://via.placeholder.com/80";
        name = user.name;
        email = user.email;
        phone = user.phone;
        details = `\n          <p><strong>Owner:</strong> ${seller.ownerName || "N/A"}</p>\n          <p><strong>Store Address:</strong> ${seller.address || "N/A"}</p>\n        `;
      }
    }

    if (!user) {
      const serviceProvider = await User.findById(id);
      if (serviceProvider && serviceProvider.role === "service-provider") {
        user = serviceProvider;
        role = "Service Provider";
        profilePicture =
          user.profilePicture || "https://via.placeholder.com/80";
        name = user.workshopName || user.name;
        email = user.email;
        phone = user.phone;

        let ratingBlock = "<p><strong>Rating:</strong> No ratings yet</p>";
        try {
          const agg = await ServiceBooking.aggregate([
            { $match: { providerId: user._id, rating: { $gte: 1 } } },
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
        } catch {
          // noop
        }

        const services =
          user.servicesOffered
            ?.map((service) => `<li>${service.name} - Rs ${service.cost}</li>`)
            .join("") || "";

        details = `\n          <p><strong>District:</strong> ${user.district || "N/A"}</p>\n          ${ratingBlock}\n          <h4>Services:</h4><ul>${services}</ul>\n        `;
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
}

module.exports = {
  getProfileData,
  getProfileOverview,
};
