const express = require('express');
const router  = express.Router();
const {
  getReviews, getGallery, createReview,
  getMyReview, updateMyReview,
  voteReview, replyToReview, deleteReview, getStats,
  adminGetAllReviews, adminUpdateReviewStatus, adminGetGlobalStats,
} = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public: read reviews + stats + gallery
router.get('/:productId',          getReviews);
router.get('/:productId/stats',    getStats);
router.get('/:productId/gallery',  getGallery);

// Protected: write review
router.post('/:productId', protect, createReview);

// Protected: get / update own review for a product
router.get('/:productId/my-review',  protect, getMyReview);
router.put('/:productId/my-review',  protect, ...updateMyReview);

// Protected: vote helpful
router.put('/:reviewId/vote', protect, voteReview);

// Admin only: reply
router.put('/:reviewId/reply', protect, authorize('admin', 'manager'), replyToReview);

// Owner / Admin: delete
router.delete('/:reviewId', protect, deleteReview);

// Admin: all reviews across products
router.get('/admin/all',    protect, authorize('admin', 'manager', 'staff'), adminGetAllReviews);
router.get('/admin/stats',  protect, authorize('admin', 'manager', 'staff'), adminGetGlobalStats);
router.patch('/admin/:reviewId/status', protect, authorize('admin', 'manager'), adminUpdateReviewStatus);

module.exports = router;
