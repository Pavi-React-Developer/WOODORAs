const CmsNavbar = require('../models/CmsNavbar');
const CmsHeroBanner = require('../models/CmsHeroBanner');
const CmsThirdBanner = require('../models/CmsThirdBanner');
const CmsProductGrid = require('../models/CmsProductGrid');
const CmsCategoryGrid = require('../models/CmsCategoryGrid');
const CmsFooter = require('../models/CmsFooter');
const ProductVariant = require('../models/ProductVariant');
const productService = require('../services/productService');

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

exports.createHeroBanner = asyncHandler(async (req, res) => {
  const banner = await CmsHeroBanner.create(req.body);
  res.status(201).json({ success: true, data: banner });
});

exports.updateHeroBanner = asyncHandler(async (req, res) => {
  const banner = await CmsHeroBanner.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after', runValidators: true });
  res.json({ success: true, data: banner });
});

exports.deleteHeroBanner = asyncHandler(async (req, res) => {
  await CmsHeroBanner.findByIdAndDelete(req.params.id);
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
  await CmsThirdBanner.findByIdAndDelete(req.params.id);
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
            productImages = v.images.map((url, idx) => ({ url, isThumbnail: idx === 0, displayOrder: idx + 1 }));
            break;
          }
        }
      }

      // 3rd: Fall back to old Product.images plain string array
      const fallbackImages = (prod.images || [])
        .filter(url => typeof url === 'string' && url.trim().length > 0)
        .map(url => ({ url, isThumbnail: false, displayOrder: 1 }));

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
            productImages = v.images.map((url, idx) => ({ url, isThumbnail: idx === 0, displayOrder: idx + 1 }));
            break;
          }
        }
      }

      const fallbackImages = (prod.images || [])
        .filter(url => typeof url === 'string' && url.trim().length > 0)
        .map(url => ({ url, isThumbnail: false, displayOrder: 1 }));

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
  await CmsCategoryGrid.findByIdAndDelete(req.params.id);
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
  if (!footer) {
    footer = await CmsFooter.create(req.body);
  } else {
    footer = await CmsFooter.findByIdAndUpdate(footer._id, req.body, { returnDocument: 'after', runValidators: true });
  }
  res.json({ success: true, data: footer });
});
