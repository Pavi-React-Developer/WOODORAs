const Product = require('../models/Product');
const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const Attribute = require('../models/Attribute');
const ProductAttributeValue = require('../models/ProductAttributeValue');
const Inventory = require('../models/Inventory');
const ProductImage = require('../models/catalog/ProductImage');
const ProductVariant = require('../models/ProductVariant');
const ProductVariantOption = require('../models/ProductVariantOption');
const { deleteFromCloudinary } = require('../services/uploadService');

// ==========================================
// PRODUCT CONTROLLERS (ENHANCED)
// ==========================================

// @desc    Create a new product with dynamic attributes
// @route   POST /api/catalog/products
// @access  Private/Admin
const createProduct = async (req, res) => {
    try {
        const { name, slug, description, category, subCategory, sku, price, compareAtPrice, images, attributes, ageGroup, ageColors, woodType } = req.body;

        // Validate required fields
        if (!name || !category) {
            return res.status(400).json({ message: 'Name and category are required' });
        }

        // Check if product slug already exists
        const productExists = await Product.findOne({ slug: slug || name.toLowerCase().replace(/\s+/g, '-') });
        if (productExists) {
            return res.status(400).json({ message: 'Product with this slug already exists' });
        }

        // Check if category exists
        const categoryExists = await Category.findById(category);
        if (!categoryExists) {
            return res.status(400).json({ message: 'Invalid category' });
        }

        // Subcategory is now a string matching what the admin added in the Category.
        // No need to query the old SubCategory model.

        const normalizedPrice = Number(price);
        const normalizedCompareAtPrice = Number(compareAtPrice);

        // Create product
        const product = await Product.create({
            name,
            slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
            description,
            category,
            subCategory: subCategory || undefined,
            sku,
            price: Number.isFinite(normalizedPrice) ? normalizedPrice : 0,
            compareAtPrice: Number.isFinite(normalizedCompareAtPrice) ? normalizedCompareAtPrice : 0,
            images: images || [],
            isActive: true,
            ageGroup,
            ageColors,
            woodType
        });

        // Save product attributes if provided
        if (attributes && Object.keys(attributes).length > 0) {
            const attributeEntries = Object.entries(attributes);
            
            for (const [attributeId, value] of attributeEntries) {
                const attributeExists = await Attribute.findById(attributeId);
                if (!attributeExists) continue;

                // If subcategory exists, verify attribute belongs to it
                if (subCategoryExists) {
                    const isInSubcategory = subCategoryExists.attributes.map(id => id.toString()).includes(attributeId);
                    if (!isInSubcategory) continue;
                }

                await ProductAttributeValue.findOneAndUpdate(
                    { product: product._id, attribute: attributeId },
                    {
                        product: product._id,
                        attribute: attributeId,
                        value: Array.isArray(value) ? value.join(', ') : String(value),
                        values: Array.isArray(value) ? value : [String(value)],
                    },
                    { upsert: true, returnDocument: 'after' }
                );
            }
        }

        // Populate and return
        const populatedProduct = await Product.findById(product._id)
            .populate('category', 'name slug')
            .populate('subCategory', 'name slug attributes');

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: populatedProduct,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all products with pagination, search, and filters
// @route   GET /api/catalog/products
// @access  Public
const getProducts = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', category, subCategory, status } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build filter
        let filter = {};
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { sku: { $regex: search, $options: 'i' } },
            ];
        }
        if (category) filter.category = category;
        if (subCategory) filter.subCategory = subCategory;
        if (status !== undefined) filter.isActive = status === 'true';

        const total = await Product.countDocuments(filter);
        const products = await Product.find(filter)
            .populate('category')
            .populate('subCategory')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Get inventory info for each product
        const productsWithInventory = await Promise.all(
            products.map(async (product) => {
                const inventory = await Inventory.findOne({ product: product._id });
                const attributes = await ProductAttributeValue.find({ product: product._id })
                    .populate('attribute', 'name type');
                const images = await ProductImage.find({ product: product._id }).sort({ displayOrder: 1 });
                
                const productObj = product.toObject();
                if (images && images.length > 0) {
                    productObj.images = images.map(img => img.url);
                }
                
                return {
                    ...productObj,
                    inventory: inventory ? { sku: inventory.sku, stockQuantity: inventory.stockQuantity } : null,
                    attributes,
                };
            })
        );

        res.json({
            success: true,
            data: productsWithInventory,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single product with all details
// @route   GET /api/catalog/products/:id
// @access  Public
const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('category', 'name slug')
            .populate({
                path: 'subCategory',
                select: 'name slug attributes',
                populate: { path: 'attributes', select: 'name type' }
            });

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const inventory = await Inventory.findOne({ product: product._id });
        const attributes = await ProductAttributeValue.find({ product: product._id })
            .populate('attribute', 'name type slug')
            .populate('attribute.values', 'value colorCode');
        const images = await ProductImage.find({ product: product._id }).sort({ displayOrder: 1 });
        
        const productObj = product.toObject();
        if (images && images.length > 0) {
            productObj.images = images.map(img => img.url);
        }

        res.json({
            success: true,
            data: {
                ...productObj,
                inventory,
                attributes,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update product
// @route   PUT /api/catalog/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
    try {
        const { name, description, price, compareAtPrice, images, sku, isActive, attributes } = req.body;

        let product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Update basic fields
        if (name) product.name = name;
        if (description) product.description = description;
        if (price !== undefined) {
            const normalizedPrice = Number(price);
            if (Number.isFinite(normalizedPrice)) {
                product.price = normalizedPrice;
            }
        }
        if (compareAtPrice !== undefined) {
            const normalizedCompareAtPrice = Number(compareAtPrice);
            if (Number.isFinite(normalizedCompareAtPrice)) {
                product.compareAtPrice = normalizedCompareAtPrice;
            }
        }
        if (images) product.images = images;
        if (sku) product.sku = sku;
        if (isActive !== undefined) product.isActive = isActive;

        product = await product.save();

        // Update attributes if provided
        if (attributes && Object.keys(attributes).length > 0) {
            const attributeEntries = Object.entries(attributes);
            
            for (const [attributeId, value] of attributeEntries) {
                const attributeExists = await Attribute.findById(attributeId);
                if (!attributeExists) continue;

                if (value === null || value === undefined) {
                    // Delete attribute value
                    await ProductAttributeValue.deleteOne({
                        product: product._id,
                        attribute: attributeId,
                    });
                } else {
                    // Update or create attribute value
                    await ProductAttributeValue.findOneAndUpdate(
                        { product: product._id, attribute: attributeId },
                        {
                            product: product._id,
                            attribute: attributeId,
                            value: Array.isArray(value) ? undefined : value,
                            values: Array.isArray(value) ? value : undefined,
                        },
                        { upsert: true, returnDocument: 'after' }
                    );
                }
            }
        }

        // Populate and return
        const populatedProduct = await Product.findById(product._id)
            .populate('category', 'name slug')
            .populate('subCategory', 'name slug');

        res.json({
            success: true,
            message: 'Product updated successfully',
            data: populatedProduct,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete product
// @route   DELETE /api/catalog/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const variants = await ProductVariant.find({ product: product._id });
        const variantIds = variants.map(v => v._id);
        
        // Delete variant images from Cloudinary
        for (const variant of variants) {
            for (const img of (variant.images || [])) {
                if (img.public_id) await deleteFromCloudinary(img.public_id, img.resource_type || 'image').catch(console.error);
            }
        }

        // Delete product images from Cloudinary
        for (const img of (product.images || [])) {
            if (img.public_id) await deleteFromCloudinary(img.public_id, img.resource_type || 'image').catch(console.error);
        }
        
        // Delete from ProductImage collection (which might also have unique images)
        const productImages = await ProductImage.find({ product: product._id });
        for (const pImg of productImages) {
             if (pImg.public_id) await deleteFromCloudinary(pImg.public_id, pImg.resource_type || 'image').catch(console.error);
        }

        await ProductVariantOption.deleteMany({ variant: { $in: variantIds } });
        await ProductVariant.deleteMany({ product: product._id });
        await ProductImage.deleteMany({ product: product._id });
        await Inventory.deleteMany({ product: product._id });
        await ProductAttributeValue.deleteMany({ product: product._id });
        await Product.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Product deleted successfully',
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Toggle product status
// @route   PATCH /api/catalog/products/:id/toggle-status
// @access  Private/Admin
const toggleProductStatus = async (req, res) => {
    try {
        let product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        product.isActive = !product.isActive;
        product = await product.save();

        res.json({
            success: true,
            message: `Product ${product.isActive ? 'activated' : 'deactivated'} successfully`,
            data: product,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get attribute options for a subcategory (for product add form)
// @route   GET /api/catalog/subcategories/:subCategoryId/attributes
// @access  Public
const getSubCategoryAttributes = async (req, res) => {
    try {
        const AttributeValue = require('../models/AttributeValue');

        const subCategory = await SubCategory.findById(req.params.subCategoryId)
            .populate('attributes', 'name slug type displayOrder');

        if (!subCategory) {
            return res.status(404).json({ success: false, message: 'SubCategory not found' });
        }

        // For each attribute, fetch its available values from AttributeValue collection
        const attributesWithValues = await Promise.all(
            subCategory.attributes.map(async (attr) => {
                const values = await AttributeValue.find({ attribute: attr._id, isActive: true })
                    .sort({ displayOrder: 1 })
                    .select('_id value slug colorCode displayOrder');
                return {
                    _id: attr._id,
                    name: attr.name,
                    slug: attr.slug,
                    type: attr.type,
                    values,
                };
            })
        );

        res.json({
            success: true,
            data: attributesWithValues,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Generate a unique SKU based on category and subcategory
// @route   GET /api/catalog/sku/generate?category=id&subCategory=id
// @access  Private/Admin
const generateSKU = async (req, res) => {
    try {
        const { category, subCategory } = req.query;

        if (!category) {
            return res.status(400).json({ message: 'Category is required' });
        }

        const categoryExists = await Category.findById(category);
        if (!categoryExists) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Build prefix from category name (first 3 uppercase chars, letters only)
        const catPrefix = categoryExists.name
            .replace(/[^a-zA-Z]/g, '')
            .substring(0, 3)
            .toUpperCase()
            .padEnd(3, 'X');

        let subCatPrefix = 'GEN';
        if (subCategory) {
            const subCategoryExists = await SubCategory.findById(subCategory);
            if (subCategoryExists) {
                subCatPrefix = subCategoryExists.name
                    .replace(/[^a-zA-Z]/g, '')
                    .substring(0, 3)
                    .toUpperCase()
                    .padEnd(3, 'X');
            }
        }

        // Count existing products in this category (+subcategory) to generate unique number
        const filter = { category };
        if (subCategory) filter.subCategory = subCategory;
        const count = await Product.countDocuments(filter);
        const paddedCount = String(count + 1).padStart(3, '0');

        const sku = `${catPrefix}-${subCatPrefix}-${paddedCount}`;

        // Ensure SKU is unique (increment if collision)
        let uniqueSku = sku;
        let increment = count + 1;
        while (await Product.findOne({ sku: uniqueSku })) {
            increment++;
            uniqueSku = `${catPrefix}-${subCatPrefix}-${String(increment).padStart(3, '0')}`;
        }

        res.json({
            success: true,
            data: { sku: uniqueSku },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {

    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct,
    toggleProductStatus,
    getSubCategoryAttributes,
    generateSKU,
};

