const express = require('express');
const router = express.Router();
const {
  getCart,
  replaceCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  removeCartItemById,
  clearCart,
  getCartSummary,
} = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware');

// GET  /api/cart         → fetch user's cart
// PUT  /api/cart         → replace entire cart (sync)
// DELETE /api/cart       → clear entire cart
router.route('/')
  .get(protect, getCart)
  .put(protect, replaceCart)
  .delete(protect, clearCart);

router.route('/summary').post(protect, getCartSummary);

// POST /api/cart/items   → add item (increments qty if exists)
router.route('/items')
  .post(protect, addCartItem);

// PUT    /api/cart/items/:productId  → update item quantity by productId
// DELETE /api/cart/items/:productId  → remove item by productId + variant query
router.route('/items/:productId')
  .put(protect, updateCartItem)
  .delete(protect, removeCartItem);

// DELETE /api/cart/item/:itemId → remove by MongoDB subdocument _id (preferred, precise)
router.delete('/item/:itemId', protect, removeCartItemById);

module.exports = router;
