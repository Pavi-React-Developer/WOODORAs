const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');

// Import controllers
const categoryController = require('../controllers/categoryController');
const subCategoryController = require('../controllers/subCategoryController');
const attributeController = require('../controllers/attributeController');
const productController = require('../controllers/productController');
const productVariantController = require('../controllers/productVariantController');
const catalogController = require('../controllers/catalogController');
const uploadController = require('../controllers/uploadController');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { cacheMiddleware, clearCache } = require('../middleware/cacheMiddleware');

// Helper to clear cache on updates
const bustCache = (req, res, next) => {
    clearCache();
    next();
};

// ==========================================
// CATEGORY ROUTES
// ==========================================
router.get('/shop-categories', cacheMiddleware(300), categoryController.getShopCategories);
router.post('/categories', protect, authorize('admin', 'staff'), bustCache, categoryController.createCategory);
router.post('/categories/bulk', protect, authorize('admin', 'staff'), bustCache, categoryController.bulkCreateCategory);
router.get('/categories', cacheMiddleware(300), categoryController.getCategories);
router.get('/categories/:id', cacheMiddleware(300), categoryController.getCategoryById);
router.get('/categories/:id/attributes', cacheMiddleware(300), categoryController.getCategoryAttributes);
router.put('/categories/:id', protect, authorize('admin', 'staff'), bustCache, categoryController.updateCategory);
router.delete('/categories/:id', protect, authorize('admin', 'staff'), bustCache, categoryController.deleteCategory);
router.patch('/categories/:id/toggle-status', protect, authorize('admin', 'staff'), bustCache, categoryController.toggleCategoryStatus);

// Legacy routes for backward compatibility
router.get('/category', categoryController.getCategories);
router.post('/category', protect, authorize('admin', 'staff'), categoryController.createCategory);
router.put('/category/:id', protect, authorize('admin', 'staff'), categoryController.updateCategory);
router.delete('/category/:id', protect, authorize('admin', 'staff'), categoryController.deleteCategory);

// ==========================================
// SUB CATEGORY ROUTES
// ==========================================
router.post('/subcategories', subCategoryController.createSubCategory);
router.get('/subcategories', subCategoryController.getSubCategories);
router.get('/subcategories/:id', subCategoryController.getSubCategoryById);
router.put('/subcategories/:id', subCategoryController.updateSubCategory);
router.delete('/subcategories/:id', subCategoryController.deleteSubCategory);
router.patch('/subcategories/:id/toggle-status', subCategoryController.toggleSubCategoryStatus);
router.patch('/subcategories/:id/attributes', subCategoryController.updateSubCategoryAttributes);

// ==========================================
// ATTRIBUTE ROUTES
// ==========================================
// Attributes
router.post('/attributes', attributeController.createAttribute);
router.get('/attributes', attributeController.getAttributes);
router.get('/attributes/:id', attributeController.getAttributeById);
router.put('/attributes/:id', attributeController.updateAttribute);
router.delete('/attributes/:id', attributeController.deleteAttribute);
router.patch('/attributes/:id/toggle-status', attributeController.toggleAttributeStatus);

// Attribute Values
router.post('/attributes/:id/values', attributeController.createAttributeValue);
router.get('/attributes/:id/values', attributeController.getAttributeValues);
router.put('/attribute-values/:id', attributeController.updateAttributeValue);
router.delete('/attribute-values/:id', attributeController.deleteAttributeValue);
router.patch('/attribute-values/:id/toggle-status', attributeController.toggleAttributeValueStatus);

// ==========================================
// SKU GENERATION
// ==========================================
router.get('/sku/generate', productController.generateSKU);

// ==========================================
// IMAGE UPLOAD ROUTES
// ==========================================
router.post('/upload', uploadLimiter, uploadController.uploadImages);
router.delete('/upload', uploadLimiter, uploadController.deleteImage);

// ==========================================
// PRODUCT ROUTES
// ==========================================
router.post('/products', protect, authorize('admin', 'staff'), bustCache, productController.createProduct);
router.get('/products', cacheMiddleware(300), productController.getProducts);
router.get('/products/:id', cacheMiddleware(300), productController.getProductById);
router.put('/products/:id', protect, authorize('admin', 'staff'), bustCache, productController.updateProduct);
router.delete('/products/:id', protect, authorize('admin', 'staff'), bustCache, productController.deleteProduct);
router.patch('/products/:id/toggle-status', protect, authorize('admin', 'staff'), bustCache, productController.toggleProductStatus);
router.get('/subcategories/:subCategoryId/attributes', cacheMiddleware(300), productController.getSubCategoryAttributes);

// Legacy routes for backward compatibility
router.get('/product', productController.getProducts);
router.post('/product', protect, authorize('admin', 'staff'), productController.createProduct);
router.get('/product/:id', productController.getProductById);
router.put('/product/:id', protect, authorize('admin', 'staff'), productController.updateProduct);
router.delete('/product/:id', protect, authorize('admin', 'staff'), productController.deleteProduct);

// ==========================================
// PRODUCT VARIANT ROUTES
// ==========================================
router.post('/products/:productId/variants/generate', productVariantController.generateVariants);
router.get('/products/:productId/variants', productVariantController.getProductVariants);
router.get('/products/:productId/variants/config', productVariantController.getVariantConfig);
router.put('/variants/:variantId', productVariantController.updateVariant);
router.put('/products/:productId/variants/bulk-update', productVariantController.bulkUpdateVariants);
router.delete('/variants/:variantId', productVariantController.deleteVariant);
router.delete('/products/:productId/variants/bulk-delete', productVariantController.bulkDeleteVariants);
router.post('/variants/:variantId/images', productVariantController.addVariantImages);
router.delete('/variants/:variantId/images/:imageIndex', productVariantController.removeVariantImage);

// ==========================================
// INVENTORY ROUTES (Legacy)
// ==========================================
router.post('/inventory', protect, authorize('admin', 'staff'), catalogController.createInventory);
router.put('/inventory/:productId', protect, authorize('admin', 'staff'), catalogController.updateInventory);

module.exports = router;
