const BulkOrderField = require('../models/BulkOrderField');

// @desc    Get all bulk order fields
// @route   GET /api/bulk-orders/fields
// @access  Public
exports.getAllFields = async (req, res) => {
  try {
    const fields = await BulkOrderField.find().sort({ createdAt: 1 });
    res.status(200).json({
      success: true,
      data: fields
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bulk order fields',
      error: error.message
    });
  }
};

// @desc    Create a bulk order field
// @route   POST /api/bulk-orders/fields
// @access  Private/Admin
exports.createField = async (req, res) => {
  try {
    const { label, type, options, isRequired, isActive, placeholder } = req.body;
    
    if (!label || !type) {
      return res.status(400).json({
        success: false,
        message: 'Label and type are required'
      });
    }

    const field = await BulkOrderField.create({
      label,
      type,
      options: type === 'dropdown' ? options : [],
      isRequired: isRequired !== undefined ? isRequired : true,
      isActive: isActive !== undefined ? isActive : true,
      placeholder: placeholder || ''
    });

    res.status(201).json({
      success: true,
      data: field
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create bulk order field',
      error: error.message
    });
  }
};

// @desc    Update a bulk order field
// @route   PUT /api/bulk-orders/fields/:id
// @access  Private/Admin
exports.updateField = async (req, res) => {
  try {
    const { label, type, options, isRequired, isActive, placeholder } = req.body;

    let field = await BulkOrderField.findById(req.params.id);
    if (!field) {
      return res.status(404).json({
        success: false,
        message: 'Field not found'
      });
    }

    field.label = label || field.label;
    field.type = type || field.type;
    if (field.type === 'dropdown') {
      field.options = options || field.options;
    } else {
      field.options = [];
    }
    if (isRequired !== undefined) field.isRequired = isRequired;
    if (isActive !== undefined) field.isActive = isActive;
    if (placeholder !== undefined) field.placeholder = placeholder;

    await field.save();

    res.status(200).json({
      success: true,
      data: field
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update bulk order field',
      error: error.message
    });
  }
};

// @desc    Delete a bulk order field
// @route   DELETE /api/bulk-orders/fields/:id
// @access  Private/Admin
exports.deleteField = async (req, res) => {
  try {
    const field = await BulkOrderField.findById(req.params.id);
    if (!field) {
      return res.status(404).json({
        success: false,
        message: 'Field not found'
      });
    }

    await field.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete bulk order field',
      error: error.message
    });
  }
};
