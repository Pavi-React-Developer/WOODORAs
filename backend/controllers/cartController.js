const Cart = require('../models/Cart');
const Product = require('../models/Product');
const ProductVariant = require('../models/ProductVariant');
const ProductFeeRule = require('../models/ProductFeeRule');
const GiftCardConfig = require('../models/GiftCardConfig');
const Fee = require('../models/Fee');
const Coupon = require('../models/Coupon');
const { calculateOrderFees } = require('../utils/feeCalculator');
const { buildCartContext, isCouponApplicableToCart } = require('../controllers/couponController');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalize a cart item from request body into a consistent shape.
 */
const normalizeItem = (item = {}) => ({
  product: item.product,
  variant: item.variant || null,
  name: item.name,
  image: item.image || '',
  price: Number(item.price) || 0,
  weight: item.weight || '',
  qty: Math.max(1, Number(item.qty) || 1),
  maxStock: Number(item.maxStock) || 999,
  variantOptions: item.variantOptions || null,
  isGift: Boolean(item.isGift) || false,
  isGiftWrapper: item.isGiftWrapper !== undefined ? item.isGiftWrapper : true,
  giftMessage: item.giftMessage || null,
  giftCardStyle: item.giftCardStyle || null,
  deliveryDate: item.deliveryDate || item.scheduledDeliveryDate || null,
  scheduledDeliveryDate: item.scheduledDeliveryDate || null,
  giftBox: item.giftBox
    ? {
        volume: Number(item.giftBox.volume) || 0,
        boxSize: item.giftBox.boxSize || '',
        giftFee: Number(item.giftBox.giftFee) || 0,
      }
    : undefined,
  dimensions: item.dimensions
    ? {
        length: Number(item.dimensions.length) || 0,
        width: Number(item.dimensions.width) || 0,
        height: Number(item.dimensions.height) || 0,
      }
    : undefined,
});

/**
 * Get or create the cart document for a given user.
 */
const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
};

/**
 * Calculate live effective stock for a ProductVariant document.
 */
const getLiveStock = (variantDoc) => {
  const total = variantDoc.inventory ?? variantDoc.currentStock ?? 0;
  const reserved = variantDoc.reserveStock ?? 0;
  return Math.max(0, total - reserved);
};

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * @desc    Get logged-in user's cart (enriched with live prices)
 * @route   GET /api/cart
 * @access  Private
 */
const getCart = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user._id);

    // Enrich cart items with LIVE prices from the products/variants collections
    const enrichedItems = await Promise.all(
      cart.items.map(async (item) => {
        try {
          const obj = item.toObject ? item.toObject() : { ...item };
          if (item.variant) {
            const variant = await ProductVariant.findById(item.variant).lean();
            if (variant) {
              obj.price = variant.discountPrice ?? variant.basePrice ?? item.price;
              obj.maxStock = getLiveStock(variant);
              if (variant.length && variant.width && variant.height) {
                obj.dimensions = { length: variant.length, width: variant.width, height: variant.height };
              }
            }
          } else if (item.product) {
            const product = await Product.findById(item.product).lean();
            if (product) {
              obj.price = product.discountPrice ?? product.price ?? item.price;
              obj.name = product.name ?? item.name;
              if (!obj.dimensions && product.dimensions) {
                obj.dimensions = product.dimensions;
              }
            }
          }
          return obj;
        } catch {
          return item.toObject ? item.toObject() : { ...item };
        }
      })
    );

    res.json({ ...cart.toObject(), items: enrichedItems });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch cart' });
  }
};

/**
 * @desc    Replace logged-in user's entire cart (used for sync from frontend)
 * @route   PUT /api/cart
 * @access  Private
 */
const replaceCart = async (req, res) => {
  try {
    const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
    const validItems = [];

    for (const item of rawItems) {
      const normalized = normalizeItem(item);
      if (!normalized.product || !normalized.name) continue;

      let liveMaxStock = normalized.maxStock || 999;
      let isValid = false;

      if (normalized.variant) {
        // Item specifies a variant — validate it exists and is active
        const variantDoc = await ProductVariant.findById(normalized.variant).lean();
        if (variantDoc && variantDoc.isActive !== false) {
          liveMaxStock = getLiveStock(variantDoc);
          isValid = true;
        }
        // If variant not found or inactive, discard item (truly invalid)
      } else {
        // Item has no variant — accept it if the product exists.
        // We no longer reject no-variant items just because the product HAS variants,
        // because the cart stores a snapshot of what the user selected, not a live
        // product state. The frontend already enforces variant selection at add-time.
        const productDoc = await Product.findById(normalized.product).lean();
        if (productDoc) {
          liveMaxStock = normalized.maxStock || 999;
          isValid = true;
        }
      }

      if (isValid) {
        // Clamp quantity to max stock to correct old illegal amounts
        normalized.maxStock = liveMaxStock;
        if (liveMaxStock > 0) {
          normalized.qty = Math.min(normalized.qty, liveMaxStock);
        }
        if (normalized.qty < 1) normalized.qty = 1;
        validItems.push(normalized);
      }
    }

    const cart = await Cart.findOneAndUpdate(
      { user: req.user._id },
      { user: req.user._id, items: validItems },
      { returnDocument: 'after', upsert: true, runValidators: true }
    );
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to update cart' });
  }
};


/**
 * @desc    Add single item to cart with live stock validation
 * @route   POST /api/cart/items
 * @access  Private
 */
const addCartItem = async (req, res) => {
  try {
    const incoming = normalizeItem(req.body);
    if (!incoming.product || !incoming.name) {
      return res.status(400).json({ success: false, message: 'Product and name are required' });
    }

    // ── Live stock validation ─────────────────────────────────────────────
    let liveMaxStock = 999;
    let cachedVariantDoc = null; // Fix #8: cache to avoid double DB fetch

    if (incoming.variant) {
      cachedVariantDoc = await ProductVariant.findById(incoming.variant).lean();
      if (!cachedVariantDoc) {
        return res.status(404).json({ success: false, message: 'Variant not found' });
      }
      if (!cachedVariantDoc.isActive) {
        return res.status(400).json({ success: false, message: 'Variant is no longer available' });
      }
      liveMaxStock = getLiveStock(cachedVariantDoc);
    } else {
      const productDoc = await Product.findById(incoming.product).lean();
      if (!productDoc) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      liveMaxStock = incoming.maxStock; // Use frontend maxStock for non-variant products
    }


    // ── Get current cart and find existing item ───────────────────────────
    const cart = await getOrCreateCart(req.user._id);
    const existingItem = cart.items.find(
      (item) =>
        item.product.toString() === String(incoming.product) &&
        String(item.variant || '') === String(incoming.variant || '')
    );

    const currentQty = existingItem ? existingItem.qty : 0;
    const totalDesiredQty = currentQty + incoming.qty;

    if (totalDesiredQty > liveMaxStock) {
      return res.status(400).json({
        success: false,
        message: 'OUT_OF_STOCK',
        availableStock: liveMaxStock,
        currentCartQty: currentQty,
      });
    }

    // ── Apply update ──────────────────────────────────────────────────────
    if (existingItem) {
      existingItem.qty = totalDesiredQty;
      existingItem.isGift = incoming.isGift;
      // Persist all gift preference fields so they are saved to MongoDB
      existingItem.isGiftWrapper = incoming.isGiftWrapper !== undefined ? incoming.isGiftWrapper : existingItem.isGiftWrapper;
      existingItem.giftMessage = incoming.giftMessage !== undefined ? incoming.giftMessage : existingItem.giftMessage;
      existingItem.giftCardStyle = incoming.giftCardStyle !== undefined ? incoming.giftCardStyle : existingItem.giftCardStyle;
      existingItem.deliveryDate = incoming.deliveryDate !== undefined ? incoming.deliveryDate : existingItem.deliveryDate;
      existingItem.scheduledDeliveryDate = incoming.scheduledDeliveryDate !== undefined ? incoming.scheduledDeliveryDate : existingItem.scheduledDeliveryDate;
      if (incoming.giftBox) existingItem.giftBox = incoming.giftBox;
    } else {
      cart.items.push({ ...incoming, maxStock: liveMaxStock });
    }

    await cart.save();
    res.status(201).json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to add cart item' });
  }
};

/**
 * @desc    Update a cart item quantity with live stock validation
 * @route   PUT /api/cart/items/:productId
 * @access  Private
 */
const updateCartItem = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    const variantId = req.body?.variant || null;
    const qty = Math.max(1, Number(req.body?.qty) || 1);

    const item = cart.items.find(
      (cartItem) =>
        cartItem.product.toString() === req.params.productId &&
        String(cartItem.variant || '') === String(variantId || '')
    );

    if (!item) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    // ── Live stock validation ─────────────────────────────────────────────
    let liveMaxStock = item.maxStock || 999;

    if (variantId) {
      const variantDoc = await ProductVariant.findById(variantId).lean();
      if (variantDoc) {
        liveMaxStock = getLiveStock(variantDoc);
      }
    }

    if (qty > liveMaxStock) {
      return res.status(400).json({
        success: false,
        message: 'OUT_OF_STOCK',
        availableStock: liveMaxStock,
      });
    }

    item.qty = qty;
    item.maxStock = liveMaxStock; // Keep maxStock fresh
    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to update cart item' });
  }
};

/**
 * @desc    Remove a specific cart item
 * @route   DELETE /api/cart/items/:productId
 * @access  Private
 */
const removeCartItem = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    const variantId = req.query?.variant || null;

    cart.items = cart.items.filter(
      (item) =>
        !(
          item.product.toString() === req.params.productId &&
          String(item.variant || '') === String(variantId || '')
        )
    );

    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to remove cart item' });
  }
};

/**
 * @desc    Remove a specific cart item by its MongoDB subdocument _id
 * @route   DELETE /api/cart/item/:itemId
 * @access  Private
 */
const removeCartItemById = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    const { itemId } = req.params;

    const originalLength = cart.items.length;
    // Filter by the subdocument's own _id for precise removal
    cart.items = cart.items.filter(
      (item) => item._id?.toString() !== itemId
    );

    if (cart.items.length === originalLength) {
      return res.status(404).json({ success: false, message: 'Cart item not found' });
    }

    await cart.save();
    res.json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to remove cart item' });
  }
};

/**
 * @desc    Clear entire cart for the logged-in user
 * @route   DELETE /api/cart
 * @access  Private
 */
const clearCart = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    cart.items = [];
    await cart.save();
    res.json({ success: true, cart });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to clear cart' });
  }
};

/**
 * @desc    Get dynamic cart summary including product fee, gift fee, delivery charge, and discount
 * @route   POST /api/cart/summary
 * @access  Private
 */
const getCartSummary = async (req, res) => {
  try {
    const { isGiftEnabled, state, paymentMethod, couponCode, items } = req.body;
    
    // 1. Get enriched cart items
    let cartItems = [];
    if (req.user) {
      const cart = await getOrCreateCart(req.user._id);
      cartItems = cart.items;
    } else if (items && Array.isArray(items)) {
      cartItems = items;
    }

    const enrichedItems = await Promise.all(
      cartItems.map(async (item) => {
        try {
          const obj = item.toObject ? item.toObject() : { ...item };
          if (item.variant) {
            const variant = await ProductVariant.findById(item.variant).lean();
            if (variant) {
              obj.price = variant.discountPrice ?? variant.basePrice ?? item.price;
              if (variant.length && variant.width && variant.height) {
                obj.dimensions = { length: variant.length, width: variant.width, height: variant.height };
              }
            }
          } else if (item.product) {
            const product = await Product.findById(item.product).lean();
            if (product) {
              obj.price = product.discountPrice ?? product.price ?? item.price;
              obj.name = product.name ?? item.name;
              if (!obj.dimensions && product.dimensions) {
                obj.dimensions = product.dimensions;
              }
            }
          }
          return obj;
        } catch {
          return item.toObject ? item.toObject() : { ...item };
        }
      })
    );

    // 2. Subtotal & Volume
    let subtotal = 0;
    let cartVolume = 0;
    enrichedItems.forEach(item => {
      const qty = Number(item.qty) || 1;
      const price = Number(item.price) || 0;
      subtotal += price * qty;

      const length = Number(item.dimensions?.length) || 0;
      const width = Number(item.dimensions?.width) || 0;
      const height = Number(item.dimensions?.height) || 0;
      if (length > 0 && width > 0 && height > 0) {
        cartVolume += (length * width * height * qty);
      } else if (item.volume && Number(item.volume) > 0) {
        cartVolume += (Number(item.volume) * qty);
      }
    });

    // 3. Product Fee
    let productFee = 0;
    let matchedBoxSize = '';
    if (enrichedItems.length > 0) {
      let productFeeRule = await ProductFeeRule.findOne({
        isActive: true,
        minVolume: { $lte: cartVolume },
        maxVolume: { $gte: cartVolume }
      }).lean();

      if (productFeeRule) {
        productFee = Number(productFeeRule.productFee) || 0;
        matchedBoxSize = productFeeRule.boxSize || '';
      } else {
        // If volume exceeds the max defined slab, scale it dynamically
        const highestRule = await ProductFeeRule.findOne({ isActive: true })
          .sort({ maxVolume: -1 })
          .lean();
        
        if (highestRule && cartVolume > highestRule.maxVolume) {
          const factor = Math.ceil(cartVolume / (highestRule.maxVolume || 1));
          productFee = (Number(highestRule.productFee) || 0) * factor;
          matchedBoxSize = highestRule.boxSize || '';
        }
      }
    }

    // 4. Gift Fee (Dynamically calculated based on GiftBoxRule and cartVolume)
    let giftFee = 0;
    if (isGiftEnabled === true && enrichedItems.length > 0) {
      let giftBoxRule = await require('../models/GiftBoxRule').findOne({
        isActive: true,
        minVolume: { $lte: cartVolume },
        maxVolume: { $gte: cartVolume }
      }).lean();

      if (giftBoxRule) {
        giftFee = Number(giftBoxRule.fee) || 0;
      } else {
        // Fallback for gift fee if volume exceeds max
        const highestGiftRule = await require('../models/GiftBoxRule').findOne({ isActive: true })
          .sort({ maxVolume: -1 })
          .lean();
        
        if (highestGiftRule && cartVolume > highestGiftRule.maxVolume) {
          const factor = Math.ceil(cartVolume / (highestGiftRule.maxVolume || 1));
          giftFee = (Number(highestGiftRule.fee) || 0) * factor;
        } else if (highestGiftRule) {
           giftFee = Number(highestGiftRule.fee) || 0;
        } else {
           // absolute fallback to static config if no rules exist
           const giftConfig = await GiftCardConfig.findOne().lean();
           if (giftConfig && giftConfig.giftWrapFee) {
             giftFee = Number(giftConfig.giftWrapFee);
           }
        }
      }
    }

    // 5. Delivery Charge & COD Advance & Extra Global Fees
    let deliveryCharge = 0;
    let codAdvance = 0;
    let extraFeesList = [];
    let isFreeShipping = false;
    if (state && enrichedItems.length > 0) {
      const configuredFees = await Fee.find({ active: true })
        .populate('feeCategory', 'name')
        .populate('paymentMethod', 'name')
        .lean();
        
      const feeSummary = calculateOrderFees({
        fees: configuredFees,
        subtotal,
        items: enrichedItems,
        state,
        paymentMethod: paymentMethod || ''
      });
      deliveryCharge = Number(feeSummary.shippingCharge) || 0;
      codAdvance = Number(feeSummary.codAdvance) || 0;
      extraFeesList = feeSummary.extraFeesList || [];
      isFreeShipping = feeSummary.isFreeShipping || false;
    }

    // 6. Discount
    let discount = 0;
    if (couponCode && enrichedItems.length > 0) {
      const normalizedCode = String(couponCode).trim().toUpperCase();
      const coupon = await Coupon.findOne({ couponCode: normalizedCode, deleted: false, status: 'active' });
      if (coupon) {
        const cartContext = await buildCartContext(enrichedItems);
        if (isCouponApplicableToCart(coupon, cartContext) && subtotal >= Number(coupon.minOrderValue || 0)) {
          if (coupon.discountType === 'Percentage') {
            discount = Math.min((subtotal * Number(coupon.discountValue)) / 100, Number(coupon.maxDiscount || 0));
          } else {
            discount = Math.min(Number(coupon.discountValue), Number(coupon.maxDiscount || Number(coupon.discountValue)));
          }
        }
      }
    }

    // 7. Consolidate Applied Fees array
    const appliedFees = [];
    
    // Add Product Volume Fee
    if (productFee > 0) {
      appliedFees.push({ name: 'Product Volume Fee', amount: productFee });
    }
    
    // Add Gift Wrap Fee
    if (giftFee > 0) {
      appliedFees.push({ name: 'Gift Wrap Fee', amount: giftFee });
    }

    // Add Global Fees (Tax, Platform, Shipping/Weight) from feeSummary
    let feeSummaryAppliedFees = [];
    if (state && enrichedItems.length > 0) {
      const configuredFees = await Fee.find({ active: true })
        .populate('feeCategory', 'name')
        .populate('paymentMethod', 'name')
        .lean();
      const feeSummary = calculateOrderFees({
        fees: configuredFees,
        subtotal,
        items: enrichedItems,
        state,
        paymentMethod: paymentMethod || ''
      });
      feeSummaryAppliedFees = feeSummary.appliedFees || [];
      if (feeSummary.isFreeShipping && !feeSummaryAppliedFees.some(f => f.name.toLowerCase().includes('shipping') && f.isFree)) {
        feeSummaryAppliedFees.push({ name: 'Shipping Charge', amount: 0, isFree: true });
      }
    }
    
    feeSummaryAppliedFees.forEach(fee => {
      appliedFees.push(fee);
    });

    // Calculate Grand Total (exclude advance since it is a payment)
    const sumOfAppliedFees = appliedFees.reduce((acc, curr) => acc + curr.amount, 0);
    const grandTotal = Math.max(0, subtotal + sumOfAppliedFees - discount);

    res.json({
      subtotal,
      cartVolume,
      matchedBoxSize,
      productFee,
      giftFee,
      deliveryCharge,
      codAdvance,
      discount,
      appliedFees,
      grandTotal
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch cart summary' });
  }
};

module.exports = {
  getCart,
  replaceCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  removeCartItemById,
  clearCart,
  getCartSummary,
};
