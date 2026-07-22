const express = require('express');
const router = express.Router();
const {
  getProductFeeRules,
  createProductFeeRule,
  updateProductFeeRule,
  deleteProductFeeRule
} = require('../controllers/productFeeRuleController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(getProductFeeRules)
  .post(protect, authorize('admin'), createProductFeeRule);

router.route('/:id')
  .put(protect, authorize('admin'), updateProductFeeRule)
  .delete(protect, authorize('admin'), deleteProductFeeRule);

module.exports = router;
