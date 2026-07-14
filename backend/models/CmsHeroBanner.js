const mongoose = require('mongoose');

const heroBannerSchema = new mongoose.Schema({
  title: {
    type: String,
  },
  subtitle: {
    type: String,
  },
  description: {
    type: String,
  },
  bannerImage: {
    type: String, // URL of the desktop image
  },
  mobileBanner: {
    type: String, // URL of the mobile image
  },
  desktopVideo: {
    type: String, // URL of the desktop video
  },
  mobileVideo: {
    type: String, // URL of the mobile video
  },
  items: [{
    mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
    desktopUrl: { type: String },
    mobileUrl: { type: String }
  }],
  ctaImage: {
    type: String,
  },
  ctaURL: {
    type: String,
  },
  buttonText: {
    type: String,
  },
  animation: {
    type: String,
    enum: ['Fade', 'Slide', 'Zoom'],
    default: 'Fade',
  },
  startDate: {
    type: Date,
  },
  endDate: {
    type: Date,
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

module.exports = mongoose.model('CmsHeroBanner', heroBannerSchema);
