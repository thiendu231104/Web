const mongoose = require('mongoose');

const packageFeatureSchema = new mongoose.Schema({
  package_id: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  ma_goi: {
    type: String,
    required: true,
    index: true
  },
  has_data: {
    type: Boolean,
    default: false
  },
  has_voice: {
    type: Boolean,
    default: false
  },
  has_sms: {
    type: Boolean,
    default: false
  },
  has_youtube: {
    type: Boolean,
    default: false
  },
  has_tiktok: {
    type: Boolean,
    default: false
  },
  has_facebook: {
    type: Boolean,
    default: false
  },
  has_tv360: {
    type: Boolean,
    default: false
  },
  has_movie: {
    type: Boolean,
    default: false
  },
  has_social: {
    type: Boolean,
    default: false
  },
  has_5g: {
    type: Boolean,
    default: false
  },
  is_combo: {
    type: Boolean,
    default: false
  },
  is_data_only: {
    type: Boolean,
    default: false
  },
  is_social: {
    type: Boolean,
    default: false
  },
  is_addon: {
    type: Boolean,
    default: false
  },
  cycle_days: {
    type: Number,
    default: 0
  },
  price: {
    type: Number,
    default: 0
  },
  price_level: {
    type: String,
    enum: ['cheap', 'medium', 'expensive'],
    default: 'medium'
  },
  data_level: {
    type: String,
    enum: ['none', 'low', 'medium', 'high', 'unlimited'],
    default: 'none'
  },
  voice_level: {
    type: String,
    enum: ['none', 'low', 'high'],
    default: 'none'
  },
  sms_level: {
    type: String,
    enum: ['none', 'low', 'high'],
    default: 'none'
  },
  searchable_tags: {
    type: [String],
    default: []
  }
}, {
  collection: 'package_features',
  timestamps: true
});

module.exports = mongoose.model('PackageFeature', packageFeatureSchema);
