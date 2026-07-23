const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
    id: { type: String, required: true }, // e.g., 'navbar', 'heroBanner'
    order: { type: Number, required: true },
    visible: { type: Boolean, default: true },
    settings: { type: Object, default: {} } // For future-ready settings
}, { _id: false });

const cmsLayoutSchema = new mongoose.Schema({
    page: { 
        type: String, 
        required: true, 
        unique: true,
        default: 'home' 
    },
    sections: [sectionSchema]
}, { timestamps: true });

module.exports = mongoose.model('CmsLayout', cmsLayoutSchema);
