const express = require('express');
const router = express.Router();
const {
  getRules,
  createRule,
  updateRule,
  deleteRule
} = require('../controllers/productFeeController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(getRules)
  .post(protect, authorize('admin', 'manager'), createRule);

router.route('/:id')
  .put(protect, authorize('admin', 'manager'), updateRule)
  .delete(protect, authorize('admin', 'manager'), deleteRule);

module.exports = router;
