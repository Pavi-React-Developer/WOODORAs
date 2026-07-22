const mongoose = require('mongoose');

const productFeeRuleSchema = new mongoose.Schema({
  minVolume: {
    type: Number,
    required: true,
    min: 0,
  },
  maxVolume: {
    type: Number,
    required: true,
    min: 0,
  },
  sizeName: {
    type: String,
    required: true,
    trim: true,
  },
  fee: {
    type: Number,
    required: true,
    min: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('ProductFeeRule', productFeeRuleSchema);
