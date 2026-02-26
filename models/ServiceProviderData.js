const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  serviceProviderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  serviceType: { type: String, required: true },
  status: { type: String, enum: ['pending', 'ongoing', 'completed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const EarningSchema = new mongoose.Schema({
  serviceProviderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

const ReviewSchema = new mongoose.Schema({
  serviceProviderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = {
  Booking: mongoose.model('Booking', BookingSchema),
  Earning: mongoose.model('Earning', EarningSchema),
  Review: mongoose.model('Review', ReviewSchema)
};