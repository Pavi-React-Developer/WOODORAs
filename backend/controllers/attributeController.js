
const Attribute = require('../models/Attribute');
const AttributeValue = require('../models/AttributeValue');

// ==========================================
// ATTRIBUTE CONTROLLERS
// ==========================================

// @desc    Create a new attribute
// @route   POST /api/catalog/attributes
// @access  Private/Admin
const createAttribute = async (req, res) => {
    try {
        const { name, slug, type, description, displayOrder, isVariant } = req.body;

        // Validate input
        if (!name || !type) {
            return res.status(400).json({ message: 'Attribute name and type are required' });
        }

        // Validate attribute type
        const validTypes = ['Text', 'Dropdown', 'MultiSelect', 'Checkbox', 'RadioButton', 'Number', 'ColorPicker', 'Date'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ message: 'Invalid attribute type' });
        }

        // Check if attribute already exists
        const existingAttribute = await Attribute.findOne({ 
            slug: slug || name.toLowerCase().replace(/\s+/g, '-') 
        });
        if (existingAttribute) {
            return res.status(400).json({ message: 'Attribute already exists' });
        }

        const attribute = await Attribute.create({
            name,
            slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
            type,
            description,
            displayOrder: displayOrder || 1,
            isVariant: isVariant || false,
            isActive: true,
        });

        res.status(201).json({
            success: true,
            message: 'Attribute created successfully',
            data: attribute,
        });
    } catch (error) {
        if (error.code === 11000) {
            const duplicateField = error.keyValue ? Object.keys(error.keyValue).join(', ') : 'attribute';
            return res.status(400).json({ success: false, message: `Attribute already exists with duplicate ${duplicateField}` });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all attributes with pagination and search
// @route   GET /api/catalog/attributes
// @access  Public
const getAttributes = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', type, status } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Build filter
        let filter = {};
        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }
        if (type) {
            filter.type = type;
        }
        if (status !== undefined) {
            filter.isActive = status === 'true';
        }

        const total = await Attribute.countDocuments(filter);
        const attributes = await Attribute.find(filter)
            .sort({ displayOrder: 1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Get values count for each attribute
        const attributesWithValues = await Promise.all(
            attributes.map(async (attr) => {
                const valuesCount = await AttributeValue.countDocuments({ attribute: attr._id });
                return {
                    ...attr.toObject(),
                    valuesCount,
                };
            })
        );

        res.json({
            success: true,
            data: attributesWithValues,
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

// @desc    Get single attribute by ID with its values
// @route   GET /api/catalog/attributes/:id
// @access  Public
const getAttributeById = async (req, res) => {
    try {
        const attribute = await Attribute.findById(req.params.id);
        if (!attribute) {
            return res.status(404).json({ success: false, message: 'Attribute not found' });
        }

        const values = await AttributeValue.find({ attribute: attribute._id })
            .sort({ displayOrder: 1 });

        const valuesCount = await AttributeValue.countDocuments({ attribute: attribute._id });

        res.json({
            success: true,
            data: {
                ...attribute.toObject(),
                values,
                valuesCount,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update attribute
// @route   PUT /api/catalog/attributes/:id
// @access  Private/Admin
const updateAttribute = async (req, res) => {
    try {
        const { name, type, description, displayOrder, isActive, isVariant } = req.body;

        let attribute = await Attribute.findById(req.params.id);
        if (!attribute) {
            return res.status(404).json({ success: false, message: 'Attribute not found' });
        }

        // Validate type if provided
        if (type) {
            const validTypes = ['Text', 'Dropdown', 'MultiSelect', 'Checkbox', 'RadioButton', 'Number', 'ColorPicker', 'Date'];
            if (!validTypes.includes(type)) {
                return res.status(400).json({ message: 'Invalid attribute type' });
            }
            attribute.type = type;
        }

        // Update fields
        if (name) attribute.name = name;
        if (description) attribute.description = description;
        if (displayOrder !== undefined) attribute.displayOrder = displayOrder;
        if (isActive !== undefined) attribute.isActive = isActive;
        if (isVariant !== undefined) attribute.isVariant = isVariant;

        attribute = await attribute.save();

        res.json({
            success: true,
            message: 'Attribute updated successfully',
            data: attribute,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete attribute
// @route   DELETE /api/catalog/attributes/:id
// @access  Private/Admin
const deleteAttribute = async (req, res) => {
    try {
        const attribute = await Attribute.findById(req.params.id);
        if (!attribute) {
            return res.status(404).json({ success: false, message: 'Attribute not found' });
        }

        // Check if attribute has values
        const valuesCount = await AttributeValue.countDocuments({ attribute: attribute._id });
        if (valuesCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete attribute with ${valuesCount} values. Delete values first.`,
            });
        }

        // Check if attribute is mapped to any subcategory
        const SubCategory = require('../models/SubCategory');
        const subCatCount = await SubCategory.countDocuments({ attributes: attribute._id });
        if (subCatCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete attribute mapped to ${subCatCount} subcategories. Remove mapping first.`,
            });
        }

        await Attribute.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Attribute deleted successfully',
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Toggle attribute status
// @route   PATCH /api/catalog/attributes/:id/toggle-status
// @access  Private/Admin
const toggleAttributeStatus = async (req, res) => {
    try {
        let attribute = await Attribute.findById(req.params.id);
        if (!attribute) {
            return res.status(404).json({ success: false, message: 'Attribute not found' });
        }

        attribute.isActive = !attribute.isActive;
        attribute = await attribute.save();

        res.json({
            success: true,
            message: `Attribute ${attribute.isActive ? 'activated' : 'deactivated'} successfully`,
            data: attribute,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==========================================
// ATTRIBUTE VALUE CONTROLLERS
// ==========================================

// @desc    Create attribute value
// @route   POST /api/catalog/attributes/:id/values
// @access  Private/Admin
const createAttributeValue = async (req, res) => {
    try {
        const attributeId = req.params.id;
        const { value, slug, colorCode, displayOrder } = req.body;

        // Check if attribute exists
        const attribute = await Attribute.findById(attributeId);
        if (!attribute) {
            return res.status(404).json({ message: 'Attribute not found' });
        }

        // Validate input
        if (!value) {
            return res.status(400).json({ message: 'Attribute value is required' });
        }

        // Check if value already exists for this attribute
        const existingValue = await AttributeValue.findOne({
            attribute: attributeId,
            value: value.trim(),
        });
        if (existingValue) {
            return res.status(400).json({ message: 'This value already exists for this attribute' });
        }

        const attributeValue = await AttributeValue.create({
            attribute: attributeId,
            value: value.trim(),
            slug: slug || value.toLowerCase().replace(/\s+/g, '-'),
            colorCode: attribute.type === 'ColorPicker' ? colorCode : undefined,
            displayOrder: displayOrder || 1,
            isActive: true,
        });

        res.status(201).json({
            success: true,
            message: 'Attribute value created successfully',
            data: attributeValue,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all attribute values for an attribute
// @route   GET /api/catalog/attributes/:id/values
// @access  Public
const getAttributeValues = async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Check if attribute exists
        const attribute = await Attribute.findById(req.params.id);
        if (!attribute) {
            return res.status(404).json({ success: false, message: 'Attribute not found' });
        }

        // Build filter
        let filter = { attribute: req.params.id };
        if (search) {
            filter.value = { $regex: search, $options: 'i' };
        }

        const total = await AttributeValue.countDocuments(filter);
        const values = await AttributeValue.find(filter)
            .sort({ displayOrder: 1 })
            .skip(skip)
            .limit(parseInt(limit));

        res.json({
            success: true,
            data: values,
            attribute: {
                id: attribute._id,
                name: attribute.name,
                type: attribute.type,
            },
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

// @desc    Update attribute value
// @route   PUT /api/catalog/attribute-values/:id
// @access  Private/Admin
const updateAttributeValue = async (req, res) => {
    try {
        const { value, colorCode, displayOrder, isActive } = req.body;

        let attributeValue = await AttributeValue.findById(req.params.id);
        if (!attributeValue) {
            return res.status(404).json({ success: false, message: 'Attribute value not found' });
        }

        // Update fields
        if (value) attributeValue.value = value.trim();
        if (colorCode) attributeValue.colorCode = colorCode;
        if (displayOrder !== undefined) attributeValue.displayOrder = displayOrder;
        if (isActive !== undefined) attributeValue.isActive = isActive;

        attributeValue = await attributeValue.save();

        res.json({
            success: true,
            message: 'Attribute value updated successfully',
            data: attributeValue,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete attribute value
// @route   DELETE /api/catalog/attribute-values/:id
// @access  Private/Admin
const deleteAttributeValue = async (req, res) => {
    try {
        const attributeValue = await AttributeValue.findById(req.params.id);
        if (!attributeValue) {
            return res.status(404).json({ success: false, message: 'Attribute value not found' });
        }

        // Check if value is used in any product
        const ProductAttributeValue = require('../models/ProductAttributeValue');
        const usageCount = await ProductAttributeValue.countDocuments({
            $or: [
                { value: attributeValue.value },
                { values: attributeValue.value },
            ],
        });

        if (usageCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete this value as it's used in ${usageCount} products`,
            });
        }

        await AttributeValue.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Attribute value deleted successfully',
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Toggle attribute value status
// @route   PATCH /api/catalog/attribute-values/:id/toggle-status
// @access  Private/Admin
const toggleAttributeValueStatus = async (req, res) => {
    try {
        let attributeValue = await AttributeValue.findById(req.params.id);
        if (!attributeValue) {
            return res.status(404).json({ success: false, message: 'Attribute value not found' });
        }

        attributeValue.isActive = !attributeValue.isActive;
        attributeValue = await attributeValue.save();

        res.json({
            success: true,
            message: `Attribute value ${attributeValue.isActive ? 'activated' : 'deactivated'} successfully`,
            data: attributeValue,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    // Attributes
    createAttribute,
    getAttributes,
    getAttributeById,
    updateAttribute,
    deleteAttribute,
    toggleAttributeStatus,
    // Attribute Values
    createAttributeValue,
    getAttributeValues,
    updateAttributeValue,
    deleteAttributeValue,
    toggleAttributeValueStatus,
};
