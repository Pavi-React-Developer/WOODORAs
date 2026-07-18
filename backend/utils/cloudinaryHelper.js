/**
 * Helper utility for Cloudinary operations
 */

const getCloudinaryFolder = (type) => {
  const folders = {
    product: 'products/images',
    video: 'products/videos',
    category: 'categories',
    brand: 'brands',
    banner: 'banners',
    review: 'reviews',
    cms: 'cms',
    user: 'users',
    invoice: 'invoices',
  };
  return folders[type] || 'misc';
};

const getImageOptimizationParams = () => {
  return {
    fetch_format: 'auto', // Automatically convert to AVIF or WebP
    quality: 'auto', // Auto compression
    dpr: 'auto', // Auto device pixel ratio
    crop: 'fill',
    gravity: 'auto',
  };
};

const getVideoOptimizationParams = () => {
  return {
    resource_type: 'video',
    fetch_format: 'auto',
    quality: 'auto',
    streaming_profile: 'hd', // Adaptive bitrate
  };
};

module.exports = {
  getCloudinaryFolder,
  getImageOptimizationParams,
  getVideoOptimizationParams,
};
