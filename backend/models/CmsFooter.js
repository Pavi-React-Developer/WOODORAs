const mongoose = require('mongoose');

const footerLinkSchema = new mongoose.Schema({
  label: String,
  url: String,
}, { _id: false });

const footerColumnSchema = new mongoose.Schema({
  title: String,
  links: [footerLinkSchema],
}, { _id: false });

const footerSchema = new mongoose.Schema({
  logo: require('./CloudinaryAsset'),
  description: String,
  email: String,
  phone: String,
  facebook: String,
  instagram: String,
  youtube: String,
  twitter: String,
  copyright: String,
  columns: {
    type: [footerColumnSchema],
    default: [],
  },
}, { timestamps: true });

// We only need one footer document typically, but defining a schema allows structured storage
module.exports = mongoose.model('CmsFooter', footerSchema);
