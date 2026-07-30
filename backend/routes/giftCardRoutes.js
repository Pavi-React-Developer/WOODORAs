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
  getUserMessages,
  getGiftBoxRules,
  createGiftBoxRule,
  updateGiftBoxRule,
  deleteGiftBoxRule
} = require('../controllers/giftCardController');

// Admin routes
router.get('/config', getConfig);
router.put('/config', protect, admin, updateConfig);
router.get('/admin/orders', protect, admin, getAdminGiftOrders);
router.get('/admin/messages', protect, admin, getAdminMessages);

router.get('/admin/box-rules', protect, admin, getGiftBoxRules);
router.post('/admin/box-rules', protect, admin, createGiftBoxRule);
router.put('/admin/box-rules/:id', protect, admin, updateGiftBoxRule);
router.delete('/admin/box-rules/:id', protect, admin, deleteGiftBoxRule);

// User routes
router.get('/myorders', protect, getUserGiftOrders);
router.post('/messages', protect, createMessage);
router.get('/messages/my', protect, getUserMessages);

module.exports = router;
