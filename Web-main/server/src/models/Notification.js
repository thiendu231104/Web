const mongoose = require('mongoose');
const { getVirtualDate } = require('../utils/virtualTime');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: Number,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['SUBSCRIPTION', 'TRANSACTION', 'SYSTEM', 'SUPPORT'],
    required: true
  },
  status: {
    type: String,
    enum: ['UNREAD', 'READ'],
    default: 'UNREAD'
  },
  link: {
    type: String,
    default: ''
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserSubscription',
    default: null,
    index: true
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  createdAt: {
    type: Date,
    default: () => getVirtualDate()
  }
}, {
  collection: 'notifications',
  timestamps: false
});

module.exports = mongoose.model('Notification', notificationSchema);
