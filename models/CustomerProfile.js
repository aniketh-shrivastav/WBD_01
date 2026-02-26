const mongoose = require('mongoose');

const customerProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  address: String,
  district: String,
  carModel: String, // ✅ NEW FIELD
  payments: String,  
  profilePicture: String

});

module.exports = mongoose.model('CustomerProfile', customerProfileSchema);
