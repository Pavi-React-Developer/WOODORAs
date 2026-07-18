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
  bannerImage: require('./CloudinaryAsset'),
  mobileBanner: require('./CloudinaryAsset'),
  desktopVideo: require('./CloudinaryAsset'),
  mobileVideo: require('./CloudinaryAsset'),
  items: [{
    mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
    desktopUrl: require('./CloudinaryAsset'),
    mobileUrl: require('./CloudinaryAsset')
  }],
  ctaImage: require('./CloudinaryAsset'),
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
