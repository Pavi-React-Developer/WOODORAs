const ProductFeeRule = require('../models/ProductFeeRule');

exports.getRules = async (req, res) => {
  try {
    const rules = await ProductFeeRule.find().sort({ minVolume: 1 });
    res.json(rules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createRule = async (req, res) => {
  try {
    const { minVolume, maxVolume, boxSize, productFee, isActive } = req.body;

    // Validate ranges
    if (minVolume > maxVolume) {
      return res.status(400).json({ message: 'Min Volume cannot be greater than Max Volume' });
    }

    // Check for overlap among active rules
    if (isActive !== false) {
      const overlapping = await ProductFeeRule.findOne({
        isActive: true,
        $or: [
          { minVolume: { $lte: maxVolume }, maxVolume: { $gte: minVolume } }
        ]
      });

      if (overlapping) {
        return res.status(400).json({ 
          message: `Volume range overlaps with an existing rule (${overlapping.minVolume} - ${overlapping.maxVolume})` 
        });
      }
    }

    const newRule = await ProductFeeRule.create(req.body);
    res.status(201).json(newRule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateRule = async (req, res) => {
  try {
    const { minVolume, maxVolume, isActive } = req.body;
    const ruleId = req.params.id;

    // We need to fetch the existing rule to know its defaults if not provided in req.body
    const existingRule = await ProductFeeRule.findById(ruleId);
    if (!existingRule) {
      return res.status(404).json({ message: 'Product Fee Rule not found' });
    }

    const checkMin = minVolume !== undefined ? minVolume : existingRule.minVolume;
    const checkMax = maxVolume !== undefined ? maxVolume : existingRule.maxVolume;
    const checkActive = isActive !== undefined ? isActive : existingRule.isActive;

    if (checkMin > checkMax) {
      return res.status(400).json({ message: 'Min Volume cannot be greater than Max Volume' });
    }

    if (checkActive !== false) {
      const overlapping = await ProductFeeRule.findOne({
        _id: { $ne: ruleId },
        isActive: true,
        $or: [
          { minVolume: { $lte: checkMax }, maxVolume: { $gte: checkMin } }
        ]
      });

      if (overlapping) {
        return res.status(400).json({ 
          message: `Volume range overlaps with an existing rule (${overlapping.minVolume} - ${overlapping.maxVolume})` 
        });
      }
    }

    const updatedRule = await ProductFeeRule.findByIdAndUpdate(
      ruleId,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.json(updatedRule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteRule = async (req, res) => {
  try {
    const rule = await ProductFeeRule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ message: 'Product Fee Rule not found' });
    }
    await rule.deleteOne();
    res.json({ message: 'Product Fee Rule removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
