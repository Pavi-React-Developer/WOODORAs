const Fee = require('../models/Fee');
const FeeCategory = require('../models/FeeCategory');
const PaymentMethod = require('../models/PaymentMethod');

const normalizeText = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const isWeightCategoryName = (name) => normalizeText(name).includes('weight');

const normalizeWeightSlabs = (weightSlabs = []) => weightSlabs
  .map((slab, index) => ({
    ...slab,
    minWeight: Number(slab.minWeight),
    maxWeight: Number(slab.maxWeight),
    charge: Number(slab.charge ?? slab.feeValue),
    feeValue: Number(slab.charge ?? slab.feeValue),
    status: slab.status !== false,
    displayOrder: Number.isFinite(Number(slab.displayOrder)) ? Number(slab.displayOrder) : index,
  }))
  .sort((a, b) => a.displayOrder - b.displayOrder);

const validateWeightSlabs = (weightSlabs = []) => {
  const normalized = normalizeWeightSlabs(weightSlabs);

  normalized.forEach((slab) => {
    if (!Number.isFinite(slab.minWeight)) throw new Error('Min weight must be a valid number');
    if (!Number.isFinite(slab.maxWeight)) throw new Error('Max weight must be a valid number');
    if (!Number.isFinite(slab.charge)) throw new Error('Charge must be a valid number');
    if (slab.minWeight < 0 || slab.maxWeight <= 0 || slab.charge < 0) {
      throw new Error('Weight and charge values cannot be negative');
    }
    if (slab.minWeight >= slab.maxWeight) {
      throw new Error('Max weight must be greater than min weight');
    }
  });

  const sorted = [...normalized].sort((a, b) => a.minWeight - b.minWeight);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].minWeight <= sorted[i - 1].maxWeight) {
      throw new Error('Weight slabs cannot overlap');
    }
  }

  return normalized;
};

const prepareFeePayload = async (body) => {
  const payload = { ...body };
  const categoryId = payload.feeCategory;
  const category = categoryId ? await FeeCategory.findById(categoryId) : null;
  const isWeightFee = isWeightCategoryName(category?.name);

  if (payload.paymentMethod === '') payload.paymentMethod = null;

  if (isWeightFee) {
    payload.weightSlabs = validateWeightSlabs(payload.weightSlabs || []);
    payload.flatFeeValue = undefined;
  } else if (payload.weightSlabs !== undefined) {
    payload.weightSlabs = [];
  }

  if ('minimumOrderAmount' in body) {
    if (payload.minimumOrderAmount !== null && payload.minimumOrderAmount !== '') {
      payload.minimumOrderAmount = Number(payload.minimumOrderAmount);
    } else {
      payload.minimumOrderAmount = null;
    }
  }

  if ('maximumOrderAmount' in body) {
    if (payload.maximumOrderAmount !== null && payload.maximumOrderAmount !== '') {
      payload.maximumOrderAmount = Number(payload.maximumOrderAmount);
    } else {
      payload.maximumOrderAmount = null;
    }
  }

  if ('minimumOrderAmount' in body || 'maximumOrderAmount' in body) {
    if (payload.minimumOrderAmount !== null && payload.minimumOrderAmount !== undefined &&
        payload.maximumOrderAmount !== null && payload.maximumOrderAmount !== undefined) {
      if (payload.minimumOrderAmount > payload.maximumOrderAmount) {
        throw new Error('Minimum order amount cannot be greater than maximum order amount');
      }
    }
  }

  return payload;
};

// ==========================================
// FEE MANAGEMENT CONTROLLERS
// ==========================================

// Get all fees
exports.getFees = async (req, res) => {
  try {
    const fees = await Fee.find()
      .populate('feeCategory', 'name')
      .populate('paymentMethod', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json(fees);
  } catch (error) {
    console.error('Error fetching fees:', error);
    res.status(500).json({ message: 'Server error fetching fees', error: error.message });
  }
};

// Get single fee by ID
exports.getFeeById = async (req, res) => {
  try {
    const fee = await Fee.findById(req.params.id)
      .populate('feeCategory', 'name')
      .populate('paymentMethod', 'name');
    if (!fee) return res.status(404).json({ message: 'Fee not found' });
    res.status(200).json(fee);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching fee', error: error.message });
  }
};

// Create a new fee
exports.createFee = async (req, res) => {
  try {
    const newFee = new Fee(await prepareFeePayload(req.body));

    const savedFee = await newFee.save();
    res.status(201).json(savedFee);
  } catch (error) {
    console.error('Error creating fee:', error);
    res.status(500).json({ message: 'Server error creating fee', error: error.message });
  }
};

// Update an existing fee
exports.updateFee = async (req, res) => {
  try {
    const payload = await prepareFeePayload(req.body);
    const updatedFee = await Fee.findByIdAndUpdate(
      req.params.id,
      { $set: payload },
      { returnDocument: 'after', runValidators: true }
    );
    if (!updatedFee) return res.status(404).json({ message: 'Fee not found' });
    res.status(200).json(updatedFee);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating fee', error: error.message });
  }
};

exports.createWeightSlab = async (req, res) => {
  try {
    const fee = await Fee.findById(req.params.feeId).populate('feeCategory', 'name');
    if (!fee) return res.status(404).json({ message: 'Fee not found' });
    if (!isWeightCategoryName(fee.feeCategory?.name)) {
      return res.status(400).json({ message: 'Weight slabs can be added only to weight fee categories' });
    }

    fee.weightSlabs.push(req.body);
    fee.weightSlabs = validateWeightSlabs(fee.weightSlabs);
    await fee.save();
    res.status(201).json(fee.weightSlabs);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Failed to create weight slab' });
  }
};

exports.updateWeightSlab = async (req, res) => {
  try {
    const fee = await Fee.findById(req.params.feeId).populate('feeCategory', 'name');
    if (!fee) return res.status(404).json({ message: 'Fee not found' });
    if (!isWeightCategoryName(fee.feeCategory?.name)) {
      return res.status(400).json({ message: 'Weight slabs can be updated only for weight fee categories' });
    }

    const slab = fee.weightSlabs.id(req.params.slabId);
    if (!slab) return res.status(404).json({ message: 'Weight slab not found' });

    Object.assign(slab, req.body);
    fee.weightSlabs = validateWeightSlabs(fee.weightSlabs);
    await fee.save();
    res.status(200).json(fee.weightSlabs);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Failed to update weight slab' });
  }
};

exports.deleteWeightSlab = async (req, res) => {
  try {
    const fee = await Fee.findById(req.params.feeId);
    if (!fee) return res.status(404).json({ message: 'Fee not found' });

    const slab = fee.weightSlabs.id(req.params.slabId);
    if (!slab) return res.status(404).json({ message: 'Weight slab not found' });

    slab.deleteOne();
    fee.weightSlabs = validateWeightSlabs(fee.weightSlabs);
    await fee.save();
    res.status(200).json(fee.weightSlabs);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Failed to delete weight slab' });
  }
};

exports.reorderWeightSlabs = async (req, res) => {
  try {
    const { slabIds } = req.body;
    if (!Array.isArray(slabIds)) {
      return res.status(400).json({ message: 'slabIds must be an array' });
    }

    const fee = await Fee.findById(req.params.feeId);
    if (!fee) return res.status(404).json({ message: 'Fee not found' });

    const orderMap = new Map(slabIds.map((id, index) => [String(id), index]));
    fee.weightSlabs.forEach((slab, index) => {
      slab.displayOrder = orderMap.has(String(slab._id)) ? orderMap.get(String(slab._id)) : index;
    });
    fee.weightSlabs = validateWeightSlabs(fee.weightSlabs);
    await fee.save();
    res.status(200).json(fee.weightSlabs);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Failed to reorder weight slabs' });
  }
};

// Delete a fee
exports.deleteFee = async (req, res) => {
  try {
    const deletedFee = await Fee.findByIdAndDelete(req.params.id);
    if (!deletedFee) return res.status(404).json({ message: 'Fee not found' });
    res.status(200).json({ message: 'Fee deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting fee', error: error.message });
  }
};

// ==========================================
// FEE CATEGORY CONTROLLERS
// ==========================================

exports.getFeeCategories = async (req, res) => {
  try {
    const categories = await FeeCategory.find().sort({ name: 1 });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching fee categories', error: error.message });
  }
};

exports.createFeeCategory = async (req, res) => {
  try {
    const { name, isActive } = req.body;
    
    // Check if exists
    const existing = await FeeCategory.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ message: 'Fee category already exists' });
    }

    const newCat = await FeeCategory.create({ name, isActive: isActive !== false });
    res.status(201).json(newCat);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating fee category', error: error.message });
  }
};

exports.deleteFeeCategory = async (req, res) => {
  try {
    const deletedCat = await FeeCategory.findByIdAndDelete(req.params.id);
    if (!deletedCat) return res.status(404).json({ message: 'Category not found' });
    // Also consider removing this category from fees or preventing deletion if fees exist
    // For simplicity, we just delete it here.
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting fee category', error: error.message });
  }
};

// ==========================================
// PAYMENT METHOD CONTROLLERS
// ==========================================

exports.getPaymentMethods = async (req, res) => {
  try {
    const methods = await PaymentMethod.find().sort({ name: 1 });
    res.status(200).json(methods);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching payment methods', error: error.message });
  }
};

exports.createPaymentMethod = async (req, res) => {
  try {
    const { name, isActive } = req.body;

    const existing = await PaymentMethod.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ message: 'Payment method already exists' });
    }

    const newMethod = new PaymentMethod({ name, isActive });
    const saved = await newMethod.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating payment method', error: error.message });
  }
};

// ==========================================
// CHECKOUT API
// ==========================================

exports.checkCodAvailability = async (req, res) => {
  try {
    const cartTotal = Number(req.query.cartTotal || 0);

    // Find first active COD fee that has min or max order amount configured
    const activeCodFees = await Fee.find({
      active: true,
      paymentMethod: { $in: ['COD', 'Both (COD & CashFree)'] },
      $or: [
        { minimumOrderAmount: { $exists: true, $ne: null } },
        { maximumOrderAmount: { $exists: true, $ne: null } }
      ]
    });

    if (!activeCodFees || activeCodFees.length === 0) {
      return res.status(200).json({ codEnabled: true, message: '' });
    }

    // Evaluate against the first configured fee
    const feeConfig = activeCodFees[0];
    const min = feeConfig.minimumOrderAmount;
    const max = feeConfig.maximumOrderAmount;

    let codEnabled = true;
    let message = '';

    if (min != null && max != null) {
      if (cartTotal < min || cartTotal > max) {
        codEnabled = false;
        message = `Cash on Delivery is available only for orders between ₹${min} and ₹${max}.`;
      }
    } else if (min != null) {
      if (cartTotal < min) {
        codEnabled = false;
        message = `Cash on Delivery is available only for orders above ₹${min}.`;
      }
    } else if (max != null) {
      if (cartTotal > max) {
        codEnabled = false;
        message = `Cash on Delivery is available only up to ₹${max}.`;
      }
    }

    res.status(200).json({ codEnabled, message });
  } catch (error) {
    console.error('Error checking COD availability:', error);
    res.status(500).json({ message: 'Server error checking COD availability', error: error.message });
  }
};
