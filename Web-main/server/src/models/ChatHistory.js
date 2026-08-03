const mongoose = require('mongoose');

const chatHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: false, default: null, index: true },
  sender: { type: String, enum: ['user', 'bot'], required: true },
  text: { type: String, required: true },
  suggestedAction: { type: mongoose.Schema.Types.Mixed, default: null },
  matchedPackages: { type: Array, default: [] },
  packages: { type: Array, default: [] },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  sessionId: { type: String, default: null, index: true },
  guestInfo: {
    phone: { type: String, default: '' },
    fullName: { type: String, default: '' }
  },
  source: { type: String, enum: ['user', 'guest'], default: 'guest' }
}, {
  collection: 'chat_histories',
  timestamps: true
});

// Create compound index for querying history
chatHistorySchema.index({ userId: 1, createdAt: 1 });
chatHistorySchema.index({ sessionId: 1, createdAt: 1 });

module.exports = mongoose.model('ChatHistory', chatHistorySchema);
