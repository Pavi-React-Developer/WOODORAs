/**
 * Cashfree Payment Controller
 * ----------------------------
 * Handles:
 *   POST /api/payment/cashfree/create-session   â†’ Creates a Cashfree payment session
 *   POST /api/payment/cashfree/verify           â†’ Verifies payment after redirect
 */

const Order = require('../models/Order');
const { createCashfreeOrder, verifyCashfreePayment, getCashfreeDiagnostics } = require('../services/cashfreeService');


const diagnostics = async (req, res) => {
  try {
    res.json(getCashfreeDiagnostics());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
/**
 * @desc   Create a Cashfree payment session for an existing order
 * @route  POST /api/payment/cashfree/create-session
 * @access Private
 */
const createPaymentSession = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: 'orderId is required' });
    }

    // Find the order in DB
    const order = await Order.findById(orderId).populate('user', 'name email');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Only the owner can initiate payment
    if (order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Build the return URL â€” app reads ?view=cashfree-callback on load
    const frontendUrl = req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5173';
    const returnUrl = `${frontendUrl}/cashfree-callback?app_order_id=${order._id}&order_id={order_id}&cf_id={cf_order_id}`;

    // Create Cashfree order/session
    const cfOrder = await createCashfreeOrder({
      orderId: order._id.toString(),
      orderAmount: (order.paymentMethod === 'COD' && order.codAdvance > 0) ? order.codAdvance : order.totalPrice,
      customer: {
        id: req.user._id.toString(),
        name: order.shippingAddress?.fullName || req.user.name || 'Customer',
        email: req.user.email || 'noemail@example.com',
        phone: order.shippingAddress?.phone || '9999999999',
      },
      returnUrl,
    });

    res.json({
      success: true,
      orderId: order._id,
      cfOrderId: cfOrder.order_id || `cf_${order._id}`,
      cfNumericOrderId: cfOrder.cf_order_id,
      paymentSessionId: cfOrder.payment_session_id,
      environment: process.env.CASHFREE_ENV || 'sandbox',
    });
  } catch (error) {
    console.error('[Cashfree] Create session error:', {
      message: error.message,
      details: error?.response?.data,
      diagnostics: getCashfreeDiagnostics(),
    });
    res.status(500).json({
      message: 'Failed to create payment session',
      error: error?.response?.data || error.message,
    });
  }
};

/**
 * @desc   Verify Cashfree payment after customer returns from payment page
 * @route  POST /api/payment/cashfree/verify
 * @access Private
 */
const verifyPayment = async (req, res) => {
  try {
    const { orderId, cfOrderId } = req.body;

    if (!orderId || !cfOrderId) {
      return res.status(400).json({ message: 'orderId and cfOrderId are required' });
    }

    // Fetch payment status from Cashfree
    const cfOrder = await verifyCashfreePayment(cfOrderId);

    const isPaid = cfOrder.order_status === 'PAID';

    if (isPaid) {
      // Update our order record
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      order.isPaid = true;
      order.paidAt = Date.now();
      order.paymentResult = {
        id: cfOrder.cf_order_id,
        status: cfOrder.order_status,
        update_time: new Date().toISOString(),
        email_address: req.user?.email || '',
        cashfree_order_id: cfOrder.order_id || cfOrderId,
      };

      const updatedOrder = await order.save();

      return res.json({
        success: true,
        isPaid: true,
        order: updatedOrder,
        cashfreeStatus: cfOrder.order_status,
      });
    } else {
      // Payment not completed
      return res.json({
        success: false,
        isPaid: false,
        cashfreeStatus: cfOrder.order_status,
        message: `Payment status: ${cfOrder.order_status}`,
      });
    }
  } catch (error) {
    console.error('[Cashfree] Verify payment error:', error?.response?.data || error.message);
    res.status(500).json({
      message: 'Failed to verify payment',
      error: error?.response?.data || error.message,
    });
  }
};

module.exports = { diagnostics, createPaymentSession, verifyPayment };



