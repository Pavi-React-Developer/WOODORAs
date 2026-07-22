const mongoose = require('mongoose');

const giftBoxRuleSchema = new mongoose.Schema(
  {
    minVolume: {
      type: Number,
      required: [true, 'Minimum volume is required'],
      min: 0
    },
    maxVolume: {
      type: Number,
      required: [true, 'Maximum volume is required'],
      min: 0
    },
    boxSize: {
      type: String,
      required: [true, 'Box size is required'],
      enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
      trim: true
    },
    fee: {
      type: Number,
      required: [true, 'Gift fee is required'],
      min: 0
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Add compound index for fast volume range queries
giftBoxRuleSchema.index({ minVolume: 1, maxVolume: 1 });
giftBoxRuleSchema.index({ isActive: 1 });

const GiftBoxRule = mongoose.model('GiftBoxRule', giftBoxRuleSchema);

module.exports = GiftBoxRule;
