const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    brand: {
        type: String,
        trim: true,
        default: 'General'
    },
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
    parentCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null,
    },
    type: {
        type: String,
        enum: ['Main', 'AgeWise', 'Educational', 'Montessori', 'Puzzle'],
        default: 'Main',
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
    // Attributes mapped to this category (age-wise, color-wise, wood-wise, etc.)
    attributes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Attribute',
    }],
    subCategoriesList: {
        type: [String],
        default: []
    },
    availableAges: {
        type: [String],
        default: []
    },
    availableColors: {
        type: [String],
        default: []
    },
    availableWoodTypes: {
        type: [String],
        default: []
    },
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
    banner: require('./CloudinaryAsset'),
    icon: require('./CloudinaryAsset'),
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
categorySchema.index({ isDeleted: 1, isActive: 1, displayOrder: 1 });
categorySchema.index({ name: 'text' });

module.exports = mongoose.model('Category', categorySchema);
