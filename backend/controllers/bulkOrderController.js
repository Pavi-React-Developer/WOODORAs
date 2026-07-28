const mongoose = require('mongoose');
const BulkOrder = require('../models/BulkOrder');

// ── @desc    Create a bulk order request
// ── @route   POST /api/bulk-orders
// ── @access  Private
exports.createBulkOrder = async (req, res) => {
  try {
    const { category, subCategory, product, customFields } = req.body;

    if (!category || !subCategory || !product) {
      return res.status(400).json({
        success: false,
        message: 'Category, sub-category, and product are required',
      });
    }

    // Validate ObjectIds to avoid CastError
    for (const [field, value] of [['category', category], ['subCategory', subCategory], ['product', product]]) {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return res.status(400).json({ success: false, message: `Invalid ${field} ID` });
      }
    }

    const newBulkOrder = await BulkOrder.create({
      user: req.user._id,
      category,
      subCategory,
      product,
      customFields: Array.isArray(customFields) ? customFields : [],
    });

    res.status(201).json({ success: true, data: newBulkOrder });
  } catch (error) {
    console.error('createBulkOrder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create bulk order request',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined,
    });
  }
};

// ── @desc    Get all bulk orders (Admin)
// ── @route   GET /api/bulk-orders
// ── @access  Private/Admin
exports.getAllBulkOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const numPage  = Math.max(Number(page)  || 1,  1);
    const numLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);

    const filter = {};
    if (status && ['Pending', 'Approved', 'Rejected'].includes(status)) {
      filter.status = status;
    }

    const [total, orders] = await Promise.all([
      BulkOrder.countDocuments(filter),
      BulkOrder.find(filter)
        .populate('user', 'name email')
        .populate('category', 'name image')
        .populate('subCategory', 'name image')
        .populate({
          path: 'product',
          select: 'name images image sku price basePrice compareAtPrice',
          populate: { path: 'images' },
        })
        .sort({ createdAt: -1 })
        .skip((numPage - 1) * numLimit)
        .limit(numLimit)
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      data: orders,
      total,
      page: numPage,
      pages: Math.ceil(total / numLimit),
    });
  } catch (error) {
    console.error('getAllBulkOrders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bulk orders',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined,
    });
  }
};

// ── @desc    Get logged-in user's bulk orders
// ── @route   GET /api/bulk-orders/my-requests
// ── @access  Private
exports.getMyBulkOrders = async (req, res) => {
  try {
    const orders = await BulkOrder.find({ user: req.user._id })
      .populate('category', 'name image')
      .populate('subCategory', 'name image')
      .populate({
        path: 'product',
        select: 'name images image price basePrice compareAtPrice',
        populate: { path: 'images' },
      })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error('getMyBulkOrders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your bulk orders',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined,
    });
  }
};

// ── @desc    Update bulk order status (Admin)
// ── @route   PUT /api/bulk-orders/:id/status
// ── @access  Private/Admin
exports.updateBulkOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid bulk order ID' });
    }

    const { status, rejectionReason } = req.body;

    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be Pending, Approved, or Rejected.',
      });
    }

    if (status === 'Rejected' && !rejectionReason?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A rejection reason is required when rejecting a bulk order.',
      });
    }

    const order = await BulkOrder.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Bulk order not found' });
    }

    order.status = status;
    order.rejectionReason = status === 'Rejected' ? rejectionReason.trim() : undefined;

    await order.save();

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error('updateBulkOrderStatus error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update status',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined,
    });
  }
};
