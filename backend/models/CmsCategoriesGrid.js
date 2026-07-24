const mongoose = require('mongoose');

const categoriesGridSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  mobileCount: {
    type: Number,
    default: 2,
  },
  desktopCount: {
    type: Number,
    default: 4,
  },
  ctaText: {
    type: String,
  },
  ctaUrl: {
    type: String,
  },
  ctaPosition: {
    type: String,
    enum: ['left', 'center', 'right'],
    default: 'right'
  },
  showArrows: {
    type: Boolean,
    default: true
  },
  showDots: {
    type: Boolean,
    default: false
  },
  status: {
    type: Boolean,
    default: true,
  },
  sortOrder: {
    type: Number,
    default: 0,
  }
}, { timestamps: true });

module.exports = mongoose.model('CmsCategoriesGrid', categoriesGridSchema);
