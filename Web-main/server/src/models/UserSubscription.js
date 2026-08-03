const mongoose = require('mongoose');

const userSubscriptionSchema = new mongoose.Schema({
  userId: {
    type: Number,
    required: true,
    index: true
  },
  packageId: {
    type: Number,
    required: true,
    index: true
  },
  registeredAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  activatedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'PENDING_PAYMENT', 'EXPIRED', 'CANCELLED', 'REPLACED'],
    required: true,
    default: 'ACTIVE'
  },
  autoRenew: {
    type: Boolean,
    required: true,
    default: true
  },
  cycle: {
    type: String,
    enum: ['DAY', 'MONTH', 'YEAR'],
    required: true
  },
  duration: {
    type: Number
  },
  cycleType: {
    type: String
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  cancelReason: {
    type: String,
    default: ''
  },
  replacedAt: {
    type: Date,
    default: null
  },
  replacedBySubscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserSubscription',
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  collection: 'user_subscriptions',
  timestamps: true
});

userSubscriptionSchema.index({ status: 1 });
userSubscriptionSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('UserSubscription', userSubscriptionSchema);

