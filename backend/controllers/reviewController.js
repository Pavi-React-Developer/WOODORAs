const mongoose = require('mongoose');
const Review = require('../models/Review');
const Product = require('../models/Product');
const ProductImage = require('../models/catalog/ProductImage');
const Order   = require('../models/Order');
const { uploadToCloudinary, deleteFromCloudinary } = require('../services/uploadService');
const { getCloudinaryFolder, getImageOptimizationParams, getVideoOptimizationParams } = require('../utils/cloudinaryHelper');
const upload = require('../middlewares/upload');

/* ── helpers ──────────────────────────────────────── */

/**
 * Validate a MongoDB ObjectId string. Returns false if invalid.
 * Prevents CastError crashes when route params contain non-ObjectId strings.
 */
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const findReviewForOrderItem = async ({ userId, productId, orderId, orderItemId }) => {
  const query = {
    user: userId,
    product: productId,
  };

  if (orderId && orderItemId) {
    query.orderId = orderId;
    query.orderItemId = orderItemId;
  }

  return Review.findOne(query);
};

/**
 * Build rating stats for a product using aggregation (O(1) DB work) instead of
 * loading all reviews into memory (old approach was O(N), causing timeouts at scale).
 */
const buildStatsForProduct = async (productId) => {
  const [result] = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId), status: 'approved' } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        avg: { $avg: '$rating' },
        photoReviews: {
          $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ['$images', []] } }, 0] }, 1, 0] }
        },
        verifiedBuyers: {
          $sum: { $cond: ['$isVerifiedPurchase', 1, 0] }
        },
        ratings: { $push: '$rating' },
      },
    },
  ]);

  if (!result) {
    return {
      total: 0,
      avg: 0,
      dist: [5, 4, 3, 2, 1].map(star => ({ star, count: 0, pct: 0 })),
      photoReviews: 0,
      verifiedBuyers: 0,
    };
  }

  const { total, ratings, photoReviews, verifiedBuyers } = result;
  const avg = total ? Math.round((result.avg || 0) * 10) / 10 : 0;

  const dist = [5, 4, 3, 2, 1].map(star => {
    const count = ratings.filter(r => r === star).length;
    return { star, count, pct: total ? Math.round((count / total) * 100) : 0 };
  });

  return { total, avg, dist, photoReviews, verifiedBuyers };
};

/* ── Get reviews for a product ──────────────────── */
// GET /api/reviews/:productId
const getReviews = async (req, res) => {
  try {
    const { productId } = req.params;

    // Guard: reject obviously invalid IDs before hitting the DB
    if (!isValidObjectId(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    const { sort = 'newest', limit = 10, page = 1 } = req.query;
    const numLimit = Math.min(Number(limit) || 10, 100);
    const numPage  = Math.max(Number(page) || 1, 1);

    const sortMap = {
      newest:         { createdAt: -1 },
      oldest:         { createdAt:  1 },
      highest_rating: { rating: -1 },
      lowest_rating:  { rating:  1 },
      most_helpful:   { helpfulCount: -1 }, // virtual sort — see below
    };

    const reviews = await Review.find({ product: productId, status: 'approved' })
      .populate('user', 'name profileImage')
      .sort(sortMap[sort] || { createdAt: -1 })
      .skip((numPage - 1) * numLimit)
      .limit(numLimit)
      .lean();

    // Attach helpful/not-helpful counts
    const enriched = reviews.map(r => ({
      ...r,
      helpfulCount:    r.helpfulVotes?.filter(v => v.vote === 'helpful').length || 0,
      notHelpfulCount: r.helpfulVotes?.filter(v => v.vote === 'not_helpful').length || 0,
      myVote: req.user
        ? (r.helpfulVotes?.find(v => String(v.user) === String(req.user._id))?.vote || null)
        : null,
    }));

    const stats = await buildStatsForProduct(productId);
    res.json({ reviews: enriched, stats });
  } catch (err) {
    console.error('getReviews error:', err);
    res.status(500).json({ message: err.message });
  }
};

/* ── Featured reviews for the home landing page ── */
// GET /api/reviews/featured
const getFeaturedReviews = async (req, res) => {
  try {
    const { limit = 12 } = req.query;
    const safeLimit = Math.min(Math.max(Number(limit) || 12, 1), 24);

    const reviews = await Review.find({
      status: 'approved',
      $or: [
        { description: { $exists: true, $ne: '' } },
        { title: { $exists: true, $ne: '' } },
      ],
    })
      .populate('user', 'name profileImage')
      .populate('product', 'name')
      .sort({ rating: -1, createdAt: -1 })
      .limit(safeLimit)
      .lean();

    res.json({ reviews });
  } catch (err) {
    console.error('getFeaturedReviews error:', err);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/reviews/:productId/gallery
const getGallery = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!isValidObjectId(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    const reviews = await Review.find(
      { product: productId, status: 'approved', images: { $exists: true, $not: { $size: 0 } } },
      { images: 1, user: 1 }
    ).populate('user', 'name').lean();

    const gallery = reviews.flatMap(r =>
      (r.images || []).map(img => ({ url: img.url, userName: r.user?.name }))
    );
    res.json(gallery);
  } catch (err) {
    console.error('getGallery error:', err);
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
      const { rating, title, description, orderId, orderItemId } = req.body;
      const productId = req.params.productId;

      if (!isValidObjectId(productId)) {
        return res.status(400).json({ message: 'Invalid product ID' });
      }

      // Validate rating
      const numRating = Number(rating);
      if (!numRating || numRating < 1 || numRating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
      }

      const existing = await findReviewForOrderItem({
        userId: req.user._id,
        productId,
        orderId,
        orderItemId,
      });
      if (existing) {
        return res.status(400).json({ message: 'You have already reviewed this item.' });
      }

      const cloudinaryFolder = getCloudinaryFolder('review');

      const imageUploadPromises = (req.files?.images || []).map(file =>
        uploadToCloudinary(file.buffer, cloudinaryFolder, 'image', getImageOptimizationParams())
      );
      const videoUploadPromises = (req.files?.videos || []).map(file =>
        uploadToCloudinary(file.buffer, cloudinaryFolder, 'video', getVideoOptimizationParams())
      );

      const [imageResults, videoResults] = await Promise.all([
        Promise.all(imageUploadPromises),
        Promise.all(videoUploadPromises),
      ]);

      const mapToSchema = (result) => ({
        url: result.secure_url,
        public_id: result.public_id,
        width: result.width || 0,
        height: result.height || 0,
        format: result.format || '',
        resource_type: result.resource_type || 'image',
        bytes: result.bytes || 0,
        created_at: result.created_at ? new Date(result.created_at) : new Date(),
      });

      const purchasedItem = orderId && orderItemId
        ? await Order.findOne({
            _id: orderId,
            user: req.user._id,
            status: 'Delivered',
            'orderItems._id': orderItemId,
            'orderItems.product': productId,
          })
        : await Order.findOne({
            user: req.user._id,
            'orderItems.product': productId,
            status: 'Delivered',
          });

      const review = await Review.create({
        product: productId,
        user: req.user._id,
        orderId: orderId || undefined,
        orderItemId: orderItemId || undefined,
        rating: numRating,
        title: (title || '').trim(),
        description: (description || '').trim(),
        images: imageResults.map(mapToSchema),
        videos: videoResults.map(mapToSchema),
        isVerifiedPurchase: !!purchasedItem,
      });

      const populated = await review.populate('user', 'name profileImage');
      res.status(201).json(populated);
    } catch (err) {
      if (err.code === 11000) {
        return res.status(400).json({ message: 'You have already reviewed this item.' });
      }
      console.error('createReview error:', err);
      res.status(500).json({ message: err.message });
    }
  },
];

/* ── Get current user's review for a specific order item ─── */
// GET /api/reviews/order-item/:orderId/:orderItemId
const getMyOrderItemReview = async (req, res) => {
  try {
    const { orderId, orderItemId } = req.params;

    if (!isValidObjectId(orderId)) {
      return res.status(400).json({ message: 'Invalid order ID' });
    }

    const order = await Order.findOne({
      _id: orderId,
      user: req.user._id,
    });

    if (!order) return res.status(404).json({ message: 'Order not found.' });

    const orderItem = order.orderItems.find(item => String(item._id) === String(orderItemId));
    if (!orderItem) return res.status(404).json({ message: 'Order item not found.' });

    const review = await Review.findOne({
      user: req.user._id,
      orderId,
      orderItemId,
    }).populate('user', 'name profileImage').lean();

    res.json(review || null);
  } catch (err) {
    console.error('getMyOrderItemReview error:', err);
    res.status(500).json({ message: err.message });
  }
};

/* ── Get current user's review for a product ─── */
// GET /api/reviews/:productId/my-review
const getMyReview = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!isValidObjectId(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    const review = await Review.findOne({
      product: productId,
      user: req.user._id,
    }).populate('user', 'name profileImage').lean();

    res.json(review || null);
  } catch (err) {
    console.error('getMyReview error:', err);
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
      const { rating, title, description, orderId, orderItemId } = req.body;
      const productId = req.params.productId;

      if (!isValidObjectId(productId)) {
        return res.status(400).json({ message: 'Invalid product ID' });
      }

      const numRating = Number(rating);
      if (!numRating || numRating < 1 || numRating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
      }

      const existing = await findReviewForOrderItem({
        userId: req.user._id,
        productId,
        orderId,
        orderItemId,
      });
      if (!existing) return res.status(404).json({ message: 'No review found to update.' });

      const cloudinaryFolder = getCloudinaryFolder('review');

      let newImages = [];
      if (req.files?.images?.length > 0) {
        const imageResults = await Promise.all(
          req.files.images.map(file =>
            uploadToCloudinary(file.buffer, cloudinaryFolder, 'image', getImageOptimizationParams())
          )
        );
        newImages = imageResults.map(result => ({
          url: result.secure_url,
          public_id: result.public_id,
          width: result.width || 0,
          height: result.height || 0,
          format: result.format || '',
          resource_type: result.resource_type || 'image',
          bytes: result.bytes || 0,
          created_at: result.created_at ? new Date(result.created_at) : new Date(),
        }));
      }

      let newVideos = [];
      if (req.files?.videos?.length > 0) {
        const videoResults = await Promise.all(
          req.files.videos.map(file =>
            uploadToCloudinary(file.buffer, cloudinaryFolder, 'video', getVideoOptimizationParams())
          )
        );
        newVideos = videoResults.map(result => ({
          url: result.secure_url,
          public_id: result.public_id,
          width: result.width || 0,
          height: result.height || 0,
          format: result.format || '',
          resource_type: result.resource_type || 'video',
          bytes: result.bytes || 0,
          created_at: result.created_at ? new Date(result.created_at) : new Date(),
        }));
      }

      existing.rating      = numRating;
      existing.title       = (title || '').trim();
      existing.description = (description || '').trim();
      existing.orderId     = orderId || existing.orderId;
      existing.orderItemId = orderItemId || existing.orderItemId;
      existing.status      = 'pending'; // reset to pending for re-moderation

      if (newImages.length > 0) {
        // Delete old images from Cloudinary (fire-and-forget; don't block the response)
        for (const oldImg of existing.images || []) {
          if (oldImg.public_id) deleteFromCloudinary(oldImg.public_id, 'image').catch(e => console.error('Cloudinary delete image error:', e));
        }
        existing.images = newImages;
      }
      if (newVideos.length > 0) {
        for (const oldVid of existing.videos || []) {
          if (oldVid.public_id) deleteFromCloudinary(oldVid.public_id, 'video').catch(e => console.error('Cloudinary delete video error:', e));
        }
        existing.videos = newVideos;
      }

      await existing.save();
      const populated = await existing.populate('user', 'name profileImage');
      res.json(populated);
    } catch (err) {
      console.error('updateMyReview error:', err);
      res.status(500).json({ message: err.message });
    }
  },
];

/* ── Vote helpful / not helpful ──────────────── */
// PUT /api/reviews/:reviewId/vote
const voteReview = async (req, res) => {
  try {
    const { vote } = req.body; // 'helpful' | 'not_helpful' | undefined (to remove vote)

    // Validate vote value — only allow known values or empty (toggle off)
    if (vote && !['helpful', 'not_helpful'].includes(vote)) {
      return res.status(400).json({ message: 'Invalid vote value. Use "helpful" or "not_helpful".' });
    }

    if (!isValidObjectId(req.params.reviewId)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }

    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    // Remove existing vote from this user
    review.helpfulVotes = review.helpfulVotes.filter(
      v => String(v.user) !== String(req.user._id)
    );

    // Add new vote (omit to toggle off)
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
    console.error('voteReview error:', err);
    res.status(500).json({ message: err.message });
  }
};

/* ── Admin reply to review ───────────────────── */
// PUT /api/reviews/:reviewId/reply  (admin only)
const replyToReview = async (req, res) => {
  try {
    const { text } = req.body;

    if (!isValidObjectId(req.params.reviewId)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Reply text is required' });
    }

    // Use `new: true` (Mongoose option) instead of `returnDocument: 'after'` (raw driver option)
    const review = await Review.findByIdAndUpdate(
      req.params.reviewId,
      { adminReply: { text: text.trim(), repliedAt: new Date() } },
      { new: true }
    ).populate('user', 'name profileImage');

    if (!review) return res.status(404).json({ message: 'Review not found' });
    res.json(review);
  } catch (err) {
    console.error('replyToReview error:', err);
    res.status(500).json({ message: err.message });
  }
};

/* ── Delete review (admin or owner) ─────────── */
// DELETE /api/reviews/:reviewId
const deleteReview = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.reviewId)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }

    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ message: 'Review not found' });

    const isOwner = String(review.user) === String(req.user._id);
    const isAdmin = ['admin', 'manager'].includes(req.user.role?.toLowerCase()) || req.user.isStaff;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this review' });
    }

    // Delete Cloudinary media (fire-and-forget; do not block response)
    for (const img of (review.images || [])) {
      if (img.public_id) deleteFromCloudinary(img.public_id, 'image').catch(e => console.error('Cloudinary delete error:', e));
    }
    for (const vid of (review.videos || [])) {
      if (vid.public_id) deleteFromCloudinary(vid.public_id, 'video').catch(e => console.error('Cloudinary delete error:', e));
    }

    await review.deleteOne();
    res.json({ message: 'Review deleted' });
  } catch (err) {
    console.error('deleteReview error:', err);
    res.status(500).json({ message: err.message });
  }
};

/* ── Get review stats only ───────────────────── */
// GET /api/reviews/:productId/stats
const getStats = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!isValidObjectId(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }
    const stats = await buildStatsForProduct(productId);
    res.json(stats);
  } catch (err) {
    console.error('getStats error:', err);
    res.status(500).json({ message: err.message });
  }
};

/* ── Helper: Attach Real Product Images ─────── */
const attachProductImages = async (reviews) => {
  try {
    const productIds = [
      ...new Set(
        reviews.map(r => r.product?._id?.toString()).filter(Boolean)
      ),
    ];
    if (productIds.length === 0) return;

    const images = await ProductImage.find({ product: { $in: productIds } })
      .sort({ displayOrder: 1 })
      .lean();

    const imgMap = {};
    images.forEach(img => {
      const pId = img.product.toString();
      if (!imgMap[pId]) imgMap[pId] = [];
      imgMap[pId].push(img.url);
    });

    reviews.forEach(r => {
      if (r.product?._id) {
        const pId = r.product._id.toString();
        if (imgMap[pId]?.length > 0) {
          r.product.images = imgMap[pId];
        }
      }
    });
  } catch (err) {
    // Non-fatal: log but don't crash the whole response
    console.error('attachProductImages error:', err);
  }
};

/* ── Admin: Get ALL reviews across products ──── */
// GET /api/reviews/admin/all
const adminGetAllReviews = async (req, res) => {
  try {
    const {
      page = 1, limit = 10,
      rating, status, search, productId,
      sort = 'newest',
    } = req.query;

    // Always cast to Number to prevent broken skip/limit behaviour
    const numPage  = Math.max(Number(page) || 1, 1);
    const numLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const query = {};
    if (rating)    query.rating  = Number(rating);
    if (status)    query.status  = status;
    if (productId && isValidObjectId(productId)) query.product = productId;

    const sortMap = {
      newest:  { createdAt: -1 },
      oldest:  { createdAt:  1 },
      highest: { rating: -1 },
      lowest:  { rating:  1 },
    };
    const sortOpt = sortMap[sort] || { createdAt: -1 };

    if (search) {
      // Post-populate search: fetch all matching documents, filter, then paginate
      const all = await Review.find(query)
        .populate('user',    'name email phone profileImage')
        .populate('product', 'name images sku category')
        .sort(sortOpt)
        .lean();

      const q = search.toLowerCase();
      const filtered = all.filter(r =>
        r.user?.name?.toLowerCase().includes(q)      ||
        r.user?.email?.toLowerCase().includes(q)     ||
        r.product?.name?.toLowerCase().includes(q)   ||
        r.description?.toLowerCase().includes(q)     ||
        r.title?.toLowerCase().includes(q)
      );

      const total     = filtered.length;
      const paginated = filtered.slice((numPage - 1) * numLimit, numPage * numLimit);
      await attachProductImages(paginated);
      return res.json({
        reviews: paginated,
        total,
        page: numPage,
        pages: Math.ceil(total / numLimit),
      });
    }

    // Parallel count + data query for performance
    const [total, reviews] = await Promise.all([
      Review.countDocuments(query),
      Review.find(query)
        .populate('user',    'name email phone profileImage')
        .populate('product', 'name images sku category')
        .sort(sortOpt)
        .skip((numPage - 1) * numLimit)
        .limit(numLimit)
        .lean(),
    ]);

    await attachProductImages(reviews);
    res.json({ reviews, total, page: numPage, pages: Math.ceil(total / numLimit) });
  } catch (err) {
    console.error('adminGetAllReviews error:', err);
    res.status(500).json({ message: err.message });
  }
};

/* ── Admin: Approve or Reject a review ──────── */
// PATCH /api/reviews/admin/:reviewId/status
const adminUpdateReviewStatus = async (req, res) => {
  try {
    const { status } = req.body; // 'approved' | 'rejected' | 'pending'

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be approved, rejected, or pending.' });
    }

    if (!isValidObjectId(req.params.reviewId)) {
      return res.status(400).json({ message: 'Invalid review ID' });
    }

    // `new: true` is the correct Mongoose option (returnDocument is raw driver)
    const review = await Review.findByIdAndUpdate(
      req.params.reviewId,
      { status },
      { new: true }
    )
      .populate('user', 'name email profileImage')
      .populate('product', 'name images');

    if (!review) return res.status(404).json({ message: 'Review not found' });
    res.json(review);
  } catch (err) {
    console.error('adminUpdateReviewStatus error:', err);
    res.status(500).json({ message: err.message });
  }
};

/* ── Admin: Global review stats (KPIs) ──────── */
// GET /api/reviews/admin/stats
const adminGetGlobalStats = async (req, res) => {
  try {
    // Run all count queries in parallel for performance
    const [total, pending, reported, approved, ratingAgg, dist, monthly, topProducts] =
      await Promise.all([
        Review.countDocuments(),
        Review.countDocuments({ status: 'pending' }),
        Review.countDocuments({ status: 'rejected' }),
        Review.countDocuments({ status: 'approved' }),

        Review.aggregate([
          { $match: { status: 'approved' } },
          { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
        ]),

        // Rating distribution
        Review.aggregate([
          { $match: { status: 'approved' } },
          { $group: { _id: '$rating', count: { $sum: 1 } } },
          { $sort: { _id: -1 } },
        ]),

        // Monthly trend (last 6 months)
        Review.aggregate([
          {
            $match: {
              createdAt: {
                $gte: (() => { const d = new Date(); d.setMonth(d.getMonth() - 6); return d; })(),
              },
            },
          },
          {
            $group: {
              _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
              count: { $sum: 1 },
              avgRating: { $avg: '$rating' },
            },
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]),

        // Top reviewed products
        Review.aggregate([
          { $match: { status: 'approved' } },
          {
            $group: {
              _id: '$product',
              avgRating: { $avg: '$rating' },
              reviewCount: { $sum: 1 },
            },
          },
          { $sort: { reviewCount: -1 } },
          { $limit: 5 },
          {
            $lookup: {
              from: 'products',
              localField: '_id',
              foreignField: '_id',
              as: 'product',
            },
          },
          { $unwind: '$product' },
          {
            $project: {
              name: '$product.name',
              avgRating: { $round: ['$avgRating', 1] },
              reviewCount: 1,
            },
          },
        ]),
      ]);

    const avgRating = ratingAgg[0]?.avg ? Math.round(ratingAgg[0].avg * 10) / 10 : 0;

    res.json({ total, pending, reported, approved, avgRating, dist, monthly, topProducts });
  } catch (err) {
    console.error('adminGetGlobalStats error:', err);
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getReviews,
  getFeaturedReviews,
  getGallery,
  createReview,
  getMyOrderItemReview,
  getMyReview,
  updateMyReview,
  voteReview,
  replyToReview,
  deleteReview,
  getStats,
  adminGetAllReviews,
  adminUpdateReviewStatus,
  adminGetGlobalStats,
};
