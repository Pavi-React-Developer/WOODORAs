const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

/**
 * Uploads a file buffer to Cloudinary using upload_stream
 * @param {Buffer} buffer - The file buffer from multer
 * @param {String} folder - The Cloudinary folder to upload to
 * @param {String} resourceType - 'image' or 'video'
 * @param {Object} optimizationParams - Additional Cloudinary transformations
 * @returns {Promise<Object>} - Cloudinary upload result
 */
const uploadToCloudinary = (buffer, folder, resourceType = 'image', optimizationParams = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: folder,
      resource_type: resourceType,
      ...optimizationParams,
    };

    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('Cloudinary Upload Error:', error);
          return reject(error);
        }
        resolve(result);
      }
    );

    // Pipe the buffer to Cloudinary
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

/**
 * Deletes an asset from Cloudinary
 * @param {String} publicId - The public ID of the asset
 * @param {String} resourceType - 'image' or 'video'
 * @returns {Promise<Object>}
 */
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    if (!publicId) return null;
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return result;
  } catch (error) {
    console.error('Cloudinary Delete Error:', error);
    throw error;
  }
};

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
};
