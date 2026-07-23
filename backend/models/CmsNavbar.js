const mongoose = require('mongoose');

const navItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  url: { type: String, required: true },
  textColor: { type: String, default: '' },
  backgroundColor: { type: String, default: '' },
  isDropdown: { type: Boolean, default: false },
  subItems: [{
    title: { type: String, required: true },
    url: { type: String, required: true }
  }],
  icon: { type: String, default: '' },
  order: { type: Number, default: 0 },
  status: { type: Boolean, default: true }
}, { _id: true });

const navbarSchema = new mongoose.Schema({
  logo: require('./CloudinaryAsset'),
  logoUrl: { type: String, default: '/' },
  logoPosition: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
  backgroundColor: { type: String, default: '#ffffff' },
  textColor: { type: String, default: '#4A3326' },
  items: {
    type: [navItemSchema],
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.model('CmsNavbar', navbarSchema);
