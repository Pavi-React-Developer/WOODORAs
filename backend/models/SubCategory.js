const mongoose = require('mongoose');

const subCategorySchema = new mongoose.Schema({
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
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
    },
    description: {
        type: String,
    },
    image: require('./CloudinaryAsset'),
    displayOrder: {
        type: Number,
        default: 1,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    // Attributes mapped to this subcategory
    attributes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Attribute',
    }],
    seoTitle: {
        type: String,
    },
    seoDescription: {
        type: String,
    },
    // === NEW ENTERPRISE FIELDS (v2) ===
    seoKeywords: {
        type: [String],
        default: [],
    },
    banner: {
        type: String,
    },
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

// Indexes for v2 queries
subCategorySchema.index({ category: 1, isDeleted: 1, isActive: 1 });
subCategorySchema.index({ name: 'text' });

module.exports = mongoose.model('SubCategory', subCategorySchema);
