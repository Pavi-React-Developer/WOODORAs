const categoryService = require('../services/categoryService');
const subCategoryService = require('../services/subCategoryService');
const attributeService = require('../services/attributeService');
const productService = require('../services/productService');
const auditService = require('../services/auditService');

// Helper to construct auditContext from request
const getAuditContext = (req) => req.auditContext || {
    userId: req.user ? req.user._id : null,
    ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    userAgent: req.headers['user-agent']
};

// ==========================================
// CATEGORY CONTROLLERS
// ==========================================
const getCategories = async (req, res) => {
    try {
        const result = await categoryService.getCategories(req.query);
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getCategoryById = async (req, res) => {
    try {
        const category = await categoryService.getCategoryById(req.params.id);
        res.json({ success: true, category });
    } catch (err) {
        res.status(err.message === 'Category not found' ? 404 : 500).json({ success: false, message: err.message });
    }
};

const createCategory = async (req, res) => {
    try {
        const category = await categoryService.createCategory(req.body, getAuditContext(req));
        res.status(201).json({ success: true, message: 'Category created successfully', category });
    } catch (err) {
        console.error('[createCategory] Error:', err.message, '| Body:', JSON.stringify(req.body));
        res.status(400).json({ success: false, message: err.message });
    }
};

const updateCategory = async (req, res) => {
    try {
        const category = await categoryService.updateCategory(req.params.id, req.body, getAuditContext(req));
        res.json({ success: true, message: 'Category updated successfully', category });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

const deleteCategory = async (req, res) => {
    try {
        await categoryService.deleteCategory(req.params.id, getAuditContext(req));
        res.json({ success: true, message: 'Category deleted successfully' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

const restoreCategory = async (req, res) => {
    try {
        const category = await categoryService.restoreCategory(req.params.id, getAuditContext(req));
        res.json({ success: true, message: 'Category restored successfully', category });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

const bulkUpdateCategoriesStatus = async (req, res) => {
    try {
        const { ids, isActive } = req.body;
        if (!Array.isArray(ids) || isActive === undefined) {
            return res.status(400).json({ success: false, message: 'Invalid bulk parameters' });
        }
        const result = await categoryService.bulkUpdateStatus(ids, isActive, getAuditContext(req));
        res.json({ success: true, message: 'Categories updated successfully', ...result });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

const bulkDeleteCategories = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids)) {
            return res.status(400).json({ success: false, message: 'Invalid bulk parameters' });
        }
        const result = await categoryService.bulkDelete(ids, getAuditContext(req));
        res.json({ success: true, message: 'Categories deleted successfully', ...result });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};


// ==========================================
// SUB CATEGORY CONTROLLERS
// ==========================================
const getSubCategories = async (req, res) => {
    try {
        const result = await subCategoryService.getSubCategories(req.query);
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getSubCategoryById = async (req, res) => {
    try {
        const subCategory = await subCategoryService.getSubCategoryById(req.params.id);
        res.json({ success: true, subCategory });
    } catch (err) {
        res.status(err.message === 'SubCategory not found' ? 404 : 500).json({ success: false, message: err.message });
    }
};

const createSubCategory = async (req, res) => {
    try {
        const subCategory = await subCategoryService.createSubCategory(req.body, getAuditContext(req));
        res.status(201).json({ success: true, message: 'SubCategory created successfully', subCategory });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

const updateSubCategory = async (req, res) => {
    try {
        const subCategory = await subCategoryService.updateSubCategory(req.params.id, req.body, getAuditContext(req));
        res.json({ success: true, message: 'SubCategory updated successfully', subCategory });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

const deleteSubCategory = async (req, res) => {
    try {
        await subCategoryService.deleteSubCategory(req.params.id, getAuditContext(req));
        res.json({ success: true, message: 'SubCategory deleted successfully' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

const bulkUpdateSubCategoriesStatus = async (req, res) => {
    try {
        const { ids, isActive } = req.body;
        if (!Array.isArray(ids) || isActive === undefined) {
            return res.status(400).json({ success: false, message: 'Invalid bulk parameters' });
        }
        const result = await subCategoryService.bulkUpdateStatus(ids, isActive, getAuditContext(req));
        res.json({ success: true, message: 'SubCategories updated successfully', ...result });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

const bulkDeleteSubCategories = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids)) {
            return res.status(400).json({ success: false, message: 'Invalid bulk parameters' });
        }
        const result = await subCategoryService.bulkDelete(ids, getAuditContext(req));
        res.json({ success: true, message: 'SubCategories deleted successfully', ...result });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

const mapAttributes = async (req, res) => {
    try {
        const { subCategoryId, mappings } = req.body;
        if (!subCategoryId || !Array.isArray(mappings)) {
            return res.status(400).json({ success: false, message: 'Invalid mapping parameters' });
        }
        const result = await subCategoryService.mapAttributes(subCategoryId, mappings, getAuditContext(req));
        res.json({ success: true, message: 'Attributes mapped successfully', mappings: result });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

const getMappedAttributes = async (req, res) => {
    try {
        const mappings = await subCategoryService.getMappedAttributes(req.params.subCategoryId);
        res.json({ success: true, mappings });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


// ==========================================
// ATTRIBUTE CONTROLLERS
// ==========================================
const getAttributes = async (req, res) => {
    try {
        const result = await attributeService.getAttributes(req.query);
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getAttributeById = async (req, res) => {
    try {
        const attribute = await attributeService.getAttributeById(req.params.id);
        res.json({ success: true, attribute });
    } catch (err) {
        res.status(err.message === 'Attribute not found' ? 404 : 500).json({ success: false, message: err.message });
    }
};

const createAttribute = async (req, res) => {
    try {
        const attribute = await attributeService.createAttribute(req.body, getAuditContext(req));
        res.status(201).json({ success: true, message: 'Attribute created successfully', attribute });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

const updateAttribute = async (req, res) => {
    try {
        const attribute = await attributeService.updateAttribute(req.params.id, req.body, getAuditContext(req));
        res.json({ success: true, message: 'Attribute updated successfully', attribute });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

const deleteAttribute = async (req, res) => {
    try {
        await attributeService.deleteAttribute(req.params.id, getAuditContext(req));
        res.json({ success: true, message: 'Attribute deleted successfully' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};


// ==========================================
// PRODUCT CONTROLLERS
// ==========================================
const getProducts = async (req, res) => {
    try {
        const result = await productService.getProducts(req.query);
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

const getProductById = async (req, res) => {
    try {
        const product = await productService.getProductById(req.params.id);
        res.json({ success: true, product });
    } catch (err) {
        res.status(err.message === 'Product not found' ? 404 : 500).json({ success: false, message: err.message });
    }
};

const createProduct = async (req, res) => {
    try {
        console.log('REQUEST BODY:', req.body); const product = await productService.createProduct(req.body, getAuditContext(req));
        res.status(201).json({ success: true, message: 'Product created successfully', product });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

const updateProduct = async (req, res) => {
    try {
        const product = await productService.updateProduct(req.params.id, req.body, getAuditContext(req));
        res.json({ success: true, message: 'Product updated successfully', product });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

const deleteProduct = async (req, res) => {
    try {
        await productService.deleteProduct(req.params.id, getAuditContext(req));
        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

const bulkUpdateProductsStatus = async (req, res) => {
    try {
        const { ids, isActive } = req.body;
        if (!Array.isArray(ids) || isActive === undefined) {
            return res.status(400).json({ success: false, message: 'Invalid bulk parameters' });
        }
        const result = await productService.bulkUpdateStatus(ids, isActive, getAuditContext(req));
        res.json({ success: true, message: 'Products updated successfully', ...result });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};

const bulkDeleteProducts = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids)) {
            return res.status(400).json({ success: false, message: 'Invalid bulk parameters' });
        }
        const result = await productService.bulkDelete(ids, getAuditContext(req));
        res.json({ success: true, message: 'Products deleted successfully', ...result });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
};


// ==========================================
// AUDIT LOG CONTROLLERS
// ==========================================
const getAuditLogs = async (req, res) => {
    try {
        const result = await auditService.getAuditLogs(req.query, req.query);
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = {
    getCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
    restoreCategory,
    bulkUpdateCategoriesStatus,
    bulkDeleteCategories,
    
    getSubCategories,
    getSubCategoryById,
    createSubCategory,
    updateSubCategory,
    deleteSubCategory,
    bulkUpdateSubCategoriesStatus,
    bulkDeleteSubCategories,
    mapAttributes,
    getMappedAttributes,
    
    getAttributes,
    getAttributeById,
    createAttribute,
    updateAttribute,
    deleteAttribute,
    
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    bulkUpdateProductsStatus,
    bulkDeleteProducts,
    
    getAuditLogs,
};
