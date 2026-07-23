const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  sectionType: { type: String, required: true },
  title: { type: String },
  order: { type: Number, required: true },
  visible: { type: Boolean, default: true }
}, { _id: false });

const cmsLayoutSchema = new mongoose.Schema({
  page: { type: String, required: true, default: 'home' },
  sections: [sectionSchema]
}, { timestamps: true });

module.exports = mongoose.model('CmsLayout', cmsLayoutSchema);
