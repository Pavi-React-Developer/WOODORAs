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

// ==========================================
// CATEGORY ROUTES
// ==========================================
router.get('/shop-categories', categoryController.getShopCategories);
router.post('/categories', categoryController.createCategory);
router.post('/categories/bulk', categoryController.bulkCreateCategory);
router.get('/categories', categoryController.getCategories);
router.get('/categories/:id', categoryController.getCategoryById);
router.get('/categories/:id/attributes', categoryController.getCategoryAttributes);
router.put('/categories/:id', categoryController.updateCategory);
router.delete('/categories/:id', categoryController.deleteCategory);
router.patch('/categories/:id/toggle-status', categoryController.toggleCategoryStatus);

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
router.post('/upload', uploadController.uploadImages);
router.delete('/upload', uploadController.deleteImage);

// ==========================================
// PRODUCT ROUTES
// ==========================================
router.post('/products', productController.createProduct);
router.get('/products', productController.getProducts);
router.get('/products/:id', productController.getProductById);
router.put('/products/:id', productController.updateProduct);
router.delete('/products/:id', productController.deleteProduct);
router.patch('/products/:id/toggle-status', productController.toggleProductStatus);
router.get('/subcategories/:subCategoryId/attributes', productController.getSubCategoryAttributes);

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
