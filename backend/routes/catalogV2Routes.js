const express = require('express');
const router = express.Router();
const controller = require('../controllers/catalogV2Controller');
const { protect, authorize } = require('../middleware/authMiddleware');
const { auditContextMiddleware } = require('../middleware/auditMiddleware');
const { validate } = require('../middleware/validateMiddleware');

// Define validation schemas
const categorySchema = {
    name: { type: 'string', required: true },
    description: { type: 'string', required: false },
    slug: { type: 'string', required: false },
    displayOrder: { type: 'number', required: false },
    image: { type: 'object', required: false },   // CloudinaryAsset object
    banner: { type: 'object', required: false },  // CloudinaryAsset object
};

const subCategorySchema = {
    name: { type: 'string', required: true },
    category: { type: 'string', required: true },
    description: { type: 'string', required: false },
    slug: { type: 'string', required: false },
    displayOrder: { type: 'number', required: false },
};

const attributeSchema = {
    name: { type: 'string', required: true },
    type: { type: 'string', required: true },
    description: { type: 'string', required: false },
};

const productSchema = {
    name: { type: 'string', required: true },
    category: { type: 'string', required: true },
    price: { type: 'number', required: true, min: 0 },
    sku: { type: 'string', required: false },
};

// ==========================================
// PUBLIC/READ-ONLY PATHS (Optionally JWT authenticated depending on requirements)
// ==========================================
router.get('/categories', controller.getCategories);
router.get('/categories/:id', controller.getCategoryById);

router.get('/subcategories', controller.getSubCategories);
router.get('/subcategories/:id', controller.getSubCategoryById);
router.get('/subcategories/:subCategoryId/attributes', controller.getMappedAttributes);

router.get('/attributes', controller.getAttributes);
router.get('/attributes/:id', controller.getAttributeById);

router.get('/products', controller.getProducts);
router.get('/products/:id', controller.getProductById);

// ==========================================
// PROTECTED ADMIN PATHS
// ==========================================
router.use(protect);
router.use(authorize('admin'));
router.use(auditContextMiddleware);

// Categories
router.post('/categories', validate(categorySchema), controller.createCategory);
router.put('/categories/bulk-status', controller.bulkUpdateCategoriesStatus);
router.put('/categories/bulk-delete', controller.bulkDeleteCategories);
router.put('/categories/:id', validate(categorySchema), controller.updateCategory);
router.delete('/categories/:id', controller.deleteCategory);
router.post('/categories/:id/restore', controller.restoreCategory);

// Subcategories
router.post('/subcategories', validate(subCategorySchema), controller.createSubCategory);
router.put('/subcategories/bulk-status', controller.bulkUpdateSubCategoriesStatus);
router.put('/subcategories/bulk-delete', controller.bulkDeleteSubCategories);
router.put('/subcategories/:id', validate(subCategorySchema), controller.updateSubCategory);
router.delete('/subcategories/:id', controller.deleteSubCategory);

// Attribute Mapping
router.post('/subcategories/map-attributes', controller.mapAttributes);

// Attributes
router.post('/attributes', validate(attributeSchema), controller.createAttribute);
router.put('/attributes/:id', validate(attributeSchema), controller.updateAttribute);
router.delete('/attributes/:id', controller.deleteAttribute);

// Products
router.post('/products', validate(productSchema), controller.createProduct);
router.put('/products/bulk-status', controller.bulkUpdateProductsStatus);
router.put('/products/bulk-delete', controller.bulkDeleteProducts);
router.put('/products/:id', validate(productSchema), controller.updateProduct);
router.delete('/products/:id', controller.deleteProduct);

// Audit logs
router.get('/audit-logs', controller.getAuditLogs);

module.exports = router;
