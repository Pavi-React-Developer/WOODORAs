const mongoose = require('mongoose');

const cmsReviewConfigSchema = new mongoose.Schema({
  animationType: { type: String, enum: ['none', 'marquee', 'slide', 'fade'], default: 'marquee' },
  showArrows: { type: Boolean, default: false },
  showDots: { type: Boolean, default: false },
  sliderSpeed: { type: Number, default: 3000 },
  marqueeSpeed: { type: Number, default: 30 },
  desktopColumns: { type: Number, default: 3 },
  mobileColumns: { type: Number, default: 1 },
  featuredReviewIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
}, { timestamps: true });

module.exports = mongoose.model('CmsReviewConfig', cmsReviewConfigSchema);
