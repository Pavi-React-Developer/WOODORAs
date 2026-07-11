const Coupon = require('../models/Coupon');
const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const Product = require('../models/Product');
const Order = require('../models/Order');

const normalizeCouponCode = (value) => String(value || '').trim().toUpperCase();

const normalizeReference = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0] ? normalizeReference(value[0]) : null;
  if (typeof value === 'object') {
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
  }
  return String(value);
};

const parseOptionalDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getItemProductId = (item = {}) => normalizeReference(
  item?.product || item?.productId || item?.product_id || item?._id
);

const buildCartContext = async (items = []) => {
  const normalizedItems = Array.isArray(items) ? items : [];
  const productIds = [...new Set(normalizedItems.map(getItemProductId).filter(Boolean))];

  if (!productIds.length) return normalizedItems;

  const products = await Product.find({ _id: { $in: productIds } }).select('_id category subCategory');
  const productMap = new Map(products.map((product) => [String(product._id), product]));

  return normalizedItems.map((item) => {
    const productId = getItemProductId(item);
    const product = productId ? productMap.get(String(productId)) : null;

    return {
      ...item,
      product: productId || item?.product || null,
      category: item?.category || (product?.category ? normalizeReference(product.category) : null),
      subCategory: item?.subCategory || (product?.subCategory ? normalizeReference(product.subCategory) : null),
    };
  });
};

const couponMatchesCartItem = (coupon, item = {}) => {
  const couponCategory = normalizeReference(coupon?.category);
  const couponSubCategory = normalizeReference(coupon?.subCategory);
  const couponProduct = normalizeReference(coupon?.product);
  const itemCategory = normalizeReference(item?.category || item?.product?.category || item?.categoryId || item?.productCategory);
  const itemSubCategory = normalizeReference(item?.subCategory || item?.product?.subCategory || item?.subCategoryId || item?.productSubCategory);
  const itemProduct = normalizeReference(item?.product || item?.productId || item?.product?._id || item?.product_id);

  const categoryMatches = !couponCategory || itemCategory === couponCategory;
  const subCategoryMatches = !couponSubCategory || itemSubCategory === couponSubCategory;
  const productMatches = !couponProduct || itemProduct === couponProduct;

  return categoryMatches && subCategoryMatches && productMatches;
};

const isCouponApplicableToCart = (coupon, items = []) => {
  if (!coupon) return false;
  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) return false;

  const minimumQty = Number(coupon.minimumQuantity || 1);
  const matchingItems = (items || []).filter((item) => {
    const itemQty = Number(item?.qty || 1);
    return itemQty >= minimumQty && couponMatchesCartItem(coupon, item);
  });

  if (coupon.offerType === 'Category Offer' || coupon.category || coupon.subCategory || coupon.product) {
    return matchingItems.length > 0;
  }

  return true;
};

const validateCouponPayload = (body) => {
  const errors = [];
  if (!body.couponCode || !normalizeCouponCode(body.couponCode)) errors.push('Coupon code is required');
  if (!body.offerType) errors.push('Offer type is required');
  if (!body.discountType) errors.push('Discount type is required');
  if (body.discountValue === undefined || body.discountValue === null || Number(body.discountValue) < 0) {
    errors.push('Discount value is required');
  }
  if (Number(body.minOrderValue) < 0) errors.push('Minimum order cannot be negative');
  if (body.offerType === 'Cart Offer' && (body.minOrderValue === undefined || body.minOrderValue === null || Number(body.minOrderValue) <= 0)) {
    errors.push('Minimum order value is required for cart offers');
  }
  if (Number(body.usageLimit) < 0) errors.push('Usage limit cannot be negative');
  if (body.discountType === 'Percentage' && Number(body.discountValue) > 100) errors.push('Discount percentage cannot exceed 100%');
  if (body.startDate && body.endDate && new Date(body.startDate) > new Date(body.endDate)) {
    errors.push('Start date cannot be greater than end date');
  }
  if (body.discountType === 'Percentage' && (body.maxDiscount === undefined || body.maxDiscount === null || Number(body.maxDiscount) < 0)) {
    errors.push('Maximum discount is required for percentage offers');
  }
  return errors;
};

const setCouponStatus = async (coupon) => {
  const now = new Date();
  if (coupon.deleted) return;
  if (coupon.endDate && now > new Date(coupon.endDate)) {
    coupon.status = 'expired';
  } else if (coupon.status !== 'inactive') {
    coupon.status = 'active';
  }
  await coupon.save();
};

exports.getCoupons = async (req, res) => {
  try {
    const { status, offerType, search, page = 1, limit = 20 } = req.query;
    const filter = { deleted: false };

    if (status) filter.status = status;
    if (offerType) filter.offerType = offerType;
    if (search) filter.couponCode = { $regex: normalizeCouponCode(search), $options: 'i' };

    const total = await Coupon.countDocuments(filter);
    const coupons = await Coupon.find(filter)
      .populate('category', 'name')
      .populate('subCategory', 'name')
      .populate('product', 'name')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    for (const coupon of coupons) {
      await setCouponStatus(coupon);
    }

    res.json({ coupons, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCouponById = async (req, res) => {
  try {
    const coupon = await Coupon.findOne({ _id: req.params.id, deleted: false })
      .populate('category', 'name')
      .populate('subCategory', 'name')
      .populate('product', 'name');
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    await setCouponStatus(coupon);
    res.json(coupon);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createCoupon = async (req, res) => {
  try {
    const errors = validateCouponPayload(req.body);
    if (errors.length) return res.status(400).json({ message: errors[0] });

    const couponCode = normalizeCouponCode(req.body.couponCode);
    const existing = await Coupon.findOne({ couponCode, deleted: false });
    if (existing) return res.status(400).json({ message: 'Coupon code already exists' });

    const payload = {
      ...req.body,
      couponCode,
      discountValue: Number(req.body.discountValue),
      minOrderValue: Number(req.body.minOrderValue || 0),
      maxDiscount: Number(req.body.maxDiscount || 0),
      usageLimit: Number(req.body.usageLimit || 0),
      usageCount: Number(req.body.usageCount || 0),
      minimumQuantity: Number(req.body.minimumQuantity || 1),
      startDate: parseOptionalDate(req.body.startDate),
      endDate: parseOptionalDate(req.body.endDate),
      visible: req.body.visible !== false,
      showOnCheckout: req.body.showOnCheckout !== false,
      status: req.body.status || 'active',
      createdBy: req.user?._id || null,
    };

    const coupon = new Coupon(payload);
    await coupon.save();
    res.status(201).json(coupon);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateCoupon = async (req, res) => {
  try {
    const errors = validateCouponPayload(req.body);
    if (errors.length) return res.status(400).json({ message: errors[0] });

    const couponCode = normalizeCouponCode(req.body.couponCode);
    const existing = await Coupon.findOne({ couponCode, _id: { $ne: req.params.id }, deleted: false });
    if (existing) return res.status(400).json({ message: 'Coupon code already exists' });

    const payload = {
      ...req.body,
      couponCode,
      discountValue: Number(req.body.discountValue),
      minOrderValue: Number(req.body.minOrderValue || 0),
      maxDiscount: Number(req.body.maxDiscount || 0),
      usageLimit: Number(req.body.usageLimit || 0),
      minimumQuantity: Number(req.body.minimumQuantity || 1),
      startDate: parseOptionalDate(req.body.startDate),
      endDate: parseOptionalDate(req.body.endDate),
      visible: req.body.visible !== false,
      showOnCheckout: req.body.showOnCheckout !== false,
      status: req.body.status || 'active',
    };

    const coupon = await Coupon.findOneAndUpdate({ _id: req.params.id, deleted: false }, payload, { new: true });
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    res.json(coupon);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.toggleCouponStatus = async (req, res) => {
  try {
    const coupon = await Coupon.findOne({ _id: req.params.id, deleted: false });
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    coupon.status = coupon.status === 'active' ? 'inactive' : 'active';
    await coupon.save();
    res.json(coupon);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.toggleCouponVisibility = async (req, res) => {
  try {
    const coupon = await Coupon.findOne({ _id: req.params.id, deleted: false });
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    coupon.visible = !coupon.visible;
    await coupon.save();
    res.json(coupon);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findOne({ _id: req.params.id, deleted: false });
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    coupon.deleted = true;
    coupon.deletedAt = new Date();
    await coupon.save();
    res.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getEligibleCoupons = async (req, res) => {
  try {
    const payload = req.body || req.query || {};
    const { subtotal = 0, items = [] } = payload;
    const parsedItems = Array.isArray(items) ? items : (typeof items === 'string' ? JSON.parse(items) : []);
    const cartItems = await buildCartContext(parsedItems);
    const now = new Date();
    const coupons = await Coupon.find({
      deleted: false,
      status: 'active',
      visible: true,
      showOnCheckout: { $ne: false },
      $and: [
        {
          $or: [
            { startDate: { $exists: false } },
            { startDate: null },
            { startDate: { $lte: now } },
          ],
        },
        {
          $or: [
            { endDate: { $exists: false } },
            { endDate: null },
            { endDate: { $gte: now } },
          ],
        },
      ],
      minOrderValue: { $lte: Number(subtotal || 0) },
    }).sort({ createdAt: -1 });

    const eligible = coupons.filter((coupon) => {
      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) return false;
      if (Number(subtotal) < Number(coupon.minOrderValue || 0)) return false;
      return isCouponApplicableToCart(coupon, cartItems);
    });

    res.json(eligible);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.applyCoupon = async (req, res) => {
  try {
    const payload = req.body || {};
    const { couponCode, subtotal = 0, items = [] } = payload;
    const parsedItems = Array.isArray(items) ? items : (typeof items === 'string' ? JSON.parse(items) : []);
    const cartItems = await buildCartContext(parsedItems);
    const normalized = normalizeCouponCode(couponCode);
    if (!normalized) return res.status(400).json({ message: 'Coupon code is required' });

    const coupon = await Coupon.findOne({ couponCode: normalized, deleted: false });
    if (!coupon) return res.status(400).json({ message: 'Coupon not found' });

    if (coupon.deleted) return res.status(400).json({ message: 'Coupon is no longer available' });
    if (coupon.status !== 'active') return res.status(400).json({ message: 'Coupon is not active' });
    // Allow applying coupons even if they are not marked `visible` in admin
    // This enables manual application from checkout even when admin visibility is toggled.
    if (coupon.startDate && new Date(coupon.startDate) > new Date()) return res.status(400).json({ message: 'Coupon has not started yet' });
    if (coupon.endDate && new Date(coupon.endDate) < new Date()) return res.status(400).json({ message: 'Coupon has expired' });
    let effectiveUsageCount = Number(coupon.usageCount || 0);
    if (coupon.usageLimit) {
      const orderUsage = await Order.countDocuments({
        couponCode: coupon.couponCode,
        isPaid: true,
      });
      effectiveUsageCount = Math.max(effectiveUsageCount, orderUsage);
    }
    if (coupon.usageLimit && effectiveUsageCount >= coupon.usageLimit) return res.status(400).json({ message: 'Coupon usage limit reached' });
    if (Number(subtotal) < Number(coupon.minOrderValue || 0)) return res.status(400).json({ message: 'Minimum order value not met' });
    if (!isCouponApplicableToCart(coupon, cartItems)) return res.status(400).json({ message: 'Coupon is not applicable to the items in your cart' });

    let discountAmount = 0;
    if (coupon.discountType === 'Percentage') {
      discountAmount = Math.min((Number(subtotal) * Number(coupon.discountValue)) / 100, Number(coupon.maxDiscount || 0));
    } else {
      discountAmount = Math.min(Number(coupon.discountValue), Number(coupon.maxDiscount || Number(coupon.discountValue)));
    }

    // Note: usageCount is not incremented here. Coupon consumption is performed when an order completes payment.

    res.json({
      message: 'Coupon applied successfully',
      coupon,
      discountAmount,
      finalAmount: Math.max(Number(subtotal) - discountAmount, 0),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
