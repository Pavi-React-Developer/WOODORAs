const Product = require('../models/Product');
const Category = require('../models/Category');
const Inventory = require('../models/Inventory');

// ==========================================
// PRODUCT CONTROLLERS
// ==========================================

// @desc    Create a new product
// @route   POST /api/catalog/product
// @access  Private/Admin
const createProduct = async (req, res) => {
    try {
        const { name, slug, description, category, subCategory, price, compareAtPrice, images, variants, ageGroup, toyType, woodType, skillDevelopment, theme, materialType, seoTitle, seoDescription } = req.body;

        const productExists = await Product.findOne({ slug });
        if (productExists) {
            return res.status(400).json({ message: 'Product with this slug already exists' });
        }

        const categoryExists = await Category.findById(category);
        if (!categoryExists) {
             return res.status(400).json({ message: 'Invalid category ID' });
        }

        const product = await Product.create({
            name, slug, description, category, subCategory, price, compareAtPrice, images, variants, ageGroup, toyType, woodType, skillDevelopment, theme, materialType, seoTitle, seoDescription
        });

        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all products
// @route   GET /api/catalog/product
// @access  Public
const getProducts = async (req, res) => {
    try {
        const products = await Product.find({}).populate('category', 'name slug image').populate('subCategory', 'name slug image');
        const inventories = await Inventory.find({});
        const productsWithInventory = products.map(p => {
            const inv = inventories.find(i => i.product.toString() === p._id.toString());
            return {
                ...p.toObject(),
                inventory: inv ? { sku: inv.sku, stockQuantity: inv.stockQuantity } : null
            };
        });
        res.json(productsWithInventory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single product by ID
// @route   GET /api/catalog/product/:id
// @access  Public
const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('category', 'name slug image').populate('subCategory', 'name slug image');
        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a product
// @route   PUT /api/catalog/product/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after', runValidators: true });
        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a product (and its inventory)
// @route   DELETE /api/catalog/product/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (product) {
            // Also delete associated inventory
            await Inventory.findOneAndDelete({ product: req.params.id });
            res.json({ message: 'Product and associated inventory removed' });
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ==========================================
// CATEGORY CONTROLLERS
// ==========================================

// @desc    Create a category
// @route   POST /api/catalog/category
// @access  Private/Admin
const createCategory = async (req, res) => {
    try {
        const category = await Category.create(req.body);
        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all categories
// @route   GET /api/catalog/category
// @access  Public
const getCategories = async (req, res) => {
    try {
        const categories = await Category.find({}).populate('parentCategory', 'name slug');
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update a category
// @route   PUT /api/catalog/category/:id
// @access  Private/Admin
const updateCategory = async (req, res) => {
    try {
        const category = await Category.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after', runValidators: true }).populate('parentCategory', 'name slug');
        if (category) {
            res.json(category);
        } else {
            res.status(404).json({ message: 'Category not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a category
// @route   DELETE /api/catalog/category/:id
// @access  Private/Admin
const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);
        if (category) {
            res.json({ message: 'Category removed' });
        } else {
            res.status(404).json({ message: 'Category not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ==========================================
// INVENTORY CONTROLLERS
// ==========================================

// @desc    Initialize/Create inventory for a product
// @route   POST /api/catalog/inventory
// @access  Private/Admin
const createInventory = async (req, res) => {
    try {
        const { product, sku, stockQuantity, warehouseLocation, lowStockThreshold } = req.body;
        
        const invExists = await Inventory.findOne({ product });
        if (invExists) return res.status(400).json({ message: 'Inventory already initialized for this product' });

        const inventory = await Inventory.create({ product, sku, stockQuantity, warehouseLocation, lowStockThreshold });
        res.status(201).json(inventory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update inventory stock
// @route   PUT /api/catalog/inventory/:productId
// @access  Private/Admin
const updateInventory = async (req, res) => {
    try {
        const inventory = await Inventory.findOneAndUpdate(
            { product: req.params.productId }, 
            req.body, 
            { returnDocument: 'after', runValidators: true }
        );
        if (inventory) {
            res.json(inventory);
        } else {
            res.status(404).json({ message: 'Inventory not found for this product' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createProduct, getProducts, getProductById, updateProduct, deleteProduct,
    createCategory, getCategories, updateCategory, deleteCategory,
    createInventory, updateInventory
};
