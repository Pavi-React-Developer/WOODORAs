const mongoose = require('mongoose');

const customizeRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Can be guest
  },
  customerInfo: {
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
  },
  shippingAddress: {
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pinCode: { type: String, required: true },
  },
  productDetails: [{
    label: { type: String, required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true }
  }],
  images: [{
    url: String,
    public_id: String,
    width: Number,
    height: Number,
    format: String,
    resource_type: String
  }],
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
  },
  rejectionReason: {
    type: String,
  },
}, { timestamps: true });

module.exports = mongoose.model('CustomizeRequest', customizeRequestSchema);
