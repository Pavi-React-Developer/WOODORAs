const Cart = require('../models/Cart');

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
});

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
};

// @desc    Get logged-in user's cart
// @route   GET /api/cart
// @access  Private
const getCart = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch cart' });
  }
};

// @desc    Replace logged-in user's cart
// @route   PUT /api/cart
// @access  Private
const replaceCart = async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items.map(normalizeItem).filter(item => item.product && item.name) : [];
    const cart = await Cart.findOneAndUpdate(
      { user: req.user._id },
      { user: req.user._id, items },
      { returnDocument: 'after', upsert: true, runValidators: true }
    );
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to update cart' });
  }
};

// @desc    Add item to cart
// @route   POST /api/cart/items
// @access  Private
const addCartItem = async (req, res) => {
  try {
    const incoming = normalizeItem(req.body);
    if (!incoming.product || !incoming.name) {
      return res.status(400).json({ message: 'Product and name are required' });
    }

    const cart = await getOrCreateCart(req.user._id);
    const existingItem = cart.items.find(
      item => item.product.toString() === incoming.product.toString() && String(item.variant || '') === String(incoming.variant || '')
    );

    if (existingItem) {
      existingItem.qty += incoming.qty;
    } else {
      cart.items.push(incoming);
    }

    await cart.save();
    res.status(201).json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to add cart item' });
  }
};

// @desc    Update a cart item quantity
// @route   PUT /api/cart/items/:productId
// @access  Private
const updateCartItem = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    const variant = req.body?.variant || null;
    const qty = Math.max(1, Number(req.body?.qty) || 1);
    const item = cart.items.find(
      cartItem => cartItem.product.toString() === req.params.productId && String(cartItem.variant || '') === String(variant || '')
    );

    if (!item) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    item.qty = qty;
    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to update cart item' });
  }
};

// @desc    Remove cart item
// @route   DELETE /api/cart/items/:productId
// @access  Private
const removeCartItem = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    const variant = req.query?.variant || null;
    cart.items = cart.items.filter(
      item => !(item.product.toString() === req.params.productId && String(item.variant || '') === String(variant || ''))
    );
    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to remove cart item' });
  }
};

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
const clearCart = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    cart.items = [];
    await cart.save();
    res.json(cart);
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
  clearCart,
};
