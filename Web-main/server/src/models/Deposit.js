const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema({
  deposit_id: { type: Number, required: true, unique: true },
  user_id: { type: Number, required: true, index: true },
  
  // Standardized Web3 fields
  amountVND: { type: Number, required: true },
  amountETH: { type: String, required: true },
  exchangeRate: { type: Number, required: true },
  txHash: { type: String, required: true, index: true, unique: true },
  network: { type: String, required: true },
  status: { type: String, required: true, default: 'pending' },
  walletAddress: { type: String, required: true },

  created_at: { type: String, default: () => new Date().toISOString() },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null }
}, {
  collection: 'deposits',
  timestamps: false
});

depositSchema.index({ status: 1 });
depositSchema.index({ created_at: 1 });

module.exports = mongoose.model('Deposit', depositSchema);
