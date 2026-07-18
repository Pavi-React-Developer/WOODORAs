const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    description: {
        type: String,
        required: true,
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
    },
    price: {
        type: Number,
        required: true,
        min: 0,
    },
    compareAtPrice: {
        type: Number,
        min: 0,
    },
    images: [require('./CloudinaryAsset')],
    variants: [{
        variantKey: String,
        ageGroup: String,
        color: String,
        weight: String,
        price: { type: Number, default: 0 },
        basePrice: { type: Number, default: 0 }
    }],
    subCategory: {
        type: mongoose.Schema.Types.Mixed, // Supports old String subcategories and new SubCategory ObjectIds
        required: false,
    },
    // SKU for inventory tracking
    sku: {
        type: String,
        unique: true,
        sparse: true,
    },
    // Deprecated fields - use ProductAttributeValue model instead
    ageGroup: [{
        type: String,
        trim: true,
    }],
    toyType: [{
        type: String,
        trim: true,
    }],
    ageColors: [{
        ageGroup: String,
        colors: [String]
    }],
    woodType: {
        type: String,
        trim: true,
    },
    skillDevelopment: [{
        type: String,
        trim: true,
    }],
    theme: [{
        type: String,
        trim: true,
    }],
    materialType: {
        type: String,
        trim: true,
    },
    seoTitle: String,
    seoDescription: String,
    isActive: {
        type: Boolean,
        default: true
    },
    // === NEW ENTERPRISE FIELDS (v2) ===
    barcode: {
        type: String,
        trim: true,
    },
    shortDescription: {
        type: String,
        trim: true,
    },
    costPrice: {
        type: Number,
        min: 0,
    },
    taxPercent: {
        type: Number,
        default: 0,
        min: 0,
    },
    hsnCode: {
        type: String,
        trim: true,
    },
    shippingWeight: {
        type: Number,
        min: 0,
    },
    shippingClass: {
        type: String,
        trim: true,
    },
    dimensions: {
        length: { type: Number },
        width: { type: Number },
        height: { type: Number },
    },
    minOrderQty: {
        type: Number,
        default: 1,
    },
    maxOrderQty: {
        type: Number,
    },
    lowStockAlert: {
        type: Number,
        default: 5,
    },
    isFeatured: {
        type: Boolean,
        default: false,
    },
    isBestSeller: {
        type: Boolean,
        default: false,
    },
    isNewArrival: {
        type: Boolean,
        default: false,
    },
    isRecommended: {
        type: Boolean,
        default: false,
    },
    warranty: {
        type: String,
    },
    returnPolicy: {
        type: String,
    },
    additionalInfo: [{
        key: String,
        value: String
    }],
    metaKeywords: {
        type: [String],
        default: [],
    },
    tags: {
        type: [String],
        default: [],
    },
    relatedProducts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
    }],
    crossSellProducts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
    }],
    upSellProducts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
    }],
    isArchived: {
        type: Boolean,
        default: false,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    deletedAt: {
        type: Date,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
}, { timestamps: true });

productSchema.index({ isDeleted: 1, isActive: 1 });
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1, subCategory: 1 });

module.exports = mongoose.model('Product', productSchema);
