const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const admin = authorize('admin');
const {
  getConfig,
  updateConfig,
  getAdminGiftOrders,
  getUserGiftOrders,
  createMessage,
  getAdminMessages,
  getUserMessages
} = require('../controllers/giftCardController');

// Admin routes
router.get('/config', getConfig);
router.put('/config', protect, admin, updateConfig);
router.get('/admin/orders', protect, admin, getAdminGiftOrders);
router.get('/admin/messages', protect, admin, getAdminMessages);

// User routes
router.get('/myorders', protect, getUserGiftOrders);
router.post('/messages', protect, createMessage);
router.get('/messages/my', protect, getUserMessages);

module.exports = router;
