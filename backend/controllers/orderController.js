const Order = require('../models/Order');
const Fee = require('../models/Fee');
const Refund = require('../models/Refund');
const CancellationRule = require('../models/CancellationRule');
const User = require('../models/User');
const Product = require('../models/Product');
const { calculateOrderFees } = require('../utils/feeCalculator');
const ProductVariant = require('../models/ProductVariant');
const Inventory = require('../models/Inventory');
const ProductFeeRule = require('../models/ProductFeeRule');

const normalizeDeliveryDate = (value) => {
  if (value == null || value === '') return null;
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00.000Z`)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const amount = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const feeAmount = (fees, ...tokens) => (Array.isArray(fees) ? fees : [])
  .filter((fee) => {
    const feeName = String(fee.name || '').toLowerCase();
    return tokens.some(token => feeName.includes(token));
  })
  .reduce((sum, fee) => sum + amount(fee.amount), 0);

// The checkout sends one pricing snapshot.  We only derive its total from its
// components, never from current fee rules, so the saved order is immutable.
const buildPricingSnapshot = ({ pricing = {}, subtotal, discountAmount, fees, shippingPrice, codAdvance, paymentMethod }) => {
  const weightFee = amount(pricing.weight_fee ?? pricing.weightFee ?? shippingPrice);
  // A weight fee is this storefront's shipping charge. Never store/add the
  // same charge in both fields, even if an older client sends both values.
  const shippingFee = weightFee > 0 ? 0 : amount(pricing.shipping_fee ?? pricing.shippingFee ?? feeAmount(fees, 'shipping'));
  const snapshot = {
    subtotal: amount(pricing.subtotal ?? subtotal),
    coupon_discount: amount(pricing.coupon_discount ?? pricing.couponDiscount ?? discountAmount),
    product_fee: amount(pricing.product_fee ?? pricing.productFee ?? feeAmount(fees, 'product')),
    gift_fee: amount(pricing.gift_fee ?? pricing.giftFee ?? feeAmount(fees, 'gift')),
    shipping_fee: shippingFee,
    weight_fee: weightFee,
    platform_fee: amount(pricing.platform_fee ?? pricing.platformFee ?? feeAmount(fees, 'platform', 'plaftform')),
    advance_payment: amount(pricing.advance_payment ?? pricing.advancePayment ?? codAdvance),
  };
  const ADVANCE_KEYWORDS = ['advance', 'advance payment', 'cod advance'];
  const isAdvanceFee = (name) => ADVANCE_KEYWORDS.some(kw => String(name || '').toLowerCase().includes(kw));

  // Advance-payment is a payment, not an additional charge — exclude it from the order total.
  const billableFees = (Array.isArray(fees) ? fees : []).filter(fee => !isAdvanceFee(fee.name));
  const dynamicFeesTotal = billableFees.reduce((sum, fee) => sum + amount(fee.amount), 0);
  const totalFees = dynamicFeesTotal > 0
    ? dynamicFeesTotal
    : (snapshot.product_fee + snapshot.gift_fee + snapshot.shipping_fee + snapshot.weight_fee + snapshot.platform_fee);

  snapshot.total_amount = Math.max(0, snapshot.subtotal - snapshot.coupon_discount + totalFees);
  snapshot.paid_amount = paymentMethod === 'COD' ? Math.min(snapshot.advance_payment, snapshot.total_amount) : 0;
  snapshot.balance_amount = Math.max(0, snapshot.total_amount - snapshot.paid_amount);
  return snapshot;
};

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

    const newCurrent = Math.max(0, (variant.inventory || 0) - (variant.reserveStock || 0));

    await ProductVariant.findByIdAndUpdate(variantId, {
      reserveStock: variant.reserveStock,
      inventory: variant.inventory,
      currentStock: newCurrent
    });
  } catch (err) {
    console.error('Failed to update variant stock', err);
  }
};

const updateProductStock = async (productId, qty, type = 'reserve') => {
  try {
    const inventory = await Inventory.findOne({ product: productId });
    if (!inventory) return;

    if (type === 'reserve') {
      // For simple products, we just decrement stockQuantity when reserved/purchased
      inventory.stockQuantity = Math.max(0, inventory.stockQuantity - qty);
    } else if (type === 'refund' || type === 'cancel') {
      inventory.stockQuantity = inventory.stockQuantity + qty;
    }

    await inventory.save();
  } catch (err) {
    console.error('Failed to update product inventory stock', err);
  }
};

// Fix #6: Extracted to module-level to avoid duplication in updateOrderStatus & updateOrderDetails
const STATUS_WEIGHTS = {
  'Pending': 0,
  'Placed': 1,
  'Packed': 2,
  'Shipping': 3,
  'Out for delivery': 4,
  'Delivered': 5,
  'Cancelled': 99
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
      fees,
      isGiftOrder,
      giftMessage,
      giftMessageStyle,
      scheduledDeliveryDate,
      deliveryDate,
      giftWrapFee
    } = req.body;

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ message: 'No order items' });
    }

    // Inline Validation for Shipping Address
    if (!shippingAddress || !shippingAddress.address || !shippingAddress.city || !shippingAddress.state || !shippingAddress.pinCode) {
      return res.status(400).json({ message: 'Complete shipping address is required (address, city, state, pinCode)' });
    }
    if (!shippingAddress.phone || !/^\d{10}$/.test(shippingAddress.phone)) {
      return res.status(400).json({ message: 'A valid 10-digit phone number is required for shipping' });
    }

    if (true) { // keeping the else block structure
      const giftOrderItem = orderItems?.find((item) => item.isGift);
      const normalizedDeliveryDate = normalizeDeliveryDate(
        deliveryDate
        ?? scheduledDeliveryDate
        ?? giftOrderItem?.deliveryDate
        ?? giftOrderItem?.scheduledDeliveryDate
      );
      if (normalizedDeliveryDate === undefined) {
        return res.status(400).json({ message: 'Delivery date must be a valid date' });
      }

      const configuredFees = await Fee.find({ active: true })
        .populate('feeCategory', 'name')
        .populate('paymentMethod', 'name')
        .lean();

      // Calculate total cart volume by fetching dimensions from DB (same as cartController).
      // req.body.orderItems never carry dimensions, so we must look them up.
      let totalCartVolume = 0;
      await Promise.all(orderItems.map(async (item) => {
        const qty = Number(item.qty) || 1;
        let length = 0, width = 0, height = 0;

        // Try variant dimensions first
        if (item.variant) {
          try {
            const variant = await ProductVariant.findById(item.variant).lean();
            if (variant) {
              length = Number(variant.length) || 0;
              width  = Number(variant.width)  || 0;
              height = Number(variant.height) || 0;
            }
          } catch (_) {}
        }

        // Fallback to product dimensions
        if (!(length > 0 && width > 0 && height > 0) && item.product) {
          try {
            const product = await Product.findById(item.product).lean();
            if (product) {
              length = Number(product.dimensions?.length) || 0;
              width  = Number(product.dimensions?.width)  || 0;
              height = Number(product.dimensions?.height) || 0;
              // Some products store a pre-computed volume field
              if (!(length > 0 && width > 0 && height > 0) && Number(product.volume) > 0) {
                totalCartVolume += Number(product.volume) * qty;
                return;
              }
            }
          } catch (_) {}
        }

        if (length > 0 && width > 0 && height > 0) {
          totalCartVolume += length * width * height * qty;
        }
      }));

      let productFeeRule = await ProductFeeRule.findOne({
        isActive: true,
        minVolume: { $lte: totalCartVolume },
        maxVolume: { $gte: totalCartVolume }
      }).lean();

      let dynamicProductFee = 0;
      let dynamicBoxSize = '';

      if (productFeeRule) {
        dynamicProductFee = productFeeRule.productFee || 0;
        dynamicBoxSize = productFeeRule.boxSize || '';
      } else {
        const highestRule = await ProductFeeRule.findOne({ isActive: true })
          .sort({ maxVolume: -1 })
          .lean();
        if (highestRule && totalCartVolume > highestRule.maxVolume) {
          const factor = Math.ceil(totalCartVolume / (highestRule.maxVolume || 1));
          dynamicProductFee = (Number(highestRule.productFee) || 0) * factor;
          dynamicBoxSize = highestRule.boxSize || '';
        }
      }

      let giftToggle = req.body.giftWrapping?.enabled;
      let giftFee = 0;
      if (giftToggle === true && orderItems.length > 0) {
        let giftBoxRule = await require('../models/GiftBoxRule').findOne({
          isActive: true,
          minVolume: { $lte: totalCartVolume },
          maxVolume: { $gte: totalCartVolume }
        }).lean();

        if (giftBoxRule) {
          giftFee = Number(giftBoxRule.fee) || 0;
        } else {
          // Fallback for gift fee if volume exceeds max
          const highestGiftRule = await require('../models/GiftBoxRule').findOne({ isActive: true })
            .sort({ maxVolume: -1 })
            .lean();
          
          if (highestGiftRule && totalCartVolume > highestGiftRule.maxVolume) {
            const factor = Math.ceil(totalCartVolume / (highestGiftRule.maxVolume || 1));
            giftFee = (Number(highestGiftRule.fee) || 0) * factor;
          } else if (highestGiftRule) {
             giftFee = Number(highestGiftRule.fee) || 0;
          } else {
             // absolute fallback to static config if no rules exist
             const giftConfig = await require('../models/GiftCardConfig').findOne().lean();
             if (giftConfig && giftConfig.giftWrapFee) {
               giftFee = Number(giftConfig.giftWrapFee);
             }
          }
        }
      }

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

      // Start with applied fees from global fee rules
      let resolvedFees = [...(feeSummary.appliedFees || [])];

      if (feeSummary.isFreeShipping) {
        resolvedFees.push({ name: 'Shipping Fee', amount: 0, isFree: true });
      }

      // Inject the matched Product Fee into the fees array
      if (dynamicProductFee > 0) {
        resolvedFees.unshift({ name: 'Product Volume Fee', amount: dynamicProductFee });
        feeSummary.productFee = dynamicProductFee;
      }

      // Inject the matched Gift Fee into the fees array
      if (giftFee > 0) {
        resolvedFees.push({
          name: 'Gift Wrap Fee',
          amount: giftFee
        });
        feeSummary.giftFee = giftFee;
      }

      // Always use backend-calculated fees from resolvedFees — never trust the
      // client-supplied pricing snapshot, which could cause double-counting of
      // the weight/shipping fee (Cashfree amount mismatch).
      const pricing = buildPricingSnapshot({
        pricing: {},
        subtotal,
        discountAmount: req.body.discountAmount,
        fees: resolvedFees,
        shippingPrice: 0,
        codAdvance: req.body.codAdvance ?? feeSummary.codAdvance,
        paymentMethod,
      });
      console.debug('[order pricing]', {
        subtotal: pricing.subtotal,
        coupon_discount: pricing.coupon_discount,
        product_fee: pricing.product_fee,
        gift_fee: pricing.gift_fee,
        shipping_fee: pricing.shipping_fee,
        weight_fee: pricing.weight_fee,
        platform_fee: pricing.platform_fee,
        calculated_grand_total: pricing.total_amount,
      });

      const order = new Order({
        orderItems,
        user: req.user._id,
        shippingAddress,
        paymentMethod,
        itemsPrice: pricing.subtotal,
        taxPrice,
        shippingPrice: pricing.shipping_fee + pricing.weight_fee,
        totalPrice: pricing.total_amount,
        codAdvance: pricing.advance_payment,
        balanceAmount: pricing.balance_amount,
        orderNotes,
        fees: resolvedFees,
        couponCode: req.body.couponCode || null,
        discountAmount: pricing.coupon_discount,
        coupon: null,
        isGiftOrder: isGiftOrder || false,
        giftMessage: giftMessage ?? giftOrderItem?.giftMessage ?? '',
        giftMessageStyle: giftMessageStyle ?? giftOrderItem?.giftMessageStyle ?? 'Classic',
        deliveryDate: normalizedDeliveryDate,
        scheduledDeliveryDate: normalizedDeliveryDate,
        giftWrapFee: pricing.gift_fee || giftFee || 0,
        giftWrapping: {
          enabled: giftToggle === true,
          volume: totalCartVolume || 0,
          boxSize: dynamicBoxSize || '',
          giftFee: pricing.gift_fee || giftFee || 0,
        },
        total_cart_volume: totalCartVolume,
        matched_box_size: dynamicBoxSize,
        product_fee: pricing.product_fee || dynamicProductFee || 0,
        gift_fee: pricing.gift_fee || giftFee || 0,
        delivery_charge: pricing.shipping_fee + pricing.weight_fee,
        discount: pricing.coupon_discount,
        grand_total: pricing.total_amount,
        gift_toggle: giftToggle,
        ...pricing,
      });

      // If a couponCode was provided, attempt to link the coupon ObjectId for stronger referential integrity
      if (order.couponCode) {
        try {
          const Coupon = require('../models/Coupon');
          const normalized = String(order.couponCode || '').trim().toUpperCase();
          const found = await Coupon.findOne({ couponCode: normalized, deleted: false });
          if (found) {
            order.coupon = found._id;
            // For COD orders: consume coupon immediately since payment is deferred.
            // For Cashfree orders: coupon is consumed in the payment callback after verification.
            if (req.body.paymentMethod === 'COD') {
              found.usageCount = (Number(found.usageCount) || 0) + 1;
              await found.save();
            }
          }
        } catch (err) {
          console.error('Failed to link coupon to order:', err.message || err);
        }
      }

      const createdOrder = await order.save();
      console.debug('[order pricing saved]', {
        subtotal: createdOrder.subtotal,
        coupon_discount: createdOrder.coupon_discount,
        product_fee: createdOrder.product_fee,
        gift_fee: createdOrder.gift_fee,
        platform_fee: createdOrder.platform_fee,
        shipping_fee: createdOrder.shipping_fee,
        weight_fee: createdOrder.weight_fee,
        grand_total: createdOrder.total_amount,
      });

      // Reserve stock when order is placed
      for (const item of createdOrder.orderItems) {
        if (item.variant) {
          await updateVariantStock(item.variant, item.qty, 'reserve');
        } else if (item.product) {
          await updateProductStock(item.product, item.qty, 'reserve');
        }
      }

      // Clear the cart if this is a COD order (for Cashfree, cart is cleared in verifyPayment after success)
      if (req.body.paymentMethod === 'COD') {
        try {
          const Cart = require('../models/Cart');
          await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });
        } catch (cartErr) {
          console.error('Failed to clear cart after COD order:', cartErr);
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
      const totalAmount = Number(order.total_amount || order.totalPrice || 0);
      const advancePayment = Number(order.advance_payment || order.codAdvance || 0);
      const isCodAdvancePayment = order.paymentMethod === 'COD';
      const paidAmount = isCodAdvancePayment ? Math.min(advancePayment, totalAmount) : totalAmount;
      order.isPaid = !isCodAdvancePayment || paidAmount >= totalAmount;
      order.paidAt = Date.now();
      order.paymentResult = {
        id: req.body.id,
        status: req.body.status,
        update_time: req.body.update_time,
        email_address: req.body.email_address,
      };
      order.status = 'Packed';
      order.paid_amount = paidAmount;
      order.balance_amount = Math.max(0, totalAmount - paidAmount);
      order.balanceAmount = order.balance_amount;

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
      'Packed',
      'Shipping',
      'Out for delivery',
      'Delivered',
      'Cancelled',
      'Pending',
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid order status' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Fix #6: Use module-level STATUS_WEIGHTS
    const currentWeight = STATUS_WEIGHTS[order.status] || 0;
    const newWeight = STATUS_WEIGHTS[status] || 0;

    if (status === 'Cancelled' && order.status === 'Delivered') {
      return res.status(400).json({ message: 'Cannot cancel a delivered order' });
    }

    // Fix #7: Correct error message for already-cancelled orders
    if (status === 'Cancelled' && currentWeight === 99) {
      return res.status(400).json({ message: 'Order is already cancelled' });
    }

    if (status !== 'Cancelled' && newWeight > currentWeight + 1) {
      return res.status(400).json({ message: 'Please update order status step by step' });
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
        order.paid_amount = order.total_amount || order.totalPrice || 0;
        order.balance_amount = 0;
        order.balanceAmount = 0;
      }

      // Deduct stock when delivered
      for (const item of order.orderItems) {
        if (item.variant) {
          await updateVariantStock(item.variant, item.qty, 'deliver');
        } else if (item.product) {
          await updateProductStock(item.product, item.qty, 'deliver');
        }
      }
    }

    if (status === 'Cancelled' && currentWeight !== 99) {
      // Leave stock in reserve until the admin processes the refund.
      // The actual inventory restoration will happen in the refund controller.
      // (No stock changes here)
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
// Fix #1: updateOrderToDelivered now deducts stock consistently (same as updateOrderStatus)
const updateOrderToDelivered = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Only deduct stock if not already delivered to prevent double deduction
    if (order.status !== 'Delivered') {
      for (const item of order.orderItems) {
        if (item.variant) {
          await updateVariantStock(item.variant, item.qty, 'deliver');
        } else if (item.product) {
          await updateProductStock(item.product, item.qty, 'deliver');
        }
      }
    }

    order.isDelivered = true;
    order.deliveredAt = Date.now();
    order.status = 'Delivered';

    if (order.paymentMethod === 'COD' && !order.isPaid) {
      order.isPaid = true;
      order.paidAt = Date.now();
      order.paid_amount = order.total_amount || order.totalPrice || 0;
      order.balance_amount = 0;
      order.balanceAmount = 0;
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

    const { shippingAddress, status, isPaid, paymentMethod, trackingId, trackingUrl, courierName } = req.body;

    if (shippingAddress) {
      order.shippingAddress = shippingAddress;
    }

    if (trackingId !== undefined) {
      order.trackingId = trackingId;
    }
    if (trackingUrl !== undefined) {
      order.trackingUrl = trackingUrl;
    }
    if (courierName !== undefined) {
      order.courierName = courierName;
    }

    if (status && status !== order.status) {
      // Fix #6: Use module-level STATUS_WEIGHTS
      const currentWeight = STATUS_WEIGHTS[order.status] || 0;
      const newWeight = STATUS_WEIGHTS[status] || 0;

      if (status === 'Cancelled') {
        if (order.status === 'Delivered') {
          return res.status(400).json({ message: 'Cannot cancel a delivered order' });
        }
        // Fix #7: Distinct message for already-cancelled orders
        if (order.status === 'Cancelled') {
          return res.status(400).json({ message: 'Order is already cancelled' });
        }
      } else if (newWeight < currentWeight) {
        return res.status(400).json({ message: 'Cannot move order status backwards' });
      } else if (newWeight > currentWeight + 1) {
        return res.status(400).json({ message: 'Please update order status step by step' });
      }

      order.status = status;
      if (status === 'Delivered' && !order.isDelivered) {
        order.isDelivered = true;
        order.deliveredAt = Date.now();
        // Deduct stock when marking Delivered via edit modal
        for (const item of order.orderItems) {
          if (item.variant) {
            await updateVariantStock(item.variant, item.qty, 'deliver');
          } else if (item.product) {
            await updateProductStock(item.product, item.qty, 'deliver');
          }
        }
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

    // Fix #2: Use dynamic advance payment from order data — never hardcode ₹200
    const amountPaid = order.paymentMethod === 'COD'
      ? (Number(order.advance_payment) || Number(order.codAdvance) || 0)
      : (Number(order.total_amount) || Number(order.totalPrice) || 0);
    const estimatedRefund = Math.max(0, amountPaid - cancellationFee);

    res.json({
      orderId: order._id,
      items: order.orderItems,
      shippingAndFees: (order.shippingPrice || 0) + (order.taxPrice || 0),
      totalOrderAmount: Number(order.total_amount) || Number(order.totalPrice) || 0,
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

    // Fix #2: Use dynamic advance payment from order data — never hardcode ₹200
    const amountPaid = order.paymentMethod === 'COD'
      ? (Number(order.advance_payment) || Number(order.codAdvance) || 0)
      : (Number(order.total_amount) || Number(order.totalPrice) || 0);
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

    // Leave stock in reserve until the admin processes the refund.
    // The actual inventory restoration will happen in the refund controller.
    // (No stock changes here)

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
    const days = req.query.days === 'all' ? null : (parseInt(req.query.days) || 30);

    let dateFilter = {};
    if (days !== null) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (days - 1));
      startDate.setHours(0, 0, 0, 0);
      dateFilter = { createdAt: { $gte: startDate } };
    }

    const totalOrders = await Order.countDocuments(dateFilter);
    // Since Customers aren't easily filtered by order date, we either show all or just filter users by registration date
    const totalCustomers = await User.countDocuments({ role: 'user', ...dateFilter });
    const totalProducts = await Product.countDocuments(dateFilter);

    // Revenue logic: sum of all paid orders
    const orders = await Order.find({ isPaid: true, ...dateFilter });
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);

    // Revenue analytics: daily revenue
    // For 'all' time, maybe just show last 30 days of graph, or we could group by month.
    // For simplicity, we limit the chart to the requested 'days', or 30 if 'all' is selected.
    const chartDays = days || 30;
    const chartStartDate = new Date();
    chartStartDate.setDate(chartStartDate.getDate() - (chartDays - 1));
    chartStartDate.setHours(0, 0, 0, 0);

    const recentOrders = await Order.find({
      isPaid: true,
      createdAt: { $gte: chartStartDate }
    });

    const revenueByDate = {};
    for (let i = chartDays - 1; i >= 0; i--) {
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
    const allOrders = await Order.find(dateFilter);
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
            await updateProductStock(item.product, item.qty, 'cancel');
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

/**
 * @desc    Download order invoice as PDF
 * @route   GET /api/orders/:id/invoice
 * @access  Private (User can download own, admin can download any)
 */
const downloadInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check ownership or admin status
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view this invoice' });
    }

    const { generateInvoice } = require('../services/invoiceService');
    const pdfBuffer = await generateInvoice(order);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order._id}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('[Download Invoice] Error:', error);
    res.status(500).json({ message: 'Failed to generate invoice', error: error.message });
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
  downloadInvoice,
};

