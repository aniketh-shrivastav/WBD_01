const mongoose = require("mongoose");
const User = require("./models/User");
const ServiceBooking = require("./models/serviceBooking");

// Connect to your DB
mongoose.connect("mongodb://localhost:27017/car_customization", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

(async () => {
  try {
    const bookings = await ServiceBooking.find();

    for (const booking of bookings) {
      const provider = await User.findById(booking.providerId);
      if (!provider || !provider.servicesOffered) continue;

      // Build cost map
      const serviceCostMap = {};
      provider.servicesOffered.forEach((service) => {
        serviceCostMap[service.name] = service.cost;
      });

      // Calculate totalCost
      let total = 0;
      booking.selectedServices.forEach((serviceName) => {
        total += serviceCostMap[serviceName] || 0;
      });

      // Assign and save if changed
      booking.totalCost = total;
      await booking.save();
      console.log(`✅ Updated booking ${booking._id} with totalCost ₹${total}`);
    }

    console.log("🎉 All bookings updated.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error updating bookings:", err);
    process.exit(1);
  }
})();
