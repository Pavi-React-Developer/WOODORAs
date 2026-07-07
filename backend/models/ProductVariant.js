const mongoose = require('mongoose');

const productVariantSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true,
    },
    // SKU for this specific variant
    sku: {
        type: String,
        trim: true,
        sparse: true,
        index: true,
    },
    // Barcode for variant
    barcode: {
        type: String,
        trim: true,
        sparse: true,
    },
    // Pricing for variant
    basePrice: {
        type: Number,
        required: true,
        min: 0,
    },
    discountPrice: {
        type: Number,
        min: 0,
    },
    costPrice: {
        type: Number,
        min: 0,
    },
    // Inventory for this variant
    inventory: {
        type: Number,
        default: 0,
        min: 0,
    },
    currentStock: {
        type: Number,
        default: 0,
        min: 0,
    },
    reserveStock: {
        type: Number,
        default: 0,
        min: 0,
    },
    // Physical dimensions
    weight: {
        type: Number,
        min: 0,
    },
    length: {
        type: Number,
        min: 0,
    },
    width: {
        type: Number,
        min: 0,
    },
    height: {
        type: Number,
        min: 0,
    },
    // Images for this variant
    images: [{
        type: String,
        trim: true,
    }],
    // Mark as primary variant for the product
    isPrimary: {
        type: Boolean,
        default: false,
    },
    // Variant status
    isActive: {
        type: Boolean,
        default: true,
    },
    // Auto-generated variant combination string (e.g., "Pine-Red-Small")
    variantCombination: {
        type: String,
        trim: true,
        index: true,
    },
    // Track when this was created/updated
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
}, { timestamps: true });

// Compound unique index on product + variant combination
productVariantSchema.index({ product: 1, variantCombination: 1 }, { unique: true });

// Index for querying variants by product and status
productVariantSchema.index({ product: 1, isActive: 1 });

// Index for SKU lookups
productVariantSchema.index({ sku: 1, isActive: 1 });

module.exports = mongoose.model('ProductVariant', productVariantSchema);
