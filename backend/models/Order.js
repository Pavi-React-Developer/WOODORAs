const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  qty: { type: Number, required: true },
  image: { type: String, required: true },
  price: { type: Number, required: true },
  weight: { type: String }, // optional, for display
  product: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Product',
  },
  variant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductVariant',
  },
});

const ORDER_STATUSES = [
  'Placed',
  'Shipping',
  'Out for delivery',
  'Pending',
  'Packed',
  'Shipped',
  'Delivered',
  'Cancelled',
];

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    orderItems: [orderItemSchema],
    shippingAddress: {
      fullName: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pinCode: { type: String, required: true },
      phone: { type: String, required: true },
      landmark: { type: String },
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ['COD', 'Cashfree'],
    },
    paymentResult: {
      id: { type: String },
      status: { type: String },
      update_time: { type: String },
      email_address: { type: String },
    },
    orderNotes: {
      type: String,
    },
    itemsPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    taxPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    shippingPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    totalPrice: {
      type: Number,
      required: true,
      default: 0.0,
    },
    fees: [{
      name: { type: String, required: true },
      amount: { type: Number, required: true },
      isWeightFee: { type: Boolean, default: false }
    }],
    codAdvance: {
      type: Number,
      default: 0.0,
    },
    balanceAmount: {
      type: Number,
      default: 0.0,
    },
    isPaid: {
      type: Boolean,
      required: true,
      default: false,
    },
    paidAt: {
      type: Date,
    },
    isDelivered: {
      type: Boolean,
      required: true,
      default: false,
    },
    deliveredAt: {
      type: Date,
    },
    trackingId: {
      type: String,
    },
    trackingUrl: {
      type: String,
    },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'Pending',
    }
  },
  {
    timestamps: true,
  }
);

const OrderModel = mongoose.model('Order', orderSchema);
OrderModel.VALID_STATUSES = ORDER_STATUSES;
module.exports = OrderModel;
