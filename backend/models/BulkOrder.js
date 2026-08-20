const mongoose = require('mongoose');

const bulkOrderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  displayId: {
    type: String,
    unique: true,
    sparse: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  subCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubCategory',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  rejectionReason: {
    type: String
  },
  customFields: [
    {
      fieldId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BulkOrderField'
      },
      label: String,
      value: mongoose.Schema.Types.Mixed
    }
  ]
}, { timestamps: true });

bulkOrderSchema.pre('save', async function () {
  if (this.isNew && !this.displayId) {
    const Counter = mongoose.model('Counter');
    const bulkOrderCounter = await Counter.findByIdAndUpdate(
      'bulkOrderId',
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.displayId = `MKB${String(bulkOrderCounter.seq - 1).padStart(5, '0')}`;
  }
});

module.exports = mongoose.model('BulkOrder', bulkOrderSchema);
