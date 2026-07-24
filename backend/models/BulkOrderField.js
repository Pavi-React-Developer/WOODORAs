const mongoose = require('mongoose');

const bulkOrderFieldSchema = new mongoose.Schema({
  label: { type: String, required: true },
  type: { type: String, required: true, enum: ['text', 'dropdown', 'checkbox'] },
  options: [{ type: String }], // Used only if type === 'dropdown'
  isRequired: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  placeholder: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('BulkOrderField', bulkOrderFieldSchema);
