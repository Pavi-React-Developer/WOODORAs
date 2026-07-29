const mongoose = require('mongoose');

const globalFeeSchema = new mongoose.Schema(
  {
    productFee: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    giftFee: {
      type: Number,
      required: true,
      default: 0,
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

const GlobalFee = mongoose.model('GlobalFee', globalFeeSchema);

module.exports = GlobalFee;
