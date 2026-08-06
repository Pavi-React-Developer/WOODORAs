const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  title: { type: String, default: 'Bulk Orders' },
  description: { type: String, default: 'Looking for a large quantity of toys for your school, corporate event, or retail store? Fill out the form below and we will get back to you with a custom quote.' },
  image: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

module.exports = mongoose.model('CmsBulkOrderBanner', schema);
