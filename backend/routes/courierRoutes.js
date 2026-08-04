const express = require('express');
const router = express.Router();
const { getCouriers, createCourier, deleteCourier } = require('../controllers/courierController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, authorize('admin', 'staff'), getCouriers)
  .post(protect, authorize('admin', 'staff'), createCourier);

router.route('/:id')
  .delete(protect, authorize('admin', 'staff'), deleteCourier);

module.exports = router;
