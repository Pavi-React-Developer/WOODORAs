const GiftBoxRule = require('../models/GiftBoxRule');

// @desc    Get all gift box rules
// @route   GET /api/admin/gift-box-rules
// @access  Private/Admin
const getGiftBoxRules = async (req, res) => {
  try {
    const rules = await GiftBoxRule.find().sort({ minVolume: 1 }).lean();
    res.json(rules);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// Helper for overlap check
const checkOverlap = async (min, max, excludeId = null) => {
  const query = {
    $or: [
      { minVolume: { $lte: max }, maxVolume: { $gte: min } }
    ]
  };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  const overlap = await GiftBoxRule.findOne(query).lean();
  return overlap !== null;
};

// @desc    Create a new gift box rule
// @route   POST /api/admin/gift-box-rules
// @access  Private/Admin
const createGiftBoxRule = async (req, res) => {
  try {
    const { minVolume, maxVolume, boxSize, fee, description, isActive } = req.body;

    if (minVolume >= maxVolume) {
      return res.status(400).json({ message: 'minVolume must be less than maxVolume' });
    }

    const hasOverlap = await checkOverlap(minVolume, maxVolume);
    if (hasOverlap) {
      return res.status(400).json({ message: 'This volume range overlaps with an existing rule.' });
    }

    const rule = await GiftBoxRule.create({
      minVolume,
      maxVolume,
      boxSize,
      fee,
      description,
      isActive
    });

    res.status(201).json(rule);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Invalid data' });
  }
};

// @desc    Update a gift box rule
// @route   PUT /api/admin/gift-box-rules/:id
// @access  Private/Admin
const updateGiftBoxRule = async (req, res) => {
  try {
    const { minVolume, maxVolume, boxSize, fee, description, isActive } = req.body;
    const rule = await GiftBoxRule.findById(req.params.id);

    if (!rule) {
      return res.status(404).json({ message: 'Rule not found' });
    }

    if (minVolume !== undefined && maxVolume !== undefined) {
      if (minVolume >= maxVolume) {
        return res.status(400).json({ message: 'minVolume must be less than maxVolume' });
      }

      const hasOverlap = await checkOverlap(minVolume, maxVolume, req.params.id);
      if (hasOverlap) {
        return res.status(400).json({ message: 'This volume range overlaps with an existing rule.' });
      }
    }

    rule.minVolume = minVolume !== undefined ? minVolume : rule.minVolume;
    rule.maxVolume = maxVolume !== undefined ? maxVolume : rule.maxVolume;
    rule.boxSize = boxSize || rule.boxSize;
    rule.fee = fee !== undefined ? fee : rule.fee;
    rule.description = description !== undefined ? description : rule.description;
    rule.isActive = isActive !== undefined ? isActive : rule.isActive;

    const updatedRule = await rule.save();
    res.json(updatedRule);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Invalid data' });
  }
};

// @desc    Delete a gift box rule
// @route   DELETE /api/admin/gift-box-rules/:id
// @access  Private/Admin
const deleteGiftBoxRule = async (req, res) => {
  try {
    const rule = await GiftBoxRule.findById(req.params.id);

    if (!rule) {
      return res.status(404).json({ message: 'Rule not found' });
    }

    await rule.deleteOne();
    res.json({ message: 'Rule removed' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

module.exports = {
  getGiftBoxRules,
  createGiftBoxRule,
  updateGiftBoxRule,
  deleteGiftBoxRule
};
