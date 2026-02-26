// const express = require('express');
// const router = express.Router();
// const mongoose = require('mongoose');
// const { ObjectId } = mongoose.Types; // Import ObjectId properly
// const ServiceBooking = require('../models/serviceBooking');
// const User = require('../models/User');

// router.get("/dashboardService", async (req, res) => {
//     try {
//         const providerId = req.user._id; // assuming logged-in service provider

//         // Aggregate service counts for this provider
//         const bookings = await ServiceBooking.aggregate([
//             { $match: { providerId: providerId } },
//             { $unwind: "$selectedServices" },
//             { $group: { _id: "$selectedServices", count: { $sum: 1 } } },
//             { $sort: { count: -1 } }
//         ]);

//         const serviceLabels = bookings.map(b => b._id);
//         const serviceCounts = bookings.map(b => b.count);

//         res.render("service/dashboardService", {
//             serviceLabels: JSON.stringify(serviceLabels),
//             serviceCounts: JSON.stringify(serviceCounts),
//         });

//     } catch (err) {
//         console.error(err);
//         res.status(500).send("Error loading dashboard");
//     }
// });
