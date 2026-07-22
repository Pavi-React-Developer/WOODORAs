const ProductFeeRule = require('../models/ProductFeeRule');

// @desc    Get all product fee rules
// @route   GET /api/product-fee-rules
// @access  Public
const getProductFeeRules = async (req, res) => {
  try {
    const rules = await ProductFeeRule.find().sort({ minVolume: 1 });
    res.json(rules);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create a product fee rule
// @route   POST /api/product-fee-rules
// @access  Private/Admin
const createProductFeeRule = async (req, res) => {
  try {
    const { minVolume, maxVolume, sizeName, fee, isActive } = req.body;

    const rule = new ProductFeeRule({
      minVolume,
      maxVolume,
      sizeName,
      fee,
      isActive
    });

    const createdRule = await rule.save();
    res.status(201).json(createdRule);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update a product fee rule
// @route   PUT /api/product-fee-rules/:id
// @access  Private/Admin
const updateProductFeeRule = async (req, res) => {
  try {
    const { minVolume, maxVolume, sizeName, fee, isActive } = req.body;

    const rule = await ProductFeeRule.findById(req.params.id);

    if (rule) {
      if (minVolume !== undefined) rule.minVolume = minVolume;
      if (maxVolume !== undefined) rule.maxVolume = maxVolume;
      if (sizeName !== undefined) rule.sizeName = sizeName;
      if (fee !== undefined) rule.fee = fee;
      if (isActive !== undefined) rule.isActive = isActive;

      const updatedRule = await rule.save();
      res.json(updatedRule);
    } else {
      res.status(404).json({ message: 'Product fee rule not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete a product fee rule
// @route   DELETE /api/product-fee-rules/:id
// @access  Private/Admin
const deleteProductFeeRule = async (req, res) => {
  try {
    const rule = await ProductFeeRule.findById(req.params.id);

    if (rule) {
      await rule.deleteOne();
      res.json({ message: 'Product fee rule removed' });
    } else {
      res.status(404).json({ message: 'Product fee rule not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getProductFeeRules,
  createProductFeeRule,
  updateProductFeeRule,
  deleteProductFeeRule
};
