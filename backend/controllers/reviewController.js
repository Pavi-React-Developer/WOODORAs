const Review = require('../models/Review');
const Product = require('../models/Product');
const ProductImage = require('../models/catalog/ProductImage');
const Order   = require('../models/Order');
const { uploadToCloudinary, deleteFromCloudinary } = require('../services/uploadService');
const { getCloudinaryFolder, getImageOptimizationParams, getVideoOptimizationParams } = require('../utils/cloudinaryHelper');
const upload = require('../middlewares/upload');

/* ── helpers ──────────────────────────────────────── */
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
// Featured reviews for the home landing page.
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
    res.status(500).json({ message: err.message });
  }
};

// GET /api/reviews/:productId/gallery
const getGallery = async (req, res) => {
  try {
    const reviews = await Review.find(
      { product: req.params.productId, status: 'approved', images: { $exists: true, $not: { $size: 0 } } },
      { images: 1, user: 1 }
    ).populate('user', 'name').lean();
    const gallery = reviews.flatMap(r => r.images.map(img => ({ url: img.url, userName: r.user?.name })));
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
      const { rating, title, description, orderId, orderItemId } = req.body;
      const productId = req.params.productId;

      const existing = await findReviewForOrderItem({
        userId: req.user._id,
        productId,
        orderId,
        orderItemId,
      });
      if (existing) return res.status(400).json({ message: 'You have already reviewed this item.' });

      const cloudinaryFolder = getCloudinaryFolder('review');
      
      const imageUploadPromises = (req.files?.images || []).map(file => {
        return uploadToCloudinary(file.buffer, cloudinaryFolder, 'image', getImageOptimizationParams());
      });
      const videoUploadPromises = (req.files?.videos || []).map(file => {
        return uploadToCloudinary(file.buffer, cloudinaryFolder, 'video', getVideoOptimizationParams());
      });

      const [imageResults, videoResults] = await Promise.all([
        Promise.all(imageUploadPromises),
        Promise.all(videoUploadPromises)
      ]);

      const mapToSchema = (result) => ({
        url: result.secure_url,
        public_id: result.public_id,
        width: result.width || 0,
        height: result.height || 0,
        format: result.format,
        resource_type: result.resource_type,
        bytes: result.bytes,
        created_at: result.created_at
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
        rating: Number(rating),
        title: title || '',
        description: description || '',
        images: imageResults.map(mapToSchema),
        videos: videoResults.map(mapToSchema),
        isVerifiedPurchase: !!purchasedItem,
      });

      const populated = await review.populate('user', 'name profileImage');
      res.status(201).json(populated);
    } catch (err) {
      if (err.code === 11000) return res.status(400).json({ message: 'You have already reviewed this item.' });
      res.status(500).json({ message: err.message });
    }
  },
];

/* ── Get current user's review for a specific order item ─── */
// GET /api/reviews/order-item/:orderId/:orderItemId
const getMyOrderItemReview = async (req, res) => {
  try {
    const { orderId, orderItemId } = req.params;

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
    res.status(500).json({ message: err.message });
  }
};

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
      const { rating, title, description, orderId, orderItemId } = req.body;
      const productId = req.params.productId;

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
        const imageUploadPromises = req.files.images.map(file => uploadToCloudinary(file.buffer, cloudinaryFolder, 'image', getImageOptimizationParams()));
        const imageResults = await Promise.all(imageUploadPromises);
        newImages = imageResults.map(result => ({
          url: result.secure_url,
          public_id: result.public_id,
          width: result.width || 0,
          height: result.height || 0,
          format: result.format,
          resource_type: result.resource_type,
          bytes: result.bytes,
          created_at: result.created_at
        }));
      }

      let newVideos = [];
      if (req.files?.videos?.length > 0) {
        const videoUploadPromises = req.files.videos.map(file => uploadToCloudinary(file.buffer, cloudinaryFolder, 'video', getVideoOptimizationParams()));
        const videoResults = await Promise.all(videoUploadPromises);
        newVideos = videoResults.map(result => ({
          url: result.secure_url,
          public_id: result.public_id,
          width: result.width || 0,
          height: result.height || 0,
          format: result.format,
          resource_type: result.resource_type,
          bytes: result.bytes,
          created_at: result.created_at
        }));
      }

      existing.rating      = Number(rating);
      existing.title       = title || '';
      existing.description = description || '';
      existing.orderId     = orderId || existing.orderId;
      existing.orderItemId = orderItemId || existing.orderItemId;
      existing.status      = 'pending'; // reset to pending for re-moderation
      
      // Ideally delete old images from Cloudinary here before replacing
      if (newImages.length > 0) {
        for (let oldImg of existing.images) {
           if (oldImg.public_id) deleteFromCloudinary(oldImg.public_id, 'image').catch(console.error);
        }
        existing.images = newImages;
      }
      if (newVideos.length > 0) {
        for (let oldVid of existing.videos) {
           if (oldVid.public_id) deleteFromCloudinary(oldVid.public_id, 'video').catch(console.error);
        }
        existing.videos = newVideos;
      }

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
      { returnDocument: 'after' }
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
    
    // Delete Cloudinary media
    for (let img of (review.images || [])) {
       if (img.public_id) deleteFromCloudinary(img.public_id, 'image').catch(console.error);
    }
    for (let vid of (review.videos || [])) {
       if (vid.public_id) deleteFromCloudinary(vid.public_id, 'video').catch(console.error);
    }

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
      { returnDocument: 'after' }
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

module.exports = { getReviews, getFeaturedReviews, getGallery, createReview, getMyOrderItemReview, getMyReview, updateMyReview, voteReview, replyToReview, deleteReview, getStats, adminGetAllReviews, adminUpdateReviewStatus, adminGetGlobalStats };
