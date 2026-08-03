const mongoose = require('mongoose');

const otpCodeSchema = new mongoose.Schema({
  phone_number: { type: String, required: true },
  email: { type: String, required: true },
  code: { type: String, required: true },
  created_at: { type: Date, default: Date.now, index: { expires: 300 } } // Expirable in 5 minutes (300 seconds)
}, {
  collection: 'otp_codes',
  timestamps: false
});

module.exports = mongoose.model('OtpCode', otpCodeSchema);
