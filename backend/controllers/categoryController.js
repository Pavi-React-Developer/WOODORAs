const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const Attribute = require('../models/Attribute');
const AttributeValue = require('../models/AttributeValue');

// ==========================================
// CATEGORY CONTROLLERS
// ==========================================

// @desc    Create a new category
// @route   POST /api/catalog/categories
// @access  Private/Admin
const createCategory = async (req, res) => {
    try {
        const { name, slug, description, image, displayOrder, parentCategory, attributes, brand, subCategoriesList, availableAges, availableColors, availableWoodTypes, seoTitle, seoDescription } = req.body;

        // Validate input
        if (!name) {
            return res.status(400).json({ message: 'Category name is required' });
        }

        // Check if category already exists
        const existingCategory = await Category.findOne({ slug: slug || name.toLowerCase().replace(/\s+/g, '-') });
        if (existingCategory) {
            return res.status(400).json({ message: 'Category already exists' });
        }

        // Validate parent category if provided
        if (parentCategory) {
            const parent = await Category.findById(parentCategory);
            if (!parent) {
                return res.status(400).json({ message: 'Parent category not found' });
            }
        }

        // Validate attributes if provided
        if (attributes && attributes.length > 0) {
            const attributesExist = await Attribute.find({ _id: { $in: attributes } });
            if (attributesExist.length !== attributes.length) {
                return res.status(400).json({ message: 'One or more attributes do not exist' });
            }
        }

        const category = await Category.create({
            name,
            slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
            description,
            image,
            displayOrder: displayOrder || 1,
            isActive: true,
            parentCategory: parentCategory || null,
            attributes: attributes || [],
            brand: brand || 'WoodenToys',
            subCategoriesList: subCategoriesList || [],
            availableAges: availableAges || [],
            availableColors: availableColors || [],
            availableWoodTypes: availableWoodTypes || [],
            seoTitle: seoTitle || '',
            seoDescription: seoDescription || ''
        });

        const populated = await category.populate(['parentCategory', 'attributes']);

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: populated,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all categories with pagination and search
// @route   GET /api/catalog/categories
// @access  Public
const getCategories = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', status, parentOnly } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build filter
        let filter = {};
        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }
        if (status !== undefined) {
            filter.isActive = status === 'true';
        }
        // If parentOnly=true, return only top-level categories (no parent)
        if (parentOnly === 'true') {
            filter.parentCategory = null;
        }

        const total = await Category.countDocuments(filter);
        const categories = await Category.find(filter)
            .populate('parentCategory', 'name slug')
            .populate('attributes', 'name type slug')
            .sort({ displayOrder: 1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Get product count for each category
        const categoriesWithCount = await Promise.all(
            categories.map(async (cat) => {
                const productCount = await require('../models/Product').countDocuments({ category: cat._id });
                return {
                    ...cat.toObject(),
                    productCount,
                };
            })
        );

        res.json({
            success: true,
            data: categoriesWithCount,
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

// @desc    Get single category by ID
// @route   GET /api/catalog/categories/:id
// @access  Public
const getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id)
            .populate('parentCategory', 'name slug')
            .populate('attributes', 'name type slug');

        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        const productCount = await require('../models/Product').countDocuments({ category: category._id });
        const subCategoryCount = await SubCategory.countDocuments({ category: category._id });

        res.json({
            success: true,
            data: {
                ...category.toObject(),
                productCount,
                subCategoryCount,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get attributes for a category (with their available values)
// @route   GET /api/catalog/categories/:id/attributes
// @access  Public
const getCategoryAttributes = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id)
            .populate('attributes', 'name slug type displayOrder');

        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        // For each attribute, fetch its available values
        const attributesWithValues = await Promise.all(
            category.attributes.map(async (attr) => {
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

// @desc    Update category
// @route   PUT /api/catalog/categories/:id
// @access  Private/Admin
const updateCategory = async (req, res) => {
    try {
        const { name, description, image, displayOrder, isActive, parentCategory, attributes, brand, subCategoriesList, availableAges, availableColors, availableWoodTypes, seoTitle, seoDescription } = req.body;

        let category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        // Validate parent category if provided (prevent self-reference)
        if (parentCategory !== undefined) {
            if (parentCategory && parentCategory.toString() === req.params.id) {
                return res.status(400).json({ message: 'Category cannot be its own parent' });
            }
            if (parentCategory) {
                const parent = await Category.findById(parentCategory);
                if (!parent) {
                    return res.status(400).json({ message: 'Parent category not found' });
                }
            }
            category.parentCategory = parentCategory || null;
        }

        // Validate and update attributes if provided
        if (attributes !== undefined) {
            if (attributes.length > 0) {
                const attributesExist = await Attribute.find({ _id: { $in: attributes } });
                if (attributesExist.length !== attributes.length) {
                    return res.status(400).json({ message: 'One or more attributes do not exist' });
                }
            }
            category.attributes = attributes;
        }

        // Update fields
        if (name) category.name = name;
        if (description !== undefined) category.description = description;
        if (image !== undefined) category.image = image;
        if (displayOrder !== undefined) category.displayOrder = displayOrder;
        if (isActive !== undefined) category.isActive = isActive;
        if (brand !== undefined) category.brand = brand;
        if (subCategoriesList !== undefined) category.subCategoriesList = subCategoriesList;
        if (availableAges !== undefined) category.availableAges = availableAges;
        if (availableColors !== undefined) category.availableColors = availableColors;
        if (availableWoodTypes !== undefined) category.availableWoodTypes = availableWoodTypes;
        if (seoTitle !== undefined) category.seoTitle = seoTitle;
        if (seoDescription !== undefined) category.seoDescription = seoDescription;

        category = await category.save();
        await category.populate(['parentCategory', 'attributes']);

        res.json({
            success: true,
            message: 'Category updated successfully',
            data: category,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete category
// @route   DELETE /api/catalog/categories/:id
// @access  Private/Admin
const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        // Check if category has products
        const productCount = await require('../models/Product').countDocuments({ category: category._id });
        if (productCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete category with ${productCount} products. Delete products first.`,
            });
        }

        // Check if category has subcategories
        const subCategoryCount = await SubCategory.countDocuments({ category: category._id });
        if (subCategoryCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete category with ${subCategoryCount} subcategories. Delete subcategories first.`,
            });
        }

        // Check if used as parent by another category
        const childCount = await Category.countDocuments({ parentCategory: category._id });
        if (childCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete category that is parent of ${childCount} other categories.`,
            });
        }

        await Category.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Category deleted successfully',
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Toggle category status
// @route   PATCH /api/catalog/categories/:id/toggle-status
// @access  Private/Admin
const toggleCategoryStatus = async (req, res) => {
    try {
        let category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ success: false, message: 'Category not found' });
        }

        category.isActive = !category.isActive;
        category = await category.save();

        res.json({
            success: true,
            message: `Category ${category.isActive ? 'activated' : 'deactivated'} successfully`,
            data: category,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Bulk create/update category with subcategories and attributes
// @route   POST /api/catalog/categories/bulk
// @access  Private/Admin
const bulkCreateCategory = async (req, res) => {
    try {
        const { brand, categoryId, newCategoryName, subCategories, attributes, description } = req.body;

        if (!categoryId && !newCategoryName) {
            return res.status(400).json({ message: 'Category ID or New Category Name is required' });
        }

        // 1. Resolve or Create Category
        let category;
        if (categoryId) {
            category = await Category.findById(categoryId);
            if (!category) return res.status(404).json({ message: 'Category not found' });
            
            // Update fields if provided
            if (brand) category.brand = brand;
            if (description) category.description = description;
        } else {
            const slug = newCategoryName.toLowerCase().replace(/\s+/g, '-');
            const existingCategory = await Category.findOne({ slug });
            if (existingCategory) {
                category = existingCategory;
                if (brand) category.brand = brand;
                if (description) category.description = description;
            } else {
                category = await Category.create({
                    name: newCategoryName,
                    slug,
                    brand: brand || 'General',
                    description,
                    isActive: true,
                    attributes: [], // Will populate below
                });
            }
        }

        // 2. Handle Sub Categories
        if (subCategories && typeof subCategories === 'string') {
            const subs = subCategories.split(',').map(s => s.trim()).filter(Boolean);
            for (const subName of subs) {
                const subSlug = subName.toLowerCase().replace(/\s+/g, '-');
                const existingSub = await SubCategory.findOne({ category: category._id, slug: subSlug });
                if (!existingSub) {
                    await SubCategory.create({
                        category: category._id,
                        name: subName,
                        slug: subSlug,
                        isActive: true
                    });
                }
            }
        }

        // 3. Handle Dynamic Attributes
        if (attributes && Array.isArray(attributes)) {
            for (const attr of attributes) {
                const { name, values } = attr;
                if (!name || !values) continue;
                
                const valArray = values.split(',').map(s => s.trim()).filter(Boolean);
                if (valArray.length === 0) continue;

                const attrSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                let attributeObj = await Attribute.findOne({ slug: attrSlug });
                
                if (!attributeObj) {
                    attributeObj = await Attribute.create({
                        name: name,
                        slug: attrSlug,
                        type: 'MultiSelect',
                        isActive: true
                    });
                }

                if (!category.attributes.includes(attributeObj._id)) {
                    category.attributes.push(attributeObj._id);
                }

                for (const val of valArray) {
                    const valSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                    const existingVal = await AttributeValue.findOne({ attribute: attributeObj._id, slug: valSlug });
                    if (!existingVal) {
                        await AttributeValue.create({
                            attribute: attributeObj._id,
                            value: val,
                            slug: valSlug,
                            isActive: true
                        });
                    }
                }
            }
        }

        await category.save();

        res.status(201).json({
            success: true,
            message: 'Bulk category creation successful',
            data: category,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get shop categories (main categories for homepage display)
// @route   GET /api/catalog/shop-categories
// @access  Public
const getShopCategories = async (req, res) => {
    try {
        // Fetch main categories with type 'Main' that are active and have no parent
        const categories = await Category.find({
            isActive: true,
            parentCategory: null,
            type: 'Main'
        })
            .sort({ displayOrder: 1 })
            .select('_id name slug image displayOrder description');

        // Format response to match frontend expectations
        const formattedCategories = categories.map(cat => ({
            _id: cat._id,
            title: cat.name,
            subtitle: cat.description || 'View All',
            image: cat.image || '/wood-placeholder.png',
            slug: cat.slug,
            displayOrder: cat.displayOrder
        }));

        res.json({
            success: true,
            data: formattedCategories,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createCategory,
    bulkCreateCategory,
    getCategories,
    getCategoryById,
    getCategoryAttributes,
    updateCategory,
    deleteCategory,
    toggleCategoryStatus,
    getShopCategories,
};
