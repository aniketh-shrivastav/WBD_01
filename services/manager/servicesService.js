const path = require("path");
const User = require("../../models/User");
const CustomerProfile = require("../../models/CustomerProfile");
const SellerProfile = require("../../models/sellerProfile");
const ServiceBooking = require("../../models/serviceBooking");

async function getServices(req, res) {
  try {
    const serviceProviders = await User.find({
      role: "service-provider",
      suspended: { $ne: true },
    });
    const sellers = await SellerProfile.find().populate(
      "sellerId",
      "name email phone suspended",
    );
    const activeSellers = sellers.filter(
      (seller) => seller.sellerId && !seller.sellerId.suspended,
    );
    const customers = await CustomerProfile.find().populate(
      "userId",
      "name email phone suspended",
    );
    const activeCustomers = customers.filter(
      (customer) => customer.userId && !customer.userId.suspended,
    );

    res.render("manager/services", {
      serviceProviders,
      sellers: activeSellers,
      customers: activeCustomers,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching data");
  }
}

async function cancelBooking(req, res) {
  try {
    const booking = await ServiceBooking.findById(req.params.id);
    if (!booking) {
      return req.accepts("json")
        ? res.status(404).json({ success: false, message: "Booking not found" })
        : res.status(404).send("Booking not found");
    }

    booking.previousStatus = booking.status;
    booking.status = "Rejected";
    await booking.save();

    if (req.accepts("json")) return res.json({ success: true, booking });
    res.redirect("/manager/orders");
  } catch (err) {
    console.error(err);
    if (req.accepts("json")) {
      return res
        .status(500)
        .json({ success: false, message: "Error cancelling booking" });
    }
    res.status(500).send("Error cancelling booking");
  }
}

async function restoreBooking(req, res) {
  try {
    const booking = await ServiceBooking.findById(req.params.id);
    if (!booking) {
      return req.accepts("json")
        ? res.status(404).json({ success: false, message: "Booking not found" })
        : res.status(404).send("Booking not found");
    }

    booking.status = booking.previousStatus || "Open";
    booking.previousStatus = undefined;
    await booking.save();

    if (req.accepts("json")) return res.json({ success: true, booking });
    res.redirect("/manager/orders");
  } catch (err) {
    console.error(err);
    if (req.accepts("json")) {
      return res
        .status(500)
        .json({ success: false, message: "Error restoring booking" });
    }
    res.status(500).send("Error restoring booking");
  }
}

async function verifyProvider(req, res) {
  try {
    const { id } = req.params;
    const { action, note } = req.body;

    if (!["verify", "reject", "unverify"].includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }

    const provider = await User.findById(id);
    if (
      !provider ||
      (provider.role !== "service-provider" && provider.role !== "seller")
    ) {
      return res
        .status(404)
        .json({ error: "Service provider or seller not found" });
    }

    if (action === "verify") {
      provider.verificationStatus = "verified";
      provider.verifiedAt = new Date();
      provider.verifiedBy = req.session.user.id;
      provider.verificationNote = note || "";
    } else if (action === "unverify") {
      provider.verificationStatus = "unverified";
      provider.verificationNote = note || "Verification revoked by manager";
      provider.verifiedAt = undefined;
      provider.verifiedBy = undefined;
    } else {
      provider.verificationStatus = "rejected";
      provider.verificationNote = note || "Documents rejected by manager";
      provider.verifiedAt = undefined;
      provider.verifiedBy = undefined;
    }

    await provider.save();

    const label = provider.role === "seller" ? "Seller" : "Provider";
    const messages = {
      verify: `${label} verified successfully`,
      reject: `${label} verification rejected`,
      unverify: `${label} verification revoked`,
    };

    res.json({
      success: true,
      message: messages[action],
      verificationStatus: provider.verificationStatus,
    });
  } catch (err) {
    console.error("Verify provider error:", err);
    res.status(500).json({ error: "Failed to update verification" });
  }
}

function getServicesHtml(req, res) {
  res.sendFile(
    path.join(__dirname, "..", "..", "public", "manager", "services.html"),
  );
}

module.exports = {
  getServices,
  cancelBooking,
  restoreBooking,
  verifyProvider,
  getServicesHtml,
};
