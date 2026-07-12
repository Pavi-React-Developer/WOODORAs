const SubCategory = require('../models/SubCategory');
const Category = require('../models/Category');
const AttributeValue = require('../models/AttributeValue');
const CategoryAttributeMapping = require('../models/catalog/CategoryAttributeMapping');
const auditService = require('./auditService');

/**
 * Get all subcategories with filters, pagination
 */
const getSubCategories = async (query = {}) => {
    const { 
        search, 
        category, 
        isActive, 
        isArchived, 
        page = 1, 
        limit = 10, 
        sortBy = 'displayOrder', 
        sortOrder = 'asc' 
    } = query;

    const filter = { isDeleted: false };

    if (category) {
        filter.category = category;
    }
    if (isActive !== undefined && isActive !== '') {
        filter.isActive = isActive === 'true';
    }
    if (isArchived !== undefined && isArchived !== '') {
        filter.isArchived = isArchived === 'true';
    } else {
        filter.isArchived = false;
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

    const subCategories = await SubCategory.find(filter)
        .populate('category', 'name slug')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit));

    const total = await SubCategory.countDocuments(filter);

    return {
        subCategories,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / limit),
        },
    };
};

/**
 * Get single subcategory
 */
const getSubCategoryById = async (id) => {
    const subCategory = await SubCategory.findOne({ _id: id, isDeleted: false })
        .populate('category', 'name slug');
    if (!subCategory) {
        throw new Error('SubCategory not found');
    }
    return subCategory;
};

/**
 * Create subcategory
 */
const createSubCategory = async (data, auditContext) => {
    const { name, description, slug, category, seoTitle, seoDescription, seoKeywords, banner, displayOrder, isActive } = data;

    // Validate category exists
    const parentCategory = await Category.findOne({ _id: category, isDeleted: false });
    if (!parentCategory) {
        throw new Error('Parent category not found');
    }

    const generatedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const existing = await SubCategory.findOne({ category, slug: generatedSlug, isDeleted: false });
    if (existing) {
        throw new Error('SubCategory with this slug already exists in this category');
    }

    const subCategory = await SubCategory.create({
        name,
        description,
        slug: generatedSlug,
        category,
        seoTitle,
        seoDescription,
        seoKeywords: seoKeywords || [],
        banner,
        displayOrder: displayOrder || 1,
        isActive: isActive !== undefined ? isActive : true,
        createdBy: auditContext.userId,
    });

    await auditService.logAction(auditContext, {
        entityType: 'SubCategory',
        entityId: subCategory._id,
        action: 'CREATE',
        after: subCategory.toObject(),
    });

    return subCategory;
};

/**
 * Update subcategory
 */
const updateSubCategory = async (id, data, auditContext) => {
    const subCategory = await SubCategory.findOne({ _id: id, isDeleted: false });
    if (!subCategory) {
        throw new Error('SubCategory not found');
    }

    const beforeState = subCategory.toObject();

    if (data.category && data.category !== subCategory.category.toString()) {
        const parentCategory = await Category.findOne({ _id: data.category, isDeleted: false });
        if (!parentCategory) {
            throw new Error('New parent category not found');
        }
        subCategory.category = data.category;
    }

    const fields = [
        'name', 'description', 'slug', 'seoTitle', 
        'seoDescription', 'seoKeywords', 'banner', 
        'displayOrder', 'isActive', 'isArchived'
    ];

    fields.forEach(field => {
        if (data[field] !== undefined) {
            subCategory[field] = data[field];
        }
    });

    subCategory.updatedBy = auditContext.userId;
    await subCategory.save();

    await auditService.logAction(auditContext, {
        entityType: 'SubCategory',
        entityId: subCategory._id,
        action: 'UPDATE',
        before: beforeState,
        after: subCategory.toObject(),
    });

    return subCategory;
};

/**
 * Soft delete subcategory
 */
const deleteSubCategory = async (id, auditContext) => {
    const subCategory = await SubCategory.findOne({ _id: id, isDeleted: false });
    if (!subCategory) {
        throw new Error('SubCategory not found');
    }

    const beforeState = subCategory.toObject();
    await SubCategory.deleteOne({ _id: id });

    await auditService.logAction(auditContext, {
        entityType: 'SubCategory',
        entityId: subCategory._id,
        action: 'DELETE',
        before: beforeState,
        after: null,
    });

    return subCategory;
};

/**
 * Bulk actions
 */
const bulkUpdateStatus = async (ids, isActive, auditContext) => {
    const subsBefore = await SubCategory.find({ _id: { $in: ids }, isDeleted: false });

    await SubCategory.updateMany(
        { _id: { $in: ids }, isDeleted: false },
        { $set: { isActive, updatedBy: auditContext.userId } }
    );

    const subsAfter = await SubCategory.find({ _id: { $in: ids }, isDeleted: false });

    for (const sub of subsAfter) {
        const before = subsBefore.find(s => s._id.toString() === sub._id.toString());
        await auditService.logAction(auditContext, {
            entityType: 'SubCategory',
            entityId: sub._id,
            action: 'STATUS_CHANGE',
            before: before ? before.toObject() : null,
            after: sub.toObject(),
        });
    }

    return { updatedCount: subsAfter.length };
};

const bulkDelete = async (ids, auditContext) => {
    const subsBefore = await SubCategory.find({ _id: { $in: ids }, isDeleted: false });

    await SubCategory.deleteMany({ _id: { $in: ids }, isDeleted: false });

    for (const sub of subsBefore) {
        await auditService.logAction(auditContext, {
            entityType: 'SubCategory',
            entityId: sub._id,
            action: 'DELETE',
            before: sub.toObject(),
            after: null,
        });
    }

    return { deletedCount: subsBefore.length };
};

/**
 * Attribute Mapping Methods
 */
const mapAttributes = async (subCategoryId, mappings, auditContext) => {
    // mappings: [{ attributeId, isRequired, displayOrder, isActive }]
    
    // Validate subcategory
    const subCategory = await SubCategory.findOne({ _id: subCategoryId, isDeleted: false });
    if (!subCategory) {
        throw new Error('SubCategory not found');
    }

    const beforeState = await CategoryAttributeMapping.find({ subCategory: subCategoryId });

    // Clear existing mappings
    await CategoryAttributeMapping.deleteMany({ subCategory: subCategoryId });

    // Insert new mappings
    const docs = mappings.map(m => ({
        category: subCategory.category,
        subCategory: subCategoryId,
        attribute: m.attributeId || m.attribute,
        isRequired: m.isRequired || false,
        displayOrder: m.displayOrder || 1,
        isActive: m.isActive !== undefined ? m.isActive : true,
    }));

    const result = await CategoryAttributeMapping.insertMany(docs);

    // Fetch new populated mappings
    const populated = await CategoryAttributeMapping.find({ subCategory: subCategoryId })
        .populate('attribute');

    await auditService.logAction(auditContext, {
        entityType: 'CategoryAttributeMapping',
        entityId: subCategoryId, // group by subcategory ID
        action: 'UPDATE',
        before: beforeState.map(m => m.toObject()),
        after: populated.map(m => m.toObject()),
        metadata: { message: 'Re-mapped subcategory attributes' },
    });

    return populated;
};

const getMappedAttributes = async (subCategoryId) => {
    const mappings = await CategoryAttributeMapping.find({ subCategory: subCategoryId, isActive: true })
        .populate('attribute')
        .sort({ displayOrder: 1 });

    const attributeIds = mappings
        .map(mapping => mapping.attribute?._id)
        .filter(Boolean);

    const values = await AttributeValue.find({
        attribute: { $in: attributeIds },
        isActive: true,
    }).sort({ displayOrder: 1 });

    const valuesByAttribute = values.reduce((acc, value) => {
        const key = value.attribute.toString();
        acc[key] = acc[key] || [];
        acc[key].push(value.toObject());
        return acc;
    }, {});

    return mappings.map(mapping => {
        const plain = mapping.toObject();
        if (plain.attribute) {
            plain.attribute.values = valuesByAttribute[plain.attribute._id.toString()] || [];
        }
        return plain;
    });
};

module.exports = {
    getSubCategories,
    getSubCategoryById,
    createSubCategory,
    updateSubCategory,
    deleteSubCategory,
    bulkUpdateStatus,
    bulkDelete,
    mapAttributes,
    getMappedAttributes,
};
