const BulkOrder = require('../models/BulkOrder');

// @desc    Create a bulk order request
// @route   POST /api/bulk-orders
// @access  Private
exports.createBulkOrder = async (req, res) => {
  try {
    const {
      category,
      subCategory,
      product,
      companyName,
      contactPerson,
      email,
      phone,
      estimatedQuantity,
      customBranding,
      customizationRequests
    } = req.body;

    const newBulkOrder = await BulkOrder.create({
      user: req.user._id,
      category,
      subCategory,
      product,
      companyName,
      contactPerson,
      email,
      phone,
      estimatedQuantity,
      customBranding,
      customizationRequests
    });

    res.status(201).json({
      success: true,
      data: newBulkOrder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create bulk order request',
      error: error.message
    });
  }
};

// @desc    Get all bulk orders (Admin)
// @route   GET /api/bulk-orders
// @access  Private/Admin
exports.getAllBulkOrders = async (req, res) => {
  try {
    const orders = await BulkOrder.find()
      .populate('user', 'name email')
      .populate('category', 'name')
      .populate('subCategory', 'name')
      .populate('product', 'name images sku price')
      .sort('-createdAt');
    res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bulk orders'
    });
  }
};

// @desc    Get logged in user's bulk orders
// @route   GET /api/bulk-orders/my-requests
// @access  Private
exports.getMyBulkOrders = async (req, res) => {
  try {
    const orders = await BulkOrder.find({ user: req.user._id })
      .populate('category', 'name')
      .populate('subCategory', 'name')
      .populate('product', 'name images')
      .sort('-createdAt');
    res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your bulk orders'
    });
  }
};

// @desc    Update bulk order status (Admin)
// @route   PUT /api/bulk-orders/:id/status
// @access  Private/Admin
exports.updateBulkOrderStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    
    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const order = await BulkOrder.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Bulk order not found'
      });
    }

    order.status = status;
    if (status === 'Rejected') {
      order.rejectionReason = rejectionReason;
    } else {
      order.rejectionReason = undefined;
    }

    await order.save();

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update status'
    });
  }
};
