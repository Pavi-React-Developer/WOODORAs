const GlobalFee = require('../models/GlobalFee');

// @desc    Get the current global fee configuration
// @route   GET /api/global-fees
// @access  Public
const getGlobalFee = async (req, res) => {
  try {
    let globalFee = await GlobalFee.findOne();
    if (!globalFee) {
      // Initialize with defaults if none exists
      globalFee = await GlobalFee.create({
        productFee: 50,
        giftFee: 40,
        isActive: true,
      });
    }
    res.json(globalFee);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// @desc    Update the global fee configuration
// @route   PUT /api/global-fees
// @access  Private/Admin
const updateGlobalFee = async (req, res) => {
  try {
    const { productFee, giftFee, isActive } = req.body;
    let globalFee = await GlobalFee.findOne();
    
    if (globalFee) {
      globalFee.productFee = productFee !== undefined ? productFee : globalFee.productFee;
      globalFee.giftFee = giftFee !== undefined ? giftFee : globalFee.giftFee;
      globalFee.isActive = isActive !== undefined ? isActive : globalFee.isActive;
      const updatedFee = await globalFee.save();
      return res.json(updatedFee);
    } else {
      const newFee = await GlobalFee.create({ productFee, giftFee, isActive });
      return res.status(201).json(newFee);
    }
  } catch (error) {
    res.status(400).json({ message: error.message || 'Invalid data' });
  }
};

module.exports = {
  getGlobalFee,
  updateGlobalFee,
};
