const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const { protect, authorize, optionalAuth } = require('../middleware/authMiddleware');

router.get('/eligible', optionalAuth, couponController.getEligibleCoupons);
router.post('/eligible', optionalAuth, couponController.getEligibleCoupons);
router.post('/apply', optionalAuth, couponController.applyCoupon);

router.use(protect);

router.get('', authorize('admin'), couponController.getCoupons);
router.get('/', authorize('admin'), couponController.getCoupons);
router.get('/:id', authorize('admin'), couponController.getCouponById);
router.post('/', authorize('admin'), couponController.createCoupon);
router.put('/:id', authorize('admin'), couponController.updateCoupon);
router.patch('/:id/toggle-status', authorize('admin'), couponController.toggleCouponStatus);
router.patch('/:id/toggle-visibility', authorize('admin'), couponController.toggleCouponVisibility);
router.delete('/:id', authorize('admin'), couponController.deleteCoupon);

module.exports = router;
