const mongoose = require('mongoose');

const customizeFieldSchema = new mongoose.Schema({
  label: { type: String, required: true },
  type: { type: String, required: true, enum: ['text', 'dropdown', 'checkbox'] },
  options: [{ type: String }], // Used only if type === 'dropdown'
  isRequired: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('CustomizeField', customizeFieldSchema);
