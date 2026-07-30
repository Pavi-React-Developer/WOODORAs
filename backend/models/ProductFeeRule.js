const mongoose = require('mongoose');

const productFeeRuleSchema = new mongoose.Schema(
  {
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
    boxSize: {
      type: String,
      required: true,
      trim: true,
    },
    productFee: {
      type: Number,
      required: true,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const ProductFeeRule = mongoose.model('ProductFeeRule', productFeeRuleSchema);

module.exports = ProductFeeRule;
