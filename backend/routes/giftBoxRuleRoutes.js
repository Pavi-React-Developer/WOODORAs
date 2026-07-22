const express = require('express');
const router = express.Router();
const {
  getGiftBoxRules,
  createGiftBoxRule,
  updateGiftBoxRule,
  deleteGiftBoxRule
} = require('../controllers/giftBoxRuleController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(getGiftBoxRules)
  .post(protect, authorize('admin'), createGiftBoxRule);

router.route('/:id')
  .put(protect, authorize('admin'), updateGiftBoxRule)
  .delete(protect, authorize('admin'), deleteGiftBoxRule);

module.exports = router;
