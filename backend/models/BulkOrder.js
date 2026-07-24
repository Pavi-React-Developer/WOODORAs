const mongoose = require('mongoose');

const bulkOrderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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

module.exports = mongoose.model('BulkOrder', bulkOrderSchema);
