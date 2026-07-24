const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
  createBulkOrder,
  getAllBulkOrders,
  getMyBulkOrders,
  updateBulkOrderStatus
} = require('../controllers/bulkOrderController');

const {
  getAllFields,
  createField,
  updateField,
  deleteField
} = require('../controllers/bulkOrderFieldController');

// Field routes
router.route('/fields')
  .get(getAllFields)
  .post(protect, authorize('admin'), createField);

router.route('/fields/:id')
  .put(protect, authorize('admin'), updateField)
  .delete(protect, authorize('admin'), deleteField);

router.route('/')
  .post(protect, createBulkOrder)
  .get(protect, authorize('admin'), getAllBulkOrders);

router.get('/my-requests', protect, getMyBulkOrders);

router.put('/:id/status', protect, authorize('admin'), updateBulkOrderStatus);

module.exports = router;
