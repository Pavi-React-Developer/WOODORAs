const CmsNavbar = require('../models/CmsNavbar');
const CmsHeroBanner = require('../models/CmsHeroBanner');
const CmsThirdBanner = require('../models/CmsThirdBanner');
const CmsProductGrid = require('../models/CmsProductGrid');
const CmsCategoryGrid = require('../models/CmsCategoryGrid');
const CmsFooter = require('../models/CmsFooter');
const ProductVariant = require('../models/ProductVariant');
const CmsLayout = require('../models/CmsLayout');
const productService = require('../services/productService');
const { deleteFromCloudinary } = require('../services/uploadService');

// Utility to wrap async functions
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// --- NAVBAR ---
exports.getNavbars = asyncHandler(async (req, res) => {
  const navbars = await CmsNavbar.find().sort({ order: 1 });
  res.json({ success: true, data: navbars });
});

exports.createNavbar = asyncHandler(async (req, res) => {
  const navbar = await CmsNavbar.create(req.body);
  res.status(201).json({ success: true, data: navbar });
});

exports.updateNavbar = asyncHandler(async (req, res) => {
  const navbar = await CmsNavbar.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after', runValidators: true });
  res.json({ success: true, data: navbar });
});

exports.deleteNavbar = asyncHandler(async (req, res) => {
  await CmsNavbar.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Navbar deleted' });
});

// --- HERO BANNER ---
exports.getHeroBanners = asyncHandler(async (req, res) => {
  const banners = await CmsHeroBanner.find().sort({ sortOrder: 1 });
  res.json({ success: true, data: banners });
});

const processMediaFields = (body) => {
  const cloned = { ...body };
  const unsetFields = {};
  const fields = ['bannerImage', 'mobileBanner', 'desktopVideo', 'mobileVideo', 'ctaImage', 'logo'];
  fields.forEach(field => {
    if (cloned[field] === "" || cloned[field] === null) {
      delete cloned[field];
      unsetFields[field] = 1;
    }
  });

  if (Array.isArray(cloned.items)) {
    cloned.items = cloned.items.map(item => {
      if (item.desktopUrl === "" || item.desktopUrl === null) delete item.desktopUrl;
      if (item.mobileUrl === "" || item.mobileUrl === null) delete item.mobileUrl;
      return item;
    });
  }
  
  // If there are fields to unset, wrap the update in $set and $unset
  if (Object.keys(unsetFields).length > 0) {
    return { $set: cloned, $unset: unsetFields };
  }
  return cloned;
};

exports.createHeroBanner = asyncHandler(async (req, res) => {
  const banner = await CmsHeroBanner.create(processMediaFields(req.body).$set || processMediaFields(req.body));
  res.status(201).json({ success: true, data: banner });
});

exports.updateHeroBanner = asyncHandler(async (req, res) => {
  const updateData = processMediaFields(req.body);
  const banner = await CmsHeroBanner.findByIdAndUpdate(req.params.id, updateData, { returnDocument: 'after', runValidators: true });
  res.json({ success: true, data: banner });
});

exports.deleteHeroBanner = asyncHandler(async (req, res) => {
  const banner = await CmsHeroBanner.findById(req.params.id);
  if (banner) {
    if (banner.bannerImage?.public_id) await deleteFromCloudinary(banner.bannerImage.public_id, 'image').catch(console.error);
    if (banner.mobileBanner?.public_id) await deleteFromCloudinary(banner.mobileBanner.public_id, 'image').catch(console.error);
    if (banner.desktopVideo?.public_id) await deleteFromCloudinary(banner.desktopVideo.public_id, 'video').catch(console.error);
    if (banner.mobileVideo?.public_id) await deleteFromCloudinary(banner.mobileVideo.public_id, 'video').catch(console.error);
    if (banner.ctaImage?.public_id) await deleteFromCloudinary(banner.ctaImage.public_id, 'image').catch(console.error);
    await banner.deleteOne();
  }
  res.json({ success: true, message: 'Banner deleted' });
});

// --- THIRD BANNER ---
exports.getThirdBanners = asyncHandler(async (req, res) => {
  const banners = await CmsThirdBanner.find().sort({ sortOrder: 1 });
  res.json({ success: true, data: banners });
});

exports.createThirdBanner = asyncHandler(async (req, res) => {
  const banner = await CmsThirdBanner.create(req.body);
  res.status(201).json({ success: true, data: banner });
});

exports.updateThirdBanner = asyncHandler(async (req, res) => {
  const banner = await CmsThirdBanner.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after', runValidators: true });
  res.json({ success: true, data: banner });
});

exports.deleteThirdBanner = asyncHandler(async (req, res) => {
  const banner = await CmsThirdBanner.findById(req.params.id);
  if (banner) {
    for (let img of (banner.leftImages || [])) {
      if (img.public_id) await deleteFromCloudinary(img.public_id, img.resource_type || 'image').catch(console.error);
    }
    for (let img of (banner.rightImages || [])) {
      if (img.public_id) await deleteFromCloudinary(img.public_id, img.resource_type || 'image').catch(console.error);
    }
    await banner.deleteOne();
  }
  res.json({ success: true, message: 'Banner deleted' });
});

// --- PRODUCT GRID ---
exports.getProductGrids = asyncHandler(async (req, res) => {
  const ProductImage = require('../models/catalog/ProductImage');
  const grids = await CmsProductGrid.find().populate('products').sort({ sortOrder: 1 });

  // Enrich each product with images from ProductImage collection
  const enrichedGrids = await Promise.all(grids.map(async (grid) => {
    const gridObj = grid.toObject();
    gridObj.products = await Promise.all((gridObj.products || []).map(async (prod) => {
      if (!prod || !prod._id) return prod;

      // 1st: Try ProductImage collection (new system)
      let productImages = await ProductImage.find({ product: prod._id }).sort({ displayOrder: 1 });

      // 2nd: Try ProductVariant images (some products use variants)
      if (productImages.length === 0) {
        const variants = await ProductVariant.find({ product: prod._id }).limit(3);
        for (const v of variants) {
          if (v.images && v.images.length > 0) {
            productImages = v.images.map((img, idx) => ({ url: typeof img === 'string' ? img : img.url, isThumbnail: idx === 0, displayOrder: idx + 1 }));
            break;
          }
        }
      }

      // 3rd: Fall back to old Product.images
      const fallbackImages = (prod.images || [])
        .filter(img => (typeof img === 'string' && img.trim().length > 0) || (typeof img === 'object' && img.url))
        .map(img => ({ url: typeof img === 'string' ? img : img.url, isThumbnail: false, displayOrder: 1 }));

      const variants = await ProductVariant.find({ product: prod._id }).limit(3);
      const pricing = productService.buildProductPricing(prod, variants, productImages.length > 0 ? productImages : fallbackImages);

      return {
        ...prod,
        ...pricing,
        images: productImages.length > 0 ? productImages : fallbackImages,
      };
    }));
    return gridObj;
  }));

  res.json({ success: true, data: enrichedGrids });
});

exports.createProductGrid = asyncHandler(async (req, res) => {
  const grid = await CmsProductGrid.create(req.body);
  res.status(201).json({ success: true, data: grid });
});

exports.updateProductGrid = asyncHandler(async (req, res) => {
  const grid = await CmsProductGrid.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after', runValidators: true }).populate('products');
  res.json({ success: true, data: grid });
});

exports.deleteProductGrid = asyncHandler(async (req, res) => {
  await CmsProductGrid.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Grid deleted' });
});

// --- CATEGORY GRID ---
exports.getCategoryGrids = asyncHandler(async (req, res) => {
  const ProductImage = require('../models/catalog/ProductImage');
  const grids = await CmsCategoryGrid.find().populate('category').populate('products').sort({ sortOrder: 1 });

  const enrichedGrids = await Promise.all(grids.map(async (grid) => {
    const gridObj = grid.toObject();
    gridObj.products = await Promise.all((gridObj.products || []).map(async (prod) => {
      if (!prod || !prod._id) return prod;

      let productImages = await ProductImage.find({ product: prod._id }).sort({ displayOrder: 1 });

      if (productImages.length === 0) {
        const variants = await ProductVariant.find({ product: prod._id }).limit(3);
        for (const v of variants) {
          if (v.images && v.images.length > 0) {
            productImages = v.images.map((img, idx) => ({ url: typeof img === 'string' ? img : img.url, isThumbnail: idx === 0, displayOrder: idx + 1 }));
            break;
          }
        }
      }

      const fallbackImages = (prod.images || [])
        .filter(img => (typeof img === 'string' && img.trim().length > 0) || (typeof img === 'object' && img.url))
        .map(img => ({ url: typeof img === 'string' ? img : img.url, isThumbnail: false, displayOrder: 1 }));

      const variants = await ProductVariant.find({ product: prod._id }).limit(3);
      const pricing = productService.buildProductPricing(prod, variants, productImages.length > 0 ? productImages : fallbackImages);

      return {
        ...prod,
        ...pricing,
        images: productImages.length > 0 ? productImages : fallbackImages,
      };
    }));
    return gridObj;
  }));

  res.json({ success: true, data: enrichedGrids });
});

exports.createCategoryGrid = asyncHandler(async (req, res) => {
  const grid = await CmsCategoryGrid.create(req.body);
  res.status(201).json({ success: true, data: grid });
});

exports.updateCategoryGrid = asyncHandler(async (req, res) => {
  const grid = await CmsCategoryGrid.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after', runValidators: true }).populate('category').populate('products');
  res.json({ success: true, data: grid });
});

exports.deleteCategoryGrid = asyncHandler(async (req, res) => {
  const grid = await CmsCategoryGrid.findById(req.params.id);
  if (grid) {
    for (let img of (grid.images || [])) {
      if (img.public_id) await deleteFromCloudinary(img.public_id, img.resource_type || 'image').catch(console.error);
    }
    await grid.deleteOne();
  }
  res.json({ success: true, message: 'Category grid deleted' });
});

// --- FOOTER ---
exports.getFooter = asyncHandler(async (req, res) => {
  let footer = await CmsFooter.findOne();
  if (!footer) {
    footer = await CmsFooter.create({});
  }
  res.json({ success: true, data: footer });
});

exports.updateFooter = asyncHandler(async (req, res) => {
  let footer = await CmsFooter.findOne();
  const updateData = processMediaFields(req.body);
  
  if (!footer) {
    footer = await CmsFooter.create(updateData.$set || updateData);
  } else {
    footer = await CmsFooter.findByIdAndUpdate(footer._id, updateData, { returnDocument: 'after', runValidators: true });
  }
  res.json({ success: true, data: footer });
});

// --- LAYOUT ---
exports.getLayout = asyncHandler(async (req, res) => {
  let layout = await CmsLayout.findOne({ page: 'home' });
  if (!layout) {
    layout = await CmsLayout.create({
      page: 'home',
      sections: [
        { id: 'navbar', order: 1, visible: true },
        { id: 'heroBanner', order: 2, visible: true },
        { id: 'thirdBanner', order: 3, visible: true },
        { id: 'categoryGrid', order: 4, visible: true },
        { id: 'productGrid', order: 5, visible: true },
        { id: 'footer', order: 6, visible: true },
      ]
    });
  }
  res.json({ success: true, data: layout });
});

exports.updateLayout = asyncHandler(async (req, res) => {
  let layout = await CmsLayout.findOne({ page: 'home' });
  if (!layout) {
    layout = await CmsLayout.create({ page: 'home', sections: req.body.sections });
  } else {
    layout.sections = req.body.sections;
    await layout.save();
  }
  res.json({ success: true, data: layout });
});
