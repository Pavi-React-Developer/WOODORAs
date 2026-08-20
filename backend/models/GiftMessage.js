const mongoose = require('mongoose');

const giftMessageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    displayId: {
      type: String,
      unique: true,
      sparse: true
    },
    message: {
      type: String,
      default: '',
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

giftMessageSchema.pre('save', async function () {
  if (this.isNew && !this.displayId) {
    const Counter = mongoose.model('Counter');
    const giftCounter = await Counter.findByIdAndUpdate(
      'giftMessageId',
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.displayId = `MKG${String(giftCounter.seq - 1).padStart(5, '0')}`;
  }
});

module.exports = mongoose.model('GiftMessage', giftMessageSchema);
