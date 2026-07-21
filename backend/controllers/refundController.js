const Refund = require('../models/Refund');
const User = require('../models/User');
const Order = require('../models/Order');
const ProductVariant = require('../models/ProductVariant');
const { addWalletCredit } = require('./walletController');

const Product = require('../models/Product');

// Helper: restore inventory for refunded order items
const restoreProductStock = async (item) => {
  if (!item) return;
  try {
    if (item.variant) {
      const variant = await ProductVariant.findById(item.variant);
      if (variant) {
        // For variants, we reduce reserveStock to make it available in currentStock again.
        // We DO NOT increase inventory, as inventory was never deducted at checkout.
        const newReserve = Math.max(0, (variant.reserveStock || 0) - item.qty);
        const newCurrent = Math.max(0, (variant.inventory || 0) - newReserve);
        await ProductVariant.findByIdAndUpdate(item.variant, {
          reserveStock: newReserve,
          currentStock: newCurrent
        });
        console.log(`Stock restored: freed ${item.qty} from reserve for variant ${item.variant}.`);
      }
    } else if (item.product) {
      const product = await Product.findById(item.product);
      if (product && product.inventory) {
        // For standard products, inventory was deducted at checkout, so we add it back.
        const newStock = (product.inventory.stockQuantity || 0) + item.qty;
        await Product.findByIdAndUpdate(item.product, { 'inventory.stockQuantity': newStock });
        console.log(`Stock restored: +${item.qty} to product ${item.product}.`);
      }
    }
  } catch (err) {
    console.error('Failed to restore stock on refund processing', err);
  }
};

// @desc    Get all refunds (Admin)
// @route   GET /api/refunds
// @access  Private/Admin
const getRefunds = async (req, res) => {
  try {
    const refunds = await Refund.find()
      .populate({
        path: 'orderRef',
        select: 'createdAt status orderItems fees shippingPrice totalPrice user',
        populate: [
          { path: 'user', select: 'name email' },
          { path: 'orderItems.product', select: 'name image price' }
        ]
      })
      .sort({ createdAt: -1 });
    res.json(refunds);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Seed sample refund data
// @route   POST /api/refunds/seed
// @access  Private/Admin
const seedRefunds = async (req, res) => {
  try {
    const count = await Refund.countDocuments();
    if (count > 0) {
      return res.status(400).json({ message: 'Refunds already seeded' });
    }
    const sampleRefunds = [
      { orderId: '#WT10021', customerName: 'Suguna M', amount: 1880.00, paymentType: 'Cashfree', slaTimeline: '24 Hours', status: 'Refunded', refundActionStatus: 'Refunded' },
      { orderId: '#WT10020', customerName: 'Ramesh K', amount: 750.00, paymentType: 'COD', slaTimeline: '48 Hours', status: 'Approval Pending', refundActionStatus: 'Refund' },
      { orderId: '#WT10019', customerName: 'Kavya S', amount: 1250.00, paymentType: 'Cashfree', slaTimeline: '3 Days', status: 'Refund Approved', refundActionStatus: 'Refund' },
    ];
    const created = await Refund.insertMany(sampleRefunds);
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    STEP 2 - Admin approves the cancellation request
// @route   PUT /api/refunds/:id/approve
// @access  Private/Admin
// Result:  status -> "Refund Approved". User sees "Refund Accepted" in their dashboard.
//          NO stock change happens here.
const approveRefund = async (req, res) => {
  try {
    const refund = await Refund.findById(req.params.id);
    if (!refund) return res.status(404).json({ message: 'Refund not found' });

    refund.status = 'Refund Approved';
    // refundActionStatus stays 'Refund' so admin can still click the Refund button

    const updatedRefund = await refund.save();
    res.json(updatedRefund);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    STEP 3 - Admin processes the actual payment refund
// @route   PUT /api/refunds/:id/process
// @access  Private/Admin
// Result:  status -> "Refunded". Stock is restored. Wallet credited if method = Wallet.
const processRefund = async (req, res) => {
  try {
    const { refundMethod } = req.body; // 'Wallet', 'UPI', or 'Bank Transfer'
    const refund = await Refund.findById(req.params.id);
    if (!refund) return res.status(404).json({ message: 'Refund not found' });

    if (refund.status === 'Refunded') {
      return res.status(400).json({ message: 'Refund has already been processed' });
    }

    refund.status = 'Refunded';
    refund.refundActionStatus = 'Refunded';
    refund.refundMethod = refundMethod || '';

    // Automatic restocking is deferred until this point (Refund Processing).
    // This perfectly matches the requested workflow where stock is only added
    // back after the admin approves and processes the refund.
    if (!refund.stockRestored && refund.orderRef) {
      const order = await Order.findById(refund.orderRef);
      if (order && Array.isArray(order.orderItems)) {
        for (const item of order.orderItems) {
          await restoreProductStock(item);
        }
        refund.stockRestored = true;
        console.log(`Inventory restored automatically for refund ${refund._id} (order ${refund.orderId})`);
      }
    }

    // If Wallet was chosen, credit the user's wallet
    if (refundMethod === 'Wallet' && refund.orderRef) {
      const order = await Order.findById(refund.orderRef);
      if (order?.user) {
        const user = await User.findById(order.user);
        if (user) {
          await addWalletCredit({
            userId: user._id,
            amount: refund.amount,
            description: `Refund credited for order ${refund.orderId}`,
            referenceId: refund._id.toString(),
            metadata: {
              refundId: refund._id.toString(),
              orderId: refund.orderId,
              source: 'refund-processing',
            },
          });
        }
      }
    }

    const updatedRefund = await refund.save();
    res.json(updatedRefund);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getRefunds,
  seedRefunds,
  approveRefund,
  processRefund,
};
