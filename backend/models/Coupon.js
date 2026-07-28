const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  couponCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  offerType: {
    type: String,
    required: true,
    enum: ['General Offer', 'Cart Offer', 'Product Offer', 'Category Offer'],
    default: 'General Offer',
  },
  discountType: {
    type: String,
    required: true,
    enum: ['Percentage', 'Fixed Amount'],
    default: 'Percentage',
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0,
  },
  minOrderValue: {
    type: Number,
    default: 0,
    min: 0,
  },
  maxDiscount: {
    type: Number,
    default: 0,
    min: 0,
  },
  usageLimit: {
    type: Number,
    default: 0,
    min: 0,
  },
  usageCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  remainingCount: {
    type: Number,
    default: null,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
  },
  subCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubCategory',
    default: null,
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null,
  },
  minimumQuantity: {
    type: Number,
    default: 1,
    min: 1,
  },
  startDate: {
    type: Date,
    default: null,
  },
  endDate: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'expired', 'exhausted'],
    default: 'active',
    index: true,
  },
  visible: {
    type: Boolean,
    default: true,
    index: true,
  },
  showOnCheckout: {
    type: Boolean,
    default: true,
  },
  description: {
    type: String,
    default: '',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  deleted: {
    type: Boolean,
    default: false,
    index: true,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

couponSchema.pre('save', function () {
  this.usageCount = Math.max(0, Number(this.usageCount || 0));
  // Auto-exhaust the coupon when its global usage count reaches the limit
  if (Number(this.usageLimit) > 0) {
    this.remainingCount = Math.max(0, Number(this.usageLimit) - Number(this.usageCount));
    if (this.remainingCount === 0 && this.status === 'active') {
      this.status = 'exhausted';
    } else if (this.remainingCount > 0 && this.status === 'exhausted') {
      this.status = 'active';
    }
  } else {
    // usageLimit = 0 means unlimited — always keep active unless admin set inactive
    this.remainingCount = null;
    if (this.status === 'exhausted') {
      this.status = 'active';
    }
  }
});

couponSchema.index({ offerType: 1 });

module.exports = mongoose.model('Coupon', couponSchema);
