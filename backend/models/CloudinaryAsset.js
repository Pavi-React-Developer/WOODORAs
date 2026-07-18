const mongoose = require('mongoose');

const cloudinaryAssetSchema = new mongoose.Schema({
  url: { type: String, required: true },
  public_id: { type: String, required: true },
  width: { type: Number, default: 0 },
  height: { type: Number, default: 0 },
  format: { type: String, default: '' },
  resource_type: { type: String, default: 'image' }, // 'image' or 'video'
  bytes: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now }
}, { _id: false });

module.exports = cloudinaryAssetSchema;
