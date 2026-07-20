const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  createBulkOrder,
  getAllBulkOrders,
  getMyBulkOrders,
  updateBulkOrderStatus
} = require('../controllers/bulkOrderController');

router.route('/')
  .post(protect, createBulkOrder)
  .get(protect, authorize('admin'), getAllBulkOrders);

router.get('/my-requests', protect, getMyBulkOrders);

router.put('/:id/status', protect, authorize('admin'), updateBulkOrderStatus);

module.exports = router;
