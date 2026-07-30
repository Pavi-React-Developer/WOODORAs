const mongoose = require('mongoose');

const giftBoxRuleSchema = new mongoose.Schema(
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
    fee: {
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

const GiftBoxRule = mongoose.model('GiftBoxRule', giftBoxRuleSchema);

module.exports = GiftBoxRule;
