const express = require('express');
const router = express.Router();
const { getRefunds, seedRefunds, approveRefund, processRefund } = require('../controllers/refundController');
const { getMyRefunds } = require('../controllers/userRefundController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, authorize('admin'), getRefunds);

router.route('/seed')
  .post(protect, authorize('admin'), seedRefunds);

router.route('/my')
  .get(protect, getMyRefunds);

router.route('/:id/approve')
  .put(protect, authorize('admin'), approveRefund);

router.route('/:id/process')
  .put(protect, authorize('admin'), processRefund);

module.exports = router;
