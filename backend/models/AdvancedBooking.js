const mongoose = require('mongoose');

const advancedBookingSchema = new mongoose.Schema({
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
    status: {
        type: String,
        enum: ['Placed', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'],
        default: 'Placed'
    }
}, { timestamps: true });

module.exports = mongoose.model('AdvancedBooking', advancedBookingSchema);
