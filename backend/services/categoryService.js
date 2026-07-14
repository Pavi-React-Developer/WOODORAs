const Category = require('../models/Category');
const auditService = require('./auditService');

/**
 * Get all categories with filtering, pagination, and sorting
 */
const getCategories = async (query = {}) => {
    const { 
        search, 
        isActive, 
        isArchived, 
        page = 1, 
        limit = 10, 
        sortBy = 'displayOrder', 
        sortOrder = 'asc' 
    } = query;

    const filter = { isDeleted: false };

    if (isActive !== undefined && isActive !== '') {
        filter.isActive = isActive === 'true';
    }
    if (isArchived !== undefined && isArchived !== '') {
        filter.isArchived = isArchived === 'true';
    } else {
        filter.isArchived = false; // default to show active, unarchived
    }

    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
        ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const categories = await Category.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(Number(limit));

    const total = await Category.countDocuments(filter);

    return {
        categories,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / limit),
        },
    };
};

/**
 * Get single category by ID
 */
const getCategoryById = async (id) => {
    const category = await Category.findOne({ _id: id, isDeleted: false });
    if (!category) {
        throw new Error('Category not found');
    }
    return category;
};

/**
 * Create new category
 */
const createCategory = async (data, auditContext) => {
    const { name, description, slug, availableWoodTypes, seoTitle, seoDescription, seoKeywords, banner, icon, image, displayOrder, isActive } = data;

    const generatedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    // Check slug uniqueness
    const existing = await Category.findOne({ slug: generatedSlug, isDeleted: false });
    if (existing) {
        throw new Error('Category with this slug/name already exists');
    }

    const category = await Category.create({
        name,
        description,
        slug: generatedSlug,
        availableWoodTypes: availableWoodTypes || [],
        seoTitle,
        seoDescription,
        seoKeywords: seoKeywords || [],
        banner,
        icon,
        image,
        displayOrder: displayOrder || 1,
        isActive: isActive !== undefined ? isActive : true,
        createdBy: auditContext.userId,
    });

    await auditService.logAction(auditContext, {
        entityType: 'Category',
        entityId: category._id,
        action: 'CREATE',
        after: category.toObject(),
    });

    return category;
};

/**
 * Update category
 */
const updateCategory = async (id, data, auditContext) => {
    const category = await Category.findOne({ _id: id, isDeleted: false });
    if (!category) {
        throw new Error('Category not found');
    }

    const beforeState = category.toObject();

    // Fields to update
    const fields = [
        'name', 'description', 'slug', 'availableWoodTypes',
        'seoTitle', 'seoDescription', 'seoKeywords', 'banner',
        'icon', 'image', 'displayOrder', 'isActive', 'isArchived'
    ];

    fields.forEach(field => {
        if (data[field] !== undefined) {
            category[field] = data[field];
        }
    });

    category.updatedBy = auditContext.userId;
    await category.save();

    await auditService.logAction(auditContext, {
        entityType: 'Category',
        entityId: category._id,
        action: 'UPDATE',
        before: beforeState,
        after: category.toObject(),
    });

    return category;
};

/**
 * Soft delete category
 */
const deleteCategory = async (id, auditContext) => {
    const category = await Category.findOne({ _id: id, isDeleted: false });
    if (!category) {
        throw new Error('Category not found');
    }

    const beforeState = category.toObject();
    await Category.deleteOne({ _id: id });

    await auditService.logAction(auditContext, {
        entityType: 'Category',
        entityId: category._id,
        action: 'DELETE',
        before: beforeState,
        after: null,
    });

    return category;
};

/**
 * Restore a soft-deleted category
 */
const restoreCategory = async (id, auditContext) => {
    const category = await Category.findOne({ _id: id, isDeleted: true });
    if (!category) {
        throw new Error('Category not found or not deleted');
    }

    const beforeState = category.toObject();

    category.isDeleted = false;
    category.deletedAt = undefined;
    category.updatedBy = auditContext.userId;
    await category.save();

    await auditService.logAction(auditContext, {
        entityType: 'Category',
        entityId: category._id,
        action: 'RESTORE',
        before: beforeState,
        after: category.toObject(),
    });

    return category;
};

/**
 * Bulk updates
 */
const bulkUpdateStatus = async (ids, isActive, auditContext) => {
    const categoriesBefore = await Category.find({ _id: { $in: ids }, isDeleted: false });
    
    await Category.updateMany(
        { _id: { $in: ids }, isDeleted: false },
        { $set: { isActive, updatedBy: auditContext.userId } }
    );

    const categoriesAfter = await Category.find({ _id: { $in: ids }, isDeleted: false });

    // Log individually or as bulk change in audit log
    for (const cat of categoriesAfter) {
        const before = categoriesBefore.find(c => c._id.toString() === cat._id.toString());
        await auditService.logAction(auditContext, {
            entityType: 'Category',
            entityId: cat._id,
            action: 'STATUS_CHANGE',
            before: before ? before.toObject() : null,
            after: cat.toObject(),
        });
    }

    return { updatedCount: categoriesAfter.length };
};

/**
 * Bulk delete
 */
const bulkDelete = async (ids, auditContext) => {
    const categoriesBefore = await Category.find({ _id: { $in: ids }, isDeleted: false });

    await Category.deleteMany({ _id: { $in: ids }, isDeleted: false });

    for (const cat of categoriesBefore) {
        await auditService.logAction(auditContext, {
            entityType: 'Category',
            entityId: cat._id,
            action: 'DELETE',
            before: cat.toObject(),
            after: null,
        });
    }

    return { deletedCount: categoriesBefore.length };
};

module.exports = {
    getCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
    restoreCategory,
    bulkUpdateStatus,
    bulkDelete,
};
