const Cart = require('../models/Cart');
const Product = require('../models/Product');
const ProductVariant = require('../models/ProductVariant');
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

module.exports = {
  getCart,
  replaceCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  removeCartItemById,
  clearCart,
};
