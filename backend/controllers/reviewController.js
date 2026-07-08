const Review = require('../models/Review');
const Product = require('../models/Product');
const ProductImage = require('../models/catalog/ProductImage');
const Order   = require('../models/Order');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

/* ── multer for review media ──────────────────────── */
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadsDir),
  filename:    (_, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `review-${unique}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const fileFilter = (_, file, cb) => {
  const allowed = ['image/jpeg','image/jpg','image/png','image/webp','video/mp4','video/quicktime'];
  cb(null, allowed.includes(file.mimetype));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } });

/* ── helpers ──────────────────────────────────────── */
const buildStatsForProduct = async (productId) => {
  const reviews = await Review.find({ product: productId, status: 'approved' });
  const total   = reviews.length;
  const avg     = total ? (reviews.reduce((s, r) => s + r.rating, 0) / total) : 0;
  const dist    = [5,4,3,2,1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct:   total ? Math.round((reviews.filter(r => r.rating === star).length / total) * 100) : 0,
  }));
  const photoReviews    = reviews.filter(r => r.images?.length > 0).length;
  const verifiedBuyers  = reviews.filter(r => r.isVerifiedPurchase).length;
  return { total, avg: Math.round(avg * 10) / 10, dist, photoReviews, verifiedBuyers };
};

/* ── Get reviews for a product ──────────────────── */
// GET /api/reviews/:productId
const getReviews = async (req, res) => {
  try {
    const { sort = 'newest', limit = 10, page = 1 } = req.query;
    const sortMap = {
      newest:         { createdAt: -1 },
      oldest:         { createdAt:  1 },
      highest_rating: { rating: -1 },
      lowest_rating:  { rating:  1 },
      most_helpful:   { 'helpfulVotes.length': -1 },
    };

    const reviews = await Review.find({ product: req.params.productId, status: 'approved' })
      .populate('user', 'name profileImage')
      .sort(sortMap[sort] || { createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    // attach helpful/not-helpful counts
    const enriched = reviews.map(r => ({
      ...r,
      helpfulCount:    r.helpfulVotes?.filter(v => v.vote === 'helpful').length || 0,
      notHelpfulCount: r.helpfulVotes?.filter(v => v.vote === 'not_helpful').length || 0,
      myVote: req.user ? (r.helpfulVotes?.find(v => String(v.user) === String(req.user._id))?.vote || null) : null,
    }));

    const stats = await buildStatsForProduct(req.params.productId);
    res.json({ reviews: enriched, stats });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── Get all images from reviews of a product ──── */
// GET /api/reviews/:productId/gallery
const getGallery = async (req, res) => {
  try {
    const reviews = await Review.find(
      { product: req.params.productId, status: 'approved', images: { $exists: true, $not: { $size: 0 } } },
      { images: 1, user: 1 }
    ).populate('user', 'name').lean();
    const gallery = reviews.flatMap(r => r.images.map(img => ({ url: img, userName: r.user?.name })));
    res.json(gallery);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── Create a review ─────────────────────────── */
// POST /api/reviews/:productId  (multipart/form-data)
const createReview = [
  upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'videos', maxCount: 2 },
  ]),
  async (req, res) => {
    try {
      const { rating, title, description } = req.body;
      const productId = req.params.productId;

      // Check duplicate
      const existing = await Review.findOne({ product: productId, user: req.user._id });
      if (existing) return res.status(400).json({ message: 'You have already reviewed this product.' });

      const baseUrl   = `${req.protocol}://${req.get('host')}`;
      const imageUrls = (req.files?.images || []).map(f => `${baseUrl}/uploads/${f.filename}`);
      const videoUrls = (req.files?.videos || []).map(f => `${baseUrl}/uploads/${f.filename}`);

      // Check verified purchase
      const hasBought = await Order.findOne({
        user: req.user._id,
        'orderItems.product': productId,
        status: 'Delivered',
      });

      const review = await Review.create({
        product: productId,
        user: req.user._id,
        rating: Number(rating),
        title: title || '',
        description: description || '',
        images: imageUrls,
        videos: videoUrls,
        isVerifiedPurchase: !!hasBought,
      });

      const populated = await review.populate('user', 'name profileImage');
      res.status(201).json(populated);
    } catch (err) {
      if (err.code === 11000) return res.status(400).json({ message: 'You have already reviewed this product.' });
      res.status(500).json({ message: err.message });
    }
  },
];

/* ── Get current user's review for a product ─── */
// GET /api/reviews/:productId/my-review
const getMyReview = async (req, res) => {
  try {
    const review = await Review.findOne({
      product: req.params.productId,
      user: req.user._id,
    }).populate('user', 'name profileImage').lean();
    if (!review) return res.json(null);
    res.json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── Update current user's review for a product ─── */
// PUT /api/reviews/:productId/my-review  (multipart/form-data)
const updateMyReview = [
  upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'videos', maxCount: 2 },
  ]),
  async (req, res) => {
    try {
      const { rating, title, description } = req.body;
      const productId = req.params.productId;

      const existing = await Review.findOne({ product: productId, user: req.user._id });
      if (!existing) return res.status(404).json({ message: 'No review found to update.' });

      const baseUrl   = `${req.protocol}://${req.get('host')}`;
      const newImages = (req.files?.images || []).map(f => `${baseUrl}/uploads/${f.filename}`);
      const newVideos = (req.files?.videos || []).map(f => `${baseUrl}/uploads/${f.filename}`);

      existing.rating      = Number(rating);
      existing.title       = title || '';
      existing.description = description || '';
      existing.status      = 'pending'; // reset to pending for re-moderation
      if (newImages.length > 0) existing.images = newImages;
      if (newVideos.length > 0) existing.videos = newVideos;

      await existing.save();
      const populated = await existing.populate('user', 'name profileImage');
      res.json(populated);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },
];

/* ── Vote helpful / not helpful ──────────────── */
// PUT /api/reviews/:reviewId/vote
const voteReview = async (req, res) => {
  try {
    const { vote } = req.body; // 'helpful' | 'not_helpful'
    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    // Remove existing vote from this user
    review.helpfulVotes = review.helpfulVotes.filter(v => String(v.user) !== String(req.user._id));

    // Add new vote (toggle: if same vote, just remove)
    if (vote) {
      review.helpfulVotes.push({ user: req.user._id, vote });
    }
    await review.save();

    res.json({
      helpfulCount:    review.helpfulVotes.filter(v => v.vote === 'helpful').length,
      notHelpfulCount: review.helpfulVotes.filter(v => v.vote === 'not_helpful').length,
      myVote: vote || null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── Admin reply to review ───────────────────── */
// PUT /api/reviews/:reviewId/reply  (admin only)
const replyToReview = async (req, res) => {
  try {
    const { text } = req.body;
    const review = await Review.findByIdAndUpdate(
      req.params.reviewId,
      { adminReply: { text, repliedAt: new Date() } },
      { new: true }
    ).populate('user', 'name profileImage');
    if (!review) return res.status(404).json({ message: 'Review not found' });
    res.json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── Delete review (admin or owner) ─────────── */
// DELETE /api/reviews/:reviewId
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    const isOwner = String(review.user) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Not authorized' });
    await review.deleteOne();
    res.json({ message: 'Review deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── Get review stats only ───────────────────── */
// GET /api/reviews/:productId/stats
const getStats = async (req, res) => {
  try {
    const stats = await buildStatsForProduct(req.params.productId);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── Helper: Attach Real Product Images ─────── */
const attachProductImages = async (reviews) => {
  const productIds = [...new Set(reviews.map(r => r.product?._id?.toString()).filter(Boolean))];
  if (productIds.length > 0) {
    const images = await ProductImage.find({ product: { $in: productIds } }).sort({ displayOrder: 1 }).lean();
    const imgMap = {};
    images.forEach(img => {
      const pId = img.product.toString();
      if (!imgMap[pId]) imgMap[pId] = [];
      imgMap[pId].push(img.url);
    });
    reviews.forEach(r => {
      if (r.product?._id) {
        const pId = r.product._id.toString();
        if (imgMap[pId] && imgMap[pId].length > 0) {
          r.product.images = imgMap[pId];
        }
      }
    });
  }
};

/* ── Admin: Get ALL reviews across products ──── */
// GET /api/reviews/admin/all
const adminGetAllReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10, rating, status, search, productId, sort = 'newest' } = req.query;
    const query = {};
    if (rating)    query.rating = Number(rating);
    if (status)    query.status = status;
    if (productId) query.product = productId;

    const sortMap = {
      newest:  { createdAt: -1 },
      oldest:  { createdAt:  1 },
      highest: { rating: -1 },
      lowest:  { rating:  1 },
    };

    let reviewsQuery = Review.find(query)
      .populate('user',    'name email phone profileImage')
      .populate('product', 'name images sku category')
      .sort(sortMap[sort] || { createdAt: -1 });

    if (search) {
      // Post-filter by customer name/email after populate (simple approach)
      const all = await reviewsQuery.lean();
      const q   = search.toLowerCase();
      const filtered = all.filter(r =>
        r.user?.name?.toLowerCase().includes(q)  ||
        r.user?.email?.toLowerCase().includes(q) ||
        r.product?.name?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
      );
      const total    = filtered.length;
      const paginated = filtered.slice((page - 1) * limit, page * limit);
      await attachProductImages(paginated);
      return res.json({ reviews: paginated, total, page: Number(page), pages: Math.ceil(total / limit) });
    }

    const total   = await Review.countDocuments(query);
    const reviews = await reviewsQuery.skip((page - 1) * limit).limit(Number(limit)).lean();
    await attachProductImages(reviews);
    res.json({ reviews, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── Admin: Approve or Reject a review ──────── */
// PATCH /api/reviews/admin/:reviewId/status
const adminUpdateReviewStatus = async (req, res) => {
  try {
    const { status } = req.body; // 'approved' | 'rejected' | 'pending'
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const review = await Review.findByIdAndUpdate(
      req.params.reviewId,
      { status },
      { new: true }
    ).populate('user', 'name email profileImage').populate('product', 'name images');
    if (!review) return res.status(404).json({ message: 'Review not found' });
    res.json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ── Admin: Global review stats (KPIs) ──────── */
// GET /api/reviews/admin/stats
const adminGetGlobalStats = async (req, res) => {
  try {
    const total    = await Review.countDocuments();
    const pending  = await Review.countDocuments({ status: 'pending' });
    const reported = await Review.countDocuments({ status: 'rejected' });
    const approved = await Review.countDocuments({ status: 'approved' });

    const ratingAgg = await Review.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const avgRating = ratingAgg[0]?.avg ? Math.round(ratingAgg[0].avg * 10) / 10 : 0;

    // Rating distribution
    const dist = await Review.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
    ]);

    // Monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthly = await Review.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      { $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        count: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Top rated products
    const topProducts = await Review.aggregate([
      { $match: { status: 'approved' } },
      { $group: {
        _id: '$product',
        avgRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 },
      }},
      { $sort: { reviewCount: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $project: { name: '$product.name', avgRating: 1, reviewCount: 1 } },
    ]);

    res.json({ total, pending, reported, approved, avgRating, dist, monthly, topProducts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getReviews, getGallery, createReview, getMyReview, updateMyReview, voteReview, replyToReview, deleteReview, getStats, adminGetAllReviews, adminUpdateReviewStatus, adminGetGlobalStats };

