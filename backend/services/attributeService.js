const Attribute = require('../models/Attribute');
const AttributeValue = require('../models/AttributeValue');
const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const CategoryAttributeMapping = require('../models/catalog/CategoryAttributeMapping');
const auditService = require('./auditService');

const INPUT_TYPE_ALIASES = {
    Textbox: 'Text',
    TextArea: 'Textarea',
    Radio: 'RadioButton',
    Multiselect: 'MultiSelect',
    MultiSelect: 'MultiSelect',
    Color: 'ColorPicker',
};

const normalizeType = (type) => INPUT_TYPE_ALIASES[type] || type;

const normalizeValueDocs = (attributeId, values = []) => values
    .map((val, idx) => {
        const value = typeof val === 'string' ? val : val.value;
        if (!value || !String(value).trim()) return null;

        return {
            attribute: attributeId,
            value: String(value).trim(),
            slug: String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
            colorCode: typeof val === 'string' ? undefined : val.colorCode || undefined,
            displayOrder: typeof val === 'string' ? idx + 1 : val.displayOrder || (idx + 1),
            isActive: typeof val === 'string' ? true : val.isActive !== undefined ? val.isActive : true,
        };
    })
    .filter(Boolean);

const validateCategorySubCategory = async (category, subCategory) => {
    if (!category || !subCategory) {
        throw new Error('Category and Sub Category are required for attributes');
    }

    const [categoryDoc, subCategoryDoc] = await Promise.all([
        Category.findOne({ _id: category, isDeleted: false }),
        SubCategory.findOne({ _id: subCategory, category, isDeleted: false }),
    ]);

    if (!categoryDoc) {
        throw new Error('Category not found');
    }
    if (!subCategoryDoc) {
        throw new Error('Sub Category not found for selected category');
    }
};

const attachValuesAndMapping = async (attributes) => {
    const ids = attributes.map(attr => attr._id);
    const [values, mappings] = await Promise.all([
        AttributeValue.find({ attribute: { $in: ids } }).sort({ displayOrder: 1 }),
        CategoryAttributeMapping.find({ attribute: { $in: ids } }),
    ]);

    const valuesByAttribute = values.reduce((acc, value) => {
        const key = value.attribute.toString();
        acc[key] = acc[key] || [];
        acc[key].push(value.toObject());
        return acc;
    }, {});

    const mappingByAttribute = mappings.reduce((acc, mapping) => {
        acc[mapping.attribute.toString()] = mapping.toObject();
        return acc;
    }, {});

    return attributes.map(attr => {
        const plain = attr.toObject();
        const mapping = mappingByAttribute[attr._id.toString()];
        return {
            ...plain,
            mapping,
            values: valuesByAttribute[attr._id.toString()] || [],
        };
    });
};

/**
 * Get all attributes with pagination/filtering
 */
const getAttributes = async (query = {}) => {
    const { 
        search, 
        category,
        subCategory,
        isActive, 
        isArchived, 
        page = 1, 
        limit = 10, 
        sortBy = 'displayOrder', 
        sortOrder = 'asc' 
    } = query;

    const filter = { isDeleted: false };

    if (category) filter.category = category;
    if (subCategory) filter.subCategory = subCategory;

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
            { code: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
        ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const attributes = await Attribute.find(filter)
        .populate('category', 'name slug')
        .populate('subCategory', 'name slug category')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit));

    const total = await Attribute.countDocuments(filter);
    const result = await attachValuesAndMapping(attributes);

    return {
        attributes: result,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / limit),
        },
    };
};

/**
 * Get single attribute with its values
 */
const getAttributeById = async (id) => {
    const attribute = await Attribute.findOne({ _id: id, isDeleted: false })
        .populate('category', 'name slug')
        .populate('subCategory', 'name slug category');
    if (!attribute) {
        throw new Error('Attribute not found');
    }

    const [result] = await attachValuesAndMapping([attribute]);
    return result;
};

/**
 * Create attribute
 * If an attribute with the same name/slug already exists for this sub-category,
 * reuse it and upsert the CategoryAttributeMapping — no duplicate error thrown.
 * This allows shared attributes (colour, age, wood, etc.) across all sub-categories.
 */
const createAttribute = async (data, auditContext) => {
    const { 
        name, slug, code, type, description, displayOrder, isActive, category, subCategory,
        isRequired, isSearchable, isFilterable, isComparable, isVariant,
        visibleOnProduct, visibleOnWebsite, values 
    } = data;

    await validateCategorySubCategory(category, subCategory);

    const generatedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const generatedCode = code || name.toUpperCase().replace(/[^A-Z0-9]+/g, '_');

    // Check if this attribute already exists for this sub-category — reuse it if so
    let attribute = await Attribute.findOne({ category, subCategory, slug: generatedSlug, isDeleted: false });
    if (!attribute) {
        attribute = await Attribute.findOne({ category, subCategory, code: generatedCode, isDeleted: false });
    }

    let createdValues = [];

    if (attribute) {
        // Attribute already exists — append any new values provided
        if (values && Array.isArray(values) && values.length > 0) {
            const existingValues = await AttributeValue.find({ attribute: attribute._id });
            const existingSet = new Set(existingValues.map(v => v.value.toLowerCase()));
            const newValDocs = normalizeValueDocs(attribute._id, values).filter(
                v => !existingSet.has(v.value.toLowerCase())
            );
            if (newValDocs.length > 0) {
                createdValues = await AttributeValue.insertMany(newValDocs);
            }
        }
    } else {
        // Create a brand new attribute
        try {
            attribute = await Attribute.create({
                name,
                slug: generatedSlug,
                code: generatedCode,
                category,
                subCategory,
                type: normalizeType(type),
                description,
                displayOrder: displayOrder || 1,
                isActive: isActive !== undefined ? isActive : true,
                isRequired: isRequired !== undefined ? isRequired : false,
                isSearchable: isSearchable !== undefined ? isSearchable : false,
                isFilterable: isFilterable !== undefined ? isFilterable : false,
                isComparable: isComparable !== undefined ? isComparable : false,
                isVariant: isVariant !== undefined ? isVariant : false,
                visibleOnProduct: visibleOnProduct !== undefined ? visibleOnProduct : true,
                visibleOnWebsite: visibleOnWebsite !== undefined ? visibleOnWebsite : true,
                createdBy: auditContext.userId,
            });
        } catch (err) {
            if (err.code === 11000) {
                throw new Error('Attribute already exists');
            }
            throw err;
        }

        // Create values if provided
        if (values && Array.isArray(values) && values.length > 0) {
            const valDocs = normalizeValueDocs(attribute._id, values);
            createdValues = await AttributeValue.insertMany(valDocs);
        }
    }

    // Upsert CategoryAttributeMapping — safe even if mapping already exists
    await CategoryAttributeMapping.findOneAndUpdate(
        { category, subCategory, attribute: attribute._id },
        {
            category,
            subCategory,
            attribute: attribute._id,
            isRequired: isRequired !== undefined ? isRequired : false,
            displayOrder: displayOrder || 1,
            isActive: isActive !== undefined ? isActive : true,
        },
        { upsert: true, returnDocument: 'after' }
    );

    const fullAttr = {
        ...attribute.toObject(),
        values: createdValues.map(v => v.toObject()),
    };

    await auditService.logAction(auditContext, {
        entityType: 'Attribute',
        entityId: attribute._id,
        action: 'CREATE',
        after: fullAttr,
    });

    return fullAttr;
};

/**
 * Update attribute and its values
 */
const updateAttribute = async (id, data, auditContext) => {
    const attribute = await Attribute.findOne({ _id: id, isDeleted: false });
    if (!attribute) {
        throw new Error('Attribute not found');
    }

    const beforeState = await getAttributeById(id);

    const fields = [
        'name', 'slug', 'code', 'type', 'description', 'displayOrder', 'category', 'subCategory',
        'isActive', 'isArchived', 'isRequired', 'isSearchable',
        'isFilterable', 'isComparable', 'isVariant', 'visibleOnProduct', 'visibleOnWebsite'
    ];

    const nextCategory = data.category || attribute.category;
    const nextSubCategory = data.subCategory || attribute.subCategory;
    await validateCategorySubCategory(nextCategory, nextSubCategory);

    fields.forEach(field => {
        if (data[field] !== undefined) {
            attribute[field] = field === 'type' ? normalizeType(data[field]) : data[field];
        }
    });

    attribute.updatedBy = auditContext.userId;
    await attribute.save();

    // Re-sync values if provided in request
    if (data.values && Array.isArray(data.values)) {
        await AttributeValue.deleteMany({ attribute: id });
        const valDocs = normalizeValueDocs(id, data.values);
        if (valDocs.length > 0) {
            await AttributeValue.insertMany(valDocs);
        }
    }

    await CategoryAttributeMapping.findOneAndUpdate(
        { attribute: id },
        {
            $set: {
                category: attribute.category,
                subCategory: attribute.subCategory,
                isRequired: attribute.isRequired,
                displayOrder: attribute.displayOrder,
                isActive: attribute.isActive,
            },
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    const afterState = await getAttributeById(id);

    await auditService.logAction(auditContext, {
        entityType: 'Attribute',
        entityId: id,
        action: 'UPDATE',
        before: beforeState,
        after: afterState,
    });

    return afterState;
};

/**
 * Soft delete attribute
 */
const deleteAttribute = async (id, auditContext) => {
    const attribute = await Attribute.findOne({ _id: id, isDeleted: false });
    if (!attribute) {
        throw new Error('Attribute not found');
    }

    const beforeState = await getAttributeById(id);

    attribute.isDeleted = true;
    attribute.deletedAt = new Date();
    attribute.updatedBy = auditContext.userId;
    await attribute.save();

    // Clean up mapping and values (or leave them for soft-delete archive, but marked inactive)
    await CategoryAttributeMapping.deleteMany({ attribute: id });
    await AttributeValue.updateMany({ attribute: id }, { $set: { isActive: false } });

    await auditService.logAction(auditContext, {
        entityType: 'Attribute',
        entityId: id,
        action: 'DELETE',
        before: beforeState,
        after: { ...beforeState, isDeleted: true, deletedAt: new Date() },
    });

    return attribute;
};

module.exports = {
    getAttributes,
    getAttributeById,
    createAttribute,
    updateAttribute,
    deleteAttribute,
};
