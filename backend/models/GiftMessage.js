const mongoose = require('mongoose');

const giftMessageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    style: {
      type: String,
      default: 'Classic',
    },
    scheduledDeliveryDate: {
      type: String,
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('GiftMessage', giftMessageSchema);
