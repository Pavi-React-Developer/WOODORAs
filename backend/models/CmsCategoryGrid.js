const mongoose = require('mongoose');

const categoryGridSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  images: [{
    url: { type: String, required: true },
    public_id: { type: String },
    altText: { type: String },
    isThumbnail: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 1 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    format: { type: String, default: '' },
    resource_type: { type: String, default: 'image' },
    bytes: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now },
  }],
  animation: {
    type: String,
    enum: ['fade', 'slide', 'zoom', 'none'],
    default: 'fade',
  },
  ctaText: {
    type: String,
  },
  ctaUrl: {
    type: String,
  },
  status: {
    type: Boolean,
    default: true,
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

module.exports = mongoose.model('CmsCategoryGrid', categoryGridSchema);
