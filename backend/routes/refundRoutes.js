const express = require('express');
const router = express.Router();
const { getRefunds, seedRefunds, approveRefund } = require('../controllers/refundController');
const { getMyRefunds } = require('../controllers/userRefundController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, authorize('admin'), getRefunds);

router.route('/seed')
  .post(protect, authorize('admin'), seedRefunds);

router.route('/:id/approve')
  .put(protect, authorize('admin'), approveRefund);

router.route('/my')
  .get(protect, getMyRefunds);

module.exports = router;
