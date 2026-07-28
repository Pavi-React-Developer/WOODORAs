const express = require('express');
const router  = express.Router();
const {
  getReviews, getFeaturedReviews, getGallery, createReview,
  getMyOrderItemReview, getMyReview, updateMyReview,
  voteReview, replyToReview, deleteReview, getStats,
  adminGetAllReviews, adminUpdateReviewStatus, adminGetGlobalStats,
} = require('../controllers/reviewController');
const { protect, authorize } = require('../middleware/authMiddleware');

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: Static/fixed paths MUST be declared BEFORE wildcard /:param routes.
// Express matches routes top-to-bottom. If /:productId came first, every request
// to /featured, /admin/all, etc. would be caught by it with productId="admin".
// ─────────────────────────────────────────────────────────────────────────────

// ── Public: featured reviews (home page) ─────────────────────────────────────
router.get('/featured', getFeaturedReviews);

// ── Admin: all reviews + global stats + status update ────────────────────────
// Must be above /:productId and /:reviewId wildcards
router.get('/admin/all',   protect, authorize('admin', 'manager', 'staff'), adminGetAllReviews);
router.get('/admin/stats', protect, authorize('admin', 'manager', 'staff'), adminGetGlobalStats);
router.patch('/admin/:reviewId/status', protect, authorize('admin', 'manager'), adminUpdateReviewStatus);

// ── Protected: get own review for a specific order item ──────────────────────
// Must be above /:productId or "order-item" is treated as a productId
router.get('/order-item/:orderId/:orderItemId', protect, getMyOrderItemReview);

// ── Public: read reviews + stats + gallery for a product ─────────────────────
router.get('/:productId',         getReviews);
router.get('/:productId/stats',   getStats);
router.get('/:productId/gallery', getGallery);

// ── Protected: write review ───────────────────────────────────────────────────
router.post('/:productId', protect, createReview);

// ── Protected: get / update own review for a product ─────────────────────────
router.get('/:productId/my-review', protect, getMyReview);
// updateMyReview is an array [multerMiddleware, asyncHandler] — spread explicitly
router.put('/:productId/my-review', protect, updateMyReview[0], updateMyReview[1]);

// ── Protected: vote helpful / not_helpful ────────────────────────────────────
router.put('/:reviewId/vote', protect, voteReview);

// ── Admin only: reply to review ───────────────────────────────────────────────
router.put('/:reviewId/reply', protect, authorize('admin', 'manager'), replyToReview);

// ── Owner / Admin: delete review ─────────────────────────────────────────────
router.delete('/:reviewId', protect, deleteReview);

module.exports = router;
