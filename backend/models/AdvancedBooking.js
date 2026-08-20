const mongoose = require('mongoose');

const advancedBookingSchema = new mongoose.Schema({
    orderId: {
        type: String,
        unique: true,
        sparse: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Allow guest bookings if needed, or handle on frontend
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    category: {
        type: String,
        required: true
    },
    subCategory: {
        type: String
    },
    productName: {
        type: String,
        required: true
    },
    productImage: {
        type: String
    },
    price: {
        type: Number,
        required: true
    },
    variants: {
        type: Object,
        default: {}
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    customerName: {
        type: String,
        required: true
    },
    phoneNo: {
        type: String,
        required: true
    },
    totalAmount: {
        type: Number,
        default: 0
    },
    paidAmount: {
        type: Number,
        default: 0
    },
    balanceAmount: {
        type: Number,
        default: 0
    },
    paymentMethod: {
        type: String,
        enum: ['COD', 'Cashfree', 'Not Selected'],
        default: 'Not Selected'
    },
    paymentType: {
        type: String,
        enum: ['Partially Paid', 'Fully Paid', 'Unpaid'],
        default: 'Unpaid'
    },
    paymentScreenshot: {
        type: [String],
        default: []
    },
    expectedDate: {
        type: Date
    },
    bookingStatus: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    orderStatus: {
        type: String,
        enum: ['Placed', 'Packed', 'Shipping', 'Out of Delivery', 'Delivered', 'Cancelled'],
        default: 'Placed'
    },
    reason: {
        type: String
    },
    shippingDetails: {
        courierName: { type: String },
        trackingUrl: { type: String },
        trackingId: { type: String },
        additionalTracking: { type: [String], default: [] }
    }
}, { timestamps: true });

module.exports = mongoose.model('AdvancedBooking', advancedBookingSchema);
