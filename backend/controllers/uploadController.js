const { uploadToCloudinary, deleteFromCloudinary } = require('../services/uploadService');
const { getCloudinaryFolder, getImageOptimizationParams, getVideoOptimizationParams } = require('../utils/cloudinaryHelper');
const upload = require('../middlewares/upload');

// @desc    Upload one or more media files
// @route   POST /api/catalog/upload
// @access  Private/Admin
const uploadImages = [
    // Support generic upload form fields that frontend might use
    upload.fields([{ name: 'images', maxCount: 10 }, { name: 'image', maxCount: 1 }, { name: 'avatar', maxCount: 1 }, { name: 'video', maxCount: 1 }]),
    async (req, res) => {
        try {
            // Find which field was used
            let files = [];
            if (req.files) {
                if (req.files.images) files = req.files.images;
                else if (req.files.image) files = req.files.image;
                else if (req.files.avatar) files = req.files.avatar;
                else if (req.files.video) files = req.files.video;
            } else if (req.file) {
                files = [req.file];
            }

            if (!files || files.length === 0) {
                return res.status(400).json({ success: false, message: 'No files uploaded' });
            }

            // Determine upload folder from query param, header, or default
            const folderType = req.body.folder || req.query.folder || 'product';
            const cloudinaryFolder = getCloudinaryFolder(folderType);

            const uploadPromises = files.map(file => {
                const isVideo = file.mimetype.startsWith('video/');
                const optimizationParams = isVideo ? getVideoOptimizationParams() : getImageOptimizationParams();
                return uploadToCloudinary(file.buffer, cloudinaryFolder, isVideo ? 'video' : 'image', optimizationParams);
            });

            const results = await Promise.all(uploadPromises);

            // Map Cloudinary results to DB format
            const uploadedAssets = results.map(result => ({
                url: result.secure_url,
                public_id: result.public_id,
                width: result.width || 0,
                height: result.height || 0,
                format: result.format,
                resource_type: result.resource_type,
                bytes: result.bytes,
                created_at: result.created_at
            }));

            res.status(201).json({
                success: true,
                message: `${files.length} file(s) uploaded successfully`,
                data: uploadedAssets, // returning objects instead of strings
            });
        } catch (error) {
            console.error('Upload Controller Error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },
];

// @desc    Delete an uploaded image by public_id
// @route   DELETE /api/catalog/upload
// @access  Private/Admin
const deleteImage = async (req, res) => {
    try {
        const { public_id, resource_type = 'image' } = req.body;
        
        if (!public_id) {
            return res.status(400).json({ success: false, message: 'public_id is required' });
        }

        const result = await deleteFromCloudinary(public_id, resource_type);
        
        if (result.result === 'ok' || result.result === 'not found') {
            res.json({ success: true, message: 'Asset deleted successfully from Cloudinary' });
        } else {
            res.status(400).json({ success: false, message: 'Failed to delete asset from Cloudinary', result });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { uploadImages, deleteImage };
