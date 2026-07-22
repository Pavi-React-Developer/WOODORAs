const mongoose = require('mongoose');

const giftCardConfigSchema = new mongoose.Schema(
  {
    disabledNextDays: {
      type: Number,
      default: 3,
      description: 'Number of days from today that are disabled for scheduling.'
    },
    availableDaysWindow: {
      type: Number,
      default: 3,
      description: 'Number of days available for scheduling after the disabled days.'
    },
    giftWrapFee: {
      type: Number,
      default: 50,
      description: 'Fee applied when gift wrap is requested.'
    },
    specificBlockedDates: [{
      type: String, // format: YYYY-MM-DD
      description: 'Specific dates manually blocked by admin.'
    }],
    specificAvailableDates: [{
      type: String, // format: YYYY-MM-DD
      description: 'Specific dates manually made available by admin.'
    }],
    boxFees: [{
      length: Number,
      width: Number,
      height: Number,
      volume: Number,
      sizeLabel: String,
      amount: Number
    }]
  },
  {
    timestamps: true,
  }
);

const GiftCardConfig = mongoose.model('GiftCardConfig', giftCardConfigSchema);
module.exports = GiftCardConfig;
