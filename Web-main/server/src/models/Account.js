const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  user_id: { type: Number, required: true, unique: true },
  fullname: { type: String, required: true },
  phone_number: { type: String, required: true, unique: true, index: true },
  email: { type: String, default: '', lowercase: true, trim: true },
  password: { type: String, required: true },
  balance: { type: Number, default: 0 },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  subscription_type: { type: String, enum: ['tra_truoc', 'tra_sau'], required: true, default: 'tra_truoc' },
  is_loyal_customer: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'blocked', 'pending'], default: 'active' },
  wallet_address: { type: String, default: null },
  created_at: { type: String, default: () => new Date().toISOString() }
}, {
  collection: 'accounts',
  timestamps: false
});

accountSchema.index({ status: 1 });
accountSchema.index({ role: 1 });
accountSchema.index({ created_at: 1 });

module.exports = mongoose.model('Account', accountSchema);
