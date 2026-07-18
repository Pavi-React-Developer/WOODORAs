const mongoose = require('mongoose');

const thirdBannerSchema = new mongoose.Schema({
  title: {
    type: String,
  },
  leftImages: [require('./CloudinaryAsset')],
  rightImages: [require('./CloudinaryAsset')],
  leftCtaUrl: {
    type: String,
    default: 'all-products'
  },
  rightCtaUrl: {
    type: String,
    default: 'all-products'
  },
  leftButtonText: {
    type: String,
    default: 'Explore Here'
  },
  rightButtonText: {
    type: String,
    default: 'Explore Here'
  },
  leftStartDate: { type: Date },
  leftEndDate: { type: Date },
  rightStartDate: { type: Date },
  rightEndDate: { type: Date },
  animation: {
    type: String,
    enum: ['Fade', 'Slide', 'Zoom', 'Creative'],
    default: 'Slide'
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

module.exports = mongoose.model('CmsThirdBanner', thirdBannerSchema);
