const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Product',
  },
  variant: {
    type: String,
    default: null,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  image: {
    type: String,
    default: '',
  },
  price: {
    type: Number,
    required: true,
    default: 0,
  },
  weight: {
    type: String,
    default: '',
  },
  qty: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  variantOptions: {
    type: String,
    default: null,
  },
  maxStock: {
    type: Number,
    default: 999,
  },
  isGift: {
    type: Boolean,
    default: false,
  },
  isGiftWrapper: {
    type: Boolean,
    default: true,
  },
  giftBox: {
    volume: { type: Number },
    boxSize: { type: String },
    giftFee: { type: Number }
  },
  dimensions: {
    length: { type: Number },
    width: { type: Number },
    height: { type: Number }
  }
}, { _id: false });

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    unique: true,
    ref: 'User',
  },
  items: [cartItemSchema],
}, { timestamps: true });

module.exports = mongoose.model('Cart', cartSchema);
