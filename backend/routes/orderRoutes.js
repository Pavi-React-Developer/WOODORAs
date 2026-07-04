const express = require('express');
const router = express.Router();
const {
  addOrderItems,
  getOrderById,
  updateOrderToPaid,
  updateOrderStatus,
  updateOrderToDelivered,
  getMyOrders,
  getOrders,
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, addOrderItems)
  .get(protect, authorize('admin', 'manager', 'staff'), getOrders); // Admin/staff can view all orders based on their module access

router.route('/myorders').get(protect, getMyOrders);

router.route('/:id').get(protect, getOrderById);

router.route('/:id/pay').put(protect, updateOrderToPaid);

router.route('/:id/status').put(protect, authorize('admin', 'manager', 'staff'), updateOrderStatus);

router.route('/:id/deliver').put(protect, authorize('admin', 'manager', 'staff'), updateOrderToDelivered);

module.exports = router;
