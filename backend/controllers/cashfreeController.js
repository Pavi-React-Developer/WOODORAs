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
    const frontendUrl = req.headers.origin || process.env.FRONTEND_URL;
    const returnUrl = `${frontendUrl}/cashfree-callback?app_order_id=${order._id}&order_id={order_id}&cf_id={cf_order_id}`;

    const gatewayAmount = order.paymentMethod === 'COD'
      ? Number(order.advance_payment || order.codAdvance || 0)
      : Number(order.total_amount || order.totalPrice || 0);
    console.debug('[cashfree pricing]', {
      subtotal: order.subtotal,
      coupon_discount: order.coupon_discount,
      product_fee: order.product_fee,
      gift_fee: order.gift_fee,
      platform_fee: order.platform_fee,
      shipping_fee: order.shipping_fee,
      weight_fee: order.weight_fee,
      grand_total: order.total_amount,
      gatewayAmount,
    });

    // Create Cashfree order/session
    const cfOrder = await createCashfreeOrder({
      orderId: order._id.toString(),
      orderAmount: parseFloat(gatewayAmount.toFixed(2)),
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
      message: 'Failed to create payment session. Please try again later.',
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
      // CRITICAL SECURITY FIX: Ensure the receipt actually belongs to the requested order
      if (String(cfOrder.order_id) !== String(orderId)) {
        return res.status(403).json({ message: 'Security validation failed: Order mismatch.' });
      }

      // Update our order record
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      // CRITICAL SECURITY FIX: Ensure the user actually owns this order
      if (req.user && order.user && order.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to verify this order' });
      }

      const totalAmount = Number(order.total_amount || order.totalPrice || 0);
      const advancePayment = Number(order.advance_payment || order.codAdvance || 0);
      const isCodAdvancePayment = order.paymentMethod === 'COD';
      const paidAmount = isCodAdvancePayment ? Math.min(advancePayment, totalAmount) : totalAmount;

      // Cashfree receives only the advance for COD. It must not turn a
      // partial COD payment into a fully-paid order.
      order.isPaid = !isCodAdvancePayment || paidAmount >= totalAmount;
      order.paidAt = Date.now();
      order.paid_amount = paidAmount;
      order.balance_amount = Math.max(0, totalAmount - paidAmount);
      order.balanceAmount = order.balance_amount;
      
      if (order.status === 'Pending') {
        order.status = 'Placed';
      }
      order.paymentResult = {
        id: cfOrder.cf_order_id,
        status: cfOrder.order_status,
        update_time: new Date().toISOString(),
        email_address: req.user?.email || '',
        cashfree_order_id: cfOrder.order_id || cfOrderId,
      };

      const updatedOrder = await order.save();

      // Clear the user's cart upon successful payment
      try {
        const Cart = require('../models/Cart');
        await Cart.findOneAndUpdate({ user: order.user }, { items: [] });
      } catch (cartErr) {
        console.error('Failed to clear cart after Cashfree success:', cartErr);
      }

      // Automatically send the invoice email
      try {
        const { generateInvoice } = require('../services/invoiceService');
        const { sendInvoiceEmail } = require('../services/emailService');
        
        const populatedOrder = await Order.findById(updatedOrder._id).populate('user', 'name email');
        if (populatedOrder) {
          generateInvoice(populatedOrder)
            .then(pdfBuffer => sendInvoiceEmail(populatedOrder, pdfBuffer))
            .catch(err => console.error('[Cashfree] Failed to generate/send invoice email:', err));
        }
      } catch (emailErr) {
        console.error('[Cashfree] Error preparing invoice email:', emailErr);
      }

      return res.json({
        success: true,
        isPaid: updatedOrder.isPaid,
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
      message: 'Failed to verify payment. Please try again later.',
    });
  }
};

module.exports = { diagnostics, createPaymentSession, verifyPayment };
