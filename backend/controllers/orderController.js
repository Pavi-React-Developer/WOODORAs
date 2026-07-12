const Order = require('../models/Order');
const Fee = require('../models/Fee');
const Refund = require('../models/Refund');
const CancellationRule = require('../models/CancellationRule');
const User = require('../models/User');
const Product = require('../models/Product');
const { calculateOrderFees } = require('../utils/feeCalculator');
const ProductVariant = require('../models/ProductVariant');

const updateVariantStock = async (variantId, qty, type) => {
  if (!variantId) return;
  try {
    const variant = await ProductVariant.findById(variantId);
    if (!variant) return;

    if (type === 'reserve') {
      variant.reserveStock = (variant.reserveStock || 0) + qty;
    } else if (type === 'deliver') {
      variant.reserveStock = Math.max(0, (variant.reserveStock || 0) - qty);
      variant.inventory = Math.max(0, (variant.inventory || 0) - qty);
    } else if (type === 'cancel') {
      variant.reserveStock = Math.max(0, (variant.reserveStock || 0) - qty);
    } else if (type === 'refund') {
      variant.inventory = (variant.inventory || 0) + qty;
    }

    variant.currentStock = Math.max(0, (variant.inventory || 0) - (variant.reserveStock || 0));
    await variant.save();
  } catch (err) {
    console.error('Failed to update variant stock', err);
  }
};

const mapOrderStatusToRuleStatus = (status) => {
  const mapping = {
    'Placed': 'Order Placed',
    'Packed': 'Packed',
    'Shipping': 'Shipped',
    'Out for delivery': 'Out for Delivery',
    'Delivered': 'Delivered'
  };
  return mapping[status] || 'Order Placed';
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const addOrderItems = async (req, res) => {
  try {
    const {
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      orderNotes,
      fees
    } = req.body;

    if (orderItems && orderItems.length === 0) {
      return res.status(400).json({ message: 'No order items' });
    } else {
      console.log('--- RECEIVED ORDER ITEMS ---', JSON.stringify(orderItems, null, 2));

      const configuredFees = await Fee.find({ active: true })
        .populate('feeCategory', 'name')
        .populate('paymentMethod', 'name')
        .lean();

      const subtotal = Number(itemsPrice) || orderItems.reduce((sum, item) => (
        sum + ((Number(item.price) || 0) * (Number(item.qty) || 0))
      ), 0);

      const feeSummary = calculateOrderFees({
        fees: configuredFees,
        subtotal,
        items: orderItems,
        state: shippingAddress?.state,
        paymentMethod,
      });

      const extraChargeSum = feeSummary.extraFeesList.reduce((sum, fee) => sum + fee.amount, 0);
      const calculatedTotalPrice = subtotal + feeSummary.shippingCharge + extraChargeSum;
      const calculatedBalanceAmount = paymentMethod === 'COD' && feeSummary.codAdvance > 0
        ? calculatedTotalPrice - feeSummary.codAdvance
        : 0;

      const order = new Order({
        orderItems,
        user: req.user._id,
        shippingAddress,
        paymentMethod,
        itemsPrice: subtotal,
        taxPrice,
        shippingPrice: feeSummary.shippingCharge,
        totalPrice: calculatedTotalPrice,
        codAdvance: feeSummary.codAdvance,
        balanceAmount: calculatedBalanceAmount,
        orderNotes,
        fees: feeSummary.appliedFees.length > 0 ? feeSummary.appliedFees : (Array.isArray(fees) ? fees : []),
        couponCode: req.body.couponCode || null,
        discountAmount: Number(req.body.discountAmount || 0),
        coupon: null,
      });

      // If a couponCode was provided, attempt to link the coupon ObjectId for stronger referential integrity
      if (order.couponCode) {
        try {
          const Coupon = require('../models/Coupon');
          const normalized = String(order.couponCode || '').trim().toUpperCase();
          const found = await Coupon.findOne({ couponCode: normalized, deleted: false });
          if (found) {
            order.coupon = found._id;
          }
        } catch (err) {
          console.error('Failed to link coupon to order:', err.message || err);
        }
      }

      const createdOrder = await order.save();

      // Reserve stock when order is placed
      for (const item of createdOrder.orderItems) {
        if (item.variant) {
          await updateVariantStock(item.variant, item.qty, 'reserve');
        } else if (item.product) {
          // Implement simple product stock decrement
          try {
            const productToUpdate = await Product.findById(item.product);
            if (productToUpdate && productToUpdate.inventory) {
              productToUpdate.inventory.stockQuantity = Math.max(0, (productToUpdate.inventory.stockQuantity || 0) - item.qty);
              await productToUpdate.save();
            }
          } catch (err) {
            console.error('Failed to update product stock', err);
          }
        }
      }

      res.status(201).json(createdOrder);
    }
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');

    if (order) {
      // Check if order belongs to user or user is admin/staff
      const userRole = req.user.role?.toLowerCase();
      if (
        order.user._id.toString() !== req.user._id.toString() &&
        userRole !== 'admin' &&
        userRole !== 'manager' &&
        !req.user.isStaff
      ) {
        return res.status(403).json({ message: 'Not authorized to view this order' });
      }
      res.json(order);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// @desc    Update order to paid
// @route   PUT /api/orders/:id/pay
// @access  Private
const updateOrderToPaid = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.isPaid = true;
      order.paidAt = Date.now();
      order.paymentResult = {
        id: req.body.id,
        status: req.body.status,
        update_time: req.body.update_time,
        email_address: req.body.email_address,
      };
      order.status = 'Packed';

      const updatedOrder = await order.save();
      // If order had a coupon applied, consume it now (increment usageCount)
      try {
        if (updatedOrder.couponCode) {
          const Coupon = require('../models/Coupon');
          const c = await Coupon.findOne({ couponCode: String(updatedOrder.couponCode).trim().toUpperCase(), deleted: false });
          if (c) {
            c.usageCount = (Number(c.usageCount) || 0) + 1;
            await c.save();
          }
        }
      } catch (err) {
        console.error('Failed to consume coupon on payment completion', err);
      }
      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = Order.VALID_STATUSES || [
      'Placed',
      'Shipping',
      'Out for delivery',
      'Delivered',
      'Cancelled',
      'Pending',
      'Packed',
      'Shipped',
    ];

    if (!validStatuses.includes(status)) {
      console.log('--- INVALID STATUS TRIGGERED ---');
      console.log('Received status:', `'${status}'`, 'Type:', typeof status);
      console.log('Valid statuses:', validStatuses);
      console.log('Order.VALID_STATUSES:', Order.VALID_STATUSES);
      return res.status(400).json({ message: 'Invalid order status' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const STATUS_WEIGHTS = {
      'Pending': 0,
      'Placed': 1,
      'Packed': 2,
      'Shipping': 3,
      'Shipped': 4,
      'Out for delivery': 5,
      'Delivered': 6,
      'Cancelled': 99
    };

    const currentWeight = STATUS_WEIGHTS[order.status] || 0;
    const newWeight = STATUS_WEIGHTS[status] || 0;

    if (status === 'Cancelled' && order.status === 'Delivered') {
      return res.status(400).json({ message: 'Cannot cancel a delivered order' });
    }

    if (status !== 'Cancelled' && newWeight < currentWeight) {
      return res.status(400).json({ message: 'Cannot move order status backwards' });
    }

    order.status = status;

    if (status === 'Delivered') {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
      if (order.paymentMethod === 'COD' && !order.isPaid) {
        order.isPaid = true;
        order.paidAt = Date.now();
      }

      // Deduct stock when delivered
      for (const item of order.orderItems) {
        if (item.variant) {
          await updateVariantStock(item.variant, item.qty, 'deliver');
        } else if (item.product) {
          try {
            const productToUpdate = await Product.findById(item.product);
            if (productToUpdate && productToUpdate.inventory) {
              productToUpdate.inventory.stockQuantity = Math.max(0, (productToUpdate.inventory.stockQuantity || 0) - item.qty);
              await productToUpdate.save();
            }
          } catch (err) {
            console.error('Failed to update product stock on deliver', err);
          }
        }
      }
    }

    if (status === 'Cancelled' && currentWeight !== 99) {
      // Release reserved stock when cancelled
      for (const item of order.orderItems) {
        if (item.variant) {
          await updateVariantStock(item.variant, item.qty, 'cancel');
        } else if (item.product) {
          try {
            const productToUpdate = await Product.findById(item.product);
            if (productToUpdate && productToUpdate.inventory) {
              productToUpdate.inventory.stockQuantity = (productToUpdate.inventory.stockQuantity || 0) + item.qty;
              await productToUpdate.save();
            }
          } catch (err) {
            console.error('Failed to update product stock on cancel', err);
          }
        }
      }
    }

    if (status === 'Cancelled') {
      order.isDelivered = false;
    }

    if (['Placed', 'Shipping', 'Out for delivery', 'Pending', 'Packed', 'Shipped'].includes(status)) {
      order.isDelivered = false;
    }

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// @desc    Update order to delivered
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin
const updateOrderToDelivered = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.isDelivered = true;
    order.deliveredAt = Date.now();
    order.status = 'Delivered';

    if (order.paymentMethod === 'COD' && !order.isPaid) {
      order.isPaid = true;
      order.paidAt = Date.now();
    }

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({}).populate('user', 'id name email').sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// @desc    Update order details
// @route   PUT /api/orders/:id/details
// @access  Private/Admin
const updateOrderDetails = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const { shippingAddress, status, isPaid, paymentMethod, trackingId, trackingUrl } = req.body;

    if (shippingAddress) {
      order.shippingAddress = shippingAddress;
    }

    if (trackingId !== undefined) {
      order.trackingId = trackingId;
    }
    if (trackingUrl !== undefined) {
      order.trackingUrl = trackingUrl;
    }

    if (status && status !== order.status) {
      const STATUS_WEIGHTS = {
        'Pending': 0, 'Placed': 1, 'Packed': 2, 'Shipping': 3,
        'Shipped': 4, 'Out for delivery': 5, 'Delivered': 6, 'Cancelled': 99
      };

      const currentWeight = STATUS_WEIGHTS[order.status] || 0;
      const newWeight = STATUS_WEIGHTS[status] || 0;

      if (status !== 'Cancelled' && newWeight < currentWeight) {
        return res.status(400).json({ message: 'Cannot move order status backwards' });
      }
      if (order.status === 'Delivered' && status === 'Cancelled') {
        return res.status(400).json({ message: 'Cannot cancel a delivered order' });
      }

      order.status = status;
      if (status === 'Delivered' && !order.isDelivered) {
        order.isDelivered = true;
        order.deliveredAt = Date.now();
      }
    }

    if (isPaid !== undefined) {
      order.isPaid = isPaid;
      if (isPaid && !order.paidAt) {
        order.paidAt = Date.now();
      }
    }

    if (paymentMethod) {
      order.paymentMethod = paymentMethod;
    }

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// @desc    Get cancellation preview (fee and refund estimate)
// @route   GET /api/orders/:id/cancellation-preview
// @access  Private
const getCancellationPreview = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('orderItems.product', 'name image price');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const ruleMethod = order.paymentMethod === 'Cashfree' ? 'Online' : 'COD';
    const ruleStatus = mapOrderStatusToRuleStatus(order.status);

    const rule = await CancellationRule.findOne({
      paymentMethod: ruleMethod,
      orderStatus: ruleStatus
    });

    let cancellationFee = 0;
    let isAllowed = false;
    let notAllowedReason = 'Cancellation rule not configured for this status';

    let timeLimit = null;

    if (rule) {
      timeLimit = rule.timeLimit;
      if (!rule.isAllowed) {
        isAllowed = false;
        notAllowedReason = `Cancellation is not allowed when order is ${ruleStatus}`;
      } else {
        isAllowed = true;
        notAllowedReason = '';
        cancellationFee = rule.cancellationFee || 0;
      }
    }

    const amountPaid = order.paymentMethod === 'COD' ? 200 : order.totalPrice;
    const estimatedRefund = Math.max(0, amountPaid - cancellationFee);

    res.json({
      orderId: order._id,
      items: order.orderItems,
      shippingAndFees: (order.shippingPrice || 0) + (order.taxPrice || 0),
      totalOrderAmount: order.totalPrice,
      paymentMethod: order.paymentMethod,
      amountPaid,
      cancellationFee,
      estimatedRefund,
      isAllowed,
      notAllowedReason,
      ruleStatus,
      ruleMethod,
      timeLimit,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// @desc    Cancel order and create refund
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = async (req, res) => {
  try {
    const { refundDestination } = req.body || {};
    const order = await Order.findById(req.params.id).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check cancellation rule
    const ruleMethod = order.paymentMethod === 'Cashfree' ? 'Online' : 'COD';
    const ruleStatus = mapOrderStatusToRuleStatus(order.status);
    const rule = await CancellationRule.findOne({ paymentMethod: ruleMethod, orderStatus: ruleStatus });

    let cancellationFee = 0;
    if (rule) {
      if (!rule.isAllowed) {
        return res.status(400).json({ message: `Cancellation is not allowed when order is ${ruleStatus}` });
      }
      cancellationFee = rule.cancellationFee || 0;
    }

    const amountPaid = order.paymentMethod === 'COD' ? 200 : order.totalPrice;
    const refundAmount = Math.max(0, amountPaid - cancellationFee);

    // Create a Refund entry
    const newRefund = new Refund({
      orderId: `#${order._id.toString().slice(-8).toUpperCase()}`,
      orderRef: order._id,
      originalStatus: order.status, // this is the status before it's updated to 'Cancelled' below
      cancellationFee: cancellationFee,
      amountPaid: amountPaid,
      customerName: order.user ? order.user.name : 'Guest',
      customerEmail: order.user ? order.user.email : '',
      customerPhone: order.shippingAddress?.phone || '',
      amount: refundAmount,
      paymentType: order.paymentMethod === 'COD' ? 'COD' : 'Cashfree',
      slaTimeline: rule && rule.timeLimit ? rule.timeLimit : '-',
      refundDestination: refundDestination || '',
      status: 'Approval Pending',
      refundActionStatus: 'Refund'
    });

    // Update order status to Cancelled
    order.status = 'Cancelled';
    const updatedOrder = await order.save();

    await newRefund.save();

    // Release stock based on whether it was delivered or just reserved
    for (const item of order.orderItems) {
      if (item.variant) {
        if (order.isDelivered) {
          // If for some reason it was delivered and cancelled, add back to inventory
          await updateVariantStock(item.variant, item.qty, 'refund');
        } else {
          // It was just placed/packed, release reserved stock
          await updateVariantStock(item.variant, item.qty, 'cancel');
        }
      } else if (item.product) {
        try {
          const productToUpdate = await Product.findById(item.product);
          if (productToUpdate && productToUpdate.inventory) {
            productToUpdate.inventory.stockQuantity = (productToUpdate.inventory.stockQuantity || 0) + item.qty;
            await productToUpdate.save();
          }
        } catch (err) {
          console.error('Failed to update product stock on cancellation', err);
        }
      }
    }

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// @desc    Get dashboard stats
// @route   GET /api/orders/dashboard-stats
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalCustomers = await User.countDocuments({ role: 'user' });
    const totalProducts = await Product.countDocuments();

    // Revenue logic: sum of all paid orders
    const orders = await Order.find({ isPaid: true });
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);

    // Revenue analytics: daily revenue over the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const recentOrders = await Order.find({
      isPaid: true,
      createdAt: { $gte: thirtyDaysAgo }
    });

    const revenueByDate = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      revenueByDate[dateStr] = 0;
    }

    recentOrders.forEach(order => {
      const dateStr = new Date(order.createdAt).toISOString().split('T')[0];
      if (revenueByDate[dateStr] !== undefined) {
        revenueByDate[dateStr] += (order.totalPrice || 0);
      }
    });

    const revenueAnalytics = Object.keys(revenueByDate).map(date => ({
      date,
      revenue: revenueByDate[date]
    }));

    // Order Volume: orders by day of week (1=Sun)
    // Actually day of week: 0=Sun, 1=Mon, ..., 6=Sat
    const orderVolumeArray = Array(7).fill(0);
    const allOrders = await Order.find();
    allOrders.forEach(order => {
      const day = new Date(order.createdAt).getDay();
      orderVolumeArray[day] += 1;
    });

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const orderVolume = daysOfWeek.map((day, idx) => ({
      name: day,
      value: orderVolumeArray[idx]
    }));

    res.json({
      totalRevenue,
      totalOrders,
      totalCustomers,
      totalProducts,
      revenueAnalytics,
      orderVolume
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete order
// @route   DELETE /api/orders/:id
// @access  Private/Admin
const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (order) {
      // Revert stock reservations if order was not delivered or cancelled yet
      if (['Placed', 'Packed', 'Shipping', 'Out for delivery', 'Pending', 'Shipped'].includes(order.status)) {
        for (const item of order.orderItems) {
          if (item.variant) {
            await updateVariantStock(item.variant, item.qty, 'cancel');
          } else if (item.product) {
            try {
              const productToUpdate = await Product.findById(item.product);
              if (productToUpdate && productToUpdate.inventory) {
                productToUpdate.inventory.stockQuantity = (productToUpdate.inventory.stockQuantity || 0) + item.qty;
                await productToUpdate.save();
              }
            } catch (err) {
              console.error('Failed to restore product stock on order delete', err);
            }
          }
        }
      }

      await Order.findByIdAndDelete(req.params.id);
      res.json({ message: 'Order deleted successfully' });
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

module.exports = {
  addOrderItems,
  getOrderById,
  updateOrderToPaid,
  updateOrderStatus,
  updateOrderToDelivered,
  getMyOrders,
  getOrders,
  getDashboardStats,
  updateOrderDetails,
  cancelOrder,
  getCancellationPreview,
  deleteOrder,
};

