const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  title: {
    type: String,
    trim: true,
    default: '',
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  images: [require('./CloudinaryAsset')],   // uploaded image objects
  videos: [require('./CloudinaryAsset')],   // uploaded video objects
  isVerifiedPurchase: {
    type: Boolean,
    default: false,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },
  orderItemId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  helpfulVotes: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    vote: { type: String, enum: ['helpful', 'not_helpful'] },
  }],
  adminReply: {
    text: { type: String, default: '' },
    repliedAt: { type: Date },
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
}, { timestamps: true });

// ─────────────────────────────────────────────────────────────────────────────
// Indexes
// ─────────────────────────────────────────────────────────────────────────────

// Unique constraint: one review per user per order item.
// sparse: true means documents where orderId/orderItemId are absent are excluded
// from the uniqueness check (allows users to leave reviews without an order context).
reviewSchema.index({ user: 1, orderId: 1, orderItemId: 1 }, { unique: true, sparse: true });

// Speeds up the main public-facing query: approved reviews for a product sorted by date
reviewSchema.index({ product: 1, status: 1, createdAt: -1 });

// Speeds up admin listing (filter by status)
reviewSchema.index({ status: 1, createdAt: -1 });

// Speeds up the stats aggregation pipeline
reviewSchema.index({ product: 1, status: 1, rating: 1 });

module.exports = mongoose.model('Review', reviewSchema);
