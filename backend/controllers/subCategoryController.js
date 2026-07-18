const SubCategory = require('../models/SubCategory');
const Category = require('../models/Category');
const { deleteFromCloudinary } = require('../services/uploadService');
const Attribute = require('../models/Attribute');

// ==========================================
// SUB CATEGORY CONTROLLERS
// ==========================================

// @desc    Create a new subcategory
// @route   POST /api/catalog/subcategories
// @access  Private/Admin
const createSubCategory = async (req, res) => {
    try {
        const { name, slug, category, description, image, attributes, displayOrder } = req.body;

        // Validate input
        if (!name || !category) {
            return res.status(400).json({ message: 'SubCategory name and category are required' });
        }

        // Check if parent category exists
        const parentCategory = await Category.findById(category);
        if (!parentCategory) {
            return res.status(400).json({ message: 'Parent category not found' });
        }

        // Check if subcategory already exists
        const existingSubCategory = await SubCategory.findOne({ 
            slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
            category 
        });
        if (existingSubCategory) {
            return res.status(400).json({ message: 'SubCategory already exists in this category' });
        }

        // Validate attributes if provided
        if (attributes && attributes.length > 0) {
            const attributesExist = await Attribute.find({ _id: { $in: attributes } });
            if (attributesExist.length !== attributes.length) {
                return res.status(400).json({ message: 'One or more attributes do not exist' });
            }
        }

        const subCategory = await SubCategory.create({
            name,
            slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
            category,
            description,
            image,
            attributes: attributes || [],
            displayOrder: displayOrder || 1,
            isActive: true,
        });

        // Populate references
        const populated = await subCategory.populate(['category', 'attributes']);

        res.status(201).json({
            success: true,
            message: 'SubCategory created successfully',
            data: populated,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all subcategories with pagination and filters
// @route   GET /api/catalog/subcategories
// @access  Public
const getSubCategories = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', category, status } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build filter
        let filter = {};
        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }
        if (category) {
            filter.category = category;
        }
        if (status !== undefined) {
            filter.isActive = status === 'true';
        }

        const total = await SubCategory.countDocuments(filter);
        const subCategories = await SubCategory.find(filter)
            .populate('category', 'name slug')
            .populate('attributes', 'name type')
            .sort({ displayOrder: 1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Get product count for each subcategory
        const subCategoriesWithCount = await Promise.all(
            subCategories.map(async (subCat) => {
                const productCount = await require('../models/Product').countDocuments({ subCategory: subCat._id });
                return {
                    ...subCat.toObject(),
                    productCount,
                    attributeCount: subCat.attributes.length,
                };
            })
        );

        res.json({
            success: true,
            data: subCategoriesWithCount,
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

// @desc    Get single subcategory by ID
// @route   GET /api/catalog/subcategories/:id
// @access  Public
const getSubCategoryById = async (req, res) => {
    try {
        const subCategory = await SubCategory.findById(req.params.id)
            .populate('category', 'name slug')
            .populate('attributes');

        if (!subCategory) {
            return res.status(404).json({ success: false, message: 'SubCategory not found' });
        }

        const productCount = await require('../models/Product').countDocuments({ subCategory: subCategory._id });

        res.json({
            success: true,
            data: {
                ...subCategory.toObject(),
                productCount,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update subcategory
// @route   PUT /api/catalog/subcategories/:id
// @access  Private/Admin
const updateSubCategory = async (req, res) => {
    try {
        const { name, description, image, attributes, displayOrder, isActive } = req.body;

        let subCategory = await SubCategory.findById(req.params.id);
        if (!subCategory) {
            return res.status(404).json({ success: false, message: 'SubCategory not found' });
        }

        // Validate attributes if provided
        if (attributes && attributes.length > 0) {
            const attributesExist = await Attribute.find({ _id: { $in: attributes } });
            if (attributesExist.length !== attributes.length) {
                return res.status(400).json({ message: 'One or more attributes do not exist' });
            }
        }

        // Update fields
        if (name) subCategory.name = name;
        if (description) subCategory.description = description;
        if (image) subCategory.image = image;
        if (attributes) subCategory.attributes = attributes;
        if (displayOrder !== undefined) subCategory.displayOrder = displayOrder;
        if (isActive !== undefined) subCategory.isActive = isActive;

        subCategory = await subCategory.save();
        await subCategory.populate(['category', 'attributes']);

        res.json({
            success: true,
            message: 'SubCategory updated successfully',
            data: subCategory,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete subcategory
// @route   DELETE /api/catalog/subcategories/:id
// @access  Private/Admin
const deleteSubCategory = async (req, res) => {
    try {
        const subCategory = await SubCategory.findById(req.params.id);
        if (!subCategory) {
            return res.status(404).json({ success: false, message: 'SubCategory not found' });
        }

        // Check if subcategory has products
        const productCount = await require('../models/Product').countDocuments({ subCategory: subCategory._id });
        if (productCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete subcategory with ${productCount} products. Delete products first.`,
            });
        }

        if (subCategory.image?.public_id) {
            await deleteFromCloudinary(subCategory.image.public_id, subCategory.image.resource_type || 'image').catch(console.error);
        }

        await SubCategory.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'SubCategory deleted successfully',
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Toggle subcategory status
// @route   PATCH /api/catalog/subcategories/:id/toggle-status
// @access  Private/Admin
const toggleSubCategoryStatus = async (req, res) => {
    try {
        let subCategory = await SubCategory.findById(req.params.id);
        if (!subCategory) {
            return res.status(404).json({ success: false, message: 'SubCategory not found' });
        }

        subCategory.isActive = !subCategory.isActive;
        subCategory = await subCategory.save();
        await subCategory.populate(['category', 'attributes']);

        res.json({
            success: true,
            message: `SubCategory ${subCategory.isActive ? 'activated' : 'deactivated'} successfully`,
            data: subCategory,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update attributes for subcategory
// @route   PATCH /api/catalog/subcategories/:id/attributes
// @access  Private/Admin
const updateSubCategoryAttributes = async (req, res) => {
    try {
        const { attributes } = req.body;

        if (!attributes || !Array.isArray(attributes)) {
            return res.status(400).json({ message: 'Attributes must be an array' });
        }

        // Validate attributes
        const attributesExist = await Attribute.find({ _id: { $in: attributes } });
        if (attributesExist.length !== attributes.length) {
            return res.status(400).json({ message: 'One or more attributes do not exist' });
        }

        let subCategory = await SubCategory.findByIdAndUpdate(
            req.params.id,
            { attributes },
            { returnDocument: 'after' }
        ).populate(['category', 'attributes']);

        if (!subCategory) {
            return res.status(404).json({ success: false, message: 'SubCategory not found' });
        }

        res.json({
            success: true,
            message: 'Attributes updated successfully',
            data: subCategory,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createSubCategory,
    getSubCategories,
    getSubCategoryById,
    updateSubCategory,
    deleteSubCategory,
    toggleSubCategoryStatus,
    updateSubCategoryAttributes,
};
