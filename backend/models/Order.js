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
    isGiftOrder: {
      type: Boolean,
      default: false,
    },
    giftMessage: {
      type: String,
    },
    giftMessageStyle: {
      type: String,
    },
    scheduledDeliveryDate: {
      type: Date,
    },
    deliveryDate: {
      type: Date,
    },
    giftWrapFee: {
      type: Number,
      default: 0,
    },
    giftWrapping: {
      enabled: { type: Boolean, default: false },
      volume: { type: Number },
      boxSize: { type: String },
      giftFee: { type: Number }
    },
    total_cart_volume: {
      type: Number,
      default: 0
    },
    matched_box_size: {
      type: String,
      default: ''
    },
    product_fee: {
      type: Number,
      default: 0
    },
    gift_fee: {
      type: Number,
      default: 0
    },
    delivery_charge: {
      type: Number,
      default: 0
    },
    discount: {
      type: Number,
      default: 0
    },
    grand_total: {
      type: Number,
      default: 0
    },
    gift_toggle: {
      type: Boolean,
      default: false
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
    couponCode: {
      type: String,
      default: null,
      index: true,
    },
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
      default: null,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    couponConsumed: {
      type: Boolean,
      default: false,
    },
    codAdvance: {
      type: Number,
      default: 0.0,
    },
    balanceAmount: {
      type: Number,
      default: 0.0,
    },
    // Immutable checkout pricing snapshot.  These are deliberately stored as
    // individual values so later fee-rule changes can never alter an order.
    subtotal: { type: Number, default: 0 },
    coupon_discount: { type: Number, default: 0 },
    product_fee: { type: Number, default: 0 },
    gift_fee: { type: Number, default: 0 },
    shipping_fee: { type: Number, default: 0 },
    weight_fee: { type: Number, default: 0 },
    platform_fee: { type: Number, default: 0 },
    advance_payment: { type: Number, default: 0 },
    total_amount: { type: Number, default: 0 },
    paid_amount: { type: Number, default: 0 },
    balance_amount: { type: Number, default: 0 },
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
    toJSON: {
      transform: (_doc, ret) => {
        if (ret.deliveryDate == null && ret.scheduledDeliveryDate != null) {
          ret.deliveryDate = ret.scheduledDeliveryDate;
        }
        // Keep API responses complete for orders created before the snapshot
        // fields existed. New orders always use the persisted values above.
        const feeAmount = (token) => (ret.fees || [])
          .filter((fee) => String(fee.name || '').toLowerCase().includes(token))
          .reduce((sum, fee) => sum + (Number(fee.amount) || 0), 0);
        ret.subtotal = Number(ret.subtotal) || Number(ret.itemsPrice) || 0;
        ret.coupon_discount = Number(ret.coupon_discount) || Number(ret.discountAmount) || 0;
        ret.product_fee = Number(ret.product_fee) || feeAmount('product');
        ret.gift_fee = Number(ret.gift_fee) || Number(ret.giftWrapFee) || feeAmount('gift');
        ret.weight_fee = Number(ret.weight_fee) || Number(ret.shippingPrice) || feeAmount('weight');
        ret.shipping_fee = Number(ret.shipping_fee) || 0;
        ret.platform_fee = Number(ret.platform_fee) || feeAmount('platform');
        ret.advance_payment = Number(ret.advance_payment) || Number(ret.codAdvance) || 0;
        ret.total_amount = Number(ret.total_amount) || Number(ret.totalPrice) || 0;
        ret.paid_amount = Number(ret.paid_amount) || (ret.paymentMethod === 'COD'
          ? ret.advance_payment
          : (ret.isPaid ? ret.total_amount : 0));
        ret.balance_amount = Number(ret.balance_amount) || Number(ret.balanceAmount)
          || Math.max(0, ret.total_amount - ret.paid_amount);
        // Existing UI integrations still read these names; keep both views in
        // lockstep while clients move to the explicit snapshot fields.
        ret.itemsPrice = ret.subtotal;
        ret.discountAmount = ret.coupon_discount;
        ret.shippingPrice = ret.shipping_fee + ret.weight_fee;
        ret.codAdvance = ret.advance_payment;
        ret.totalPrice = ret.total_amount;
        ret.balanceAmount = ret.balance_amount;
        return ret;
      },
    },
  }
);

const OrderModel = mongoose.model('Order', orderSchema);
OrderModel.VALID_STATUSES = ORDER_STATUSES;
module.exports = OrderModel;
