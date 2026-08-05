const express = require('express');
const router = express.Router();
const cmsController = require('../controllers/cmsController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { cacheMiddleware, clearCache } = require('../middleware/cacheMiddleware');

// Public routes for storefront
router.get('/navbar', cacheMiddleware(300), cmsController.getNavbar);
router.get('/hero', cacheMiddleware(300), cmsController.getHeroBanners);
router.get('/third-banner', cacheMiddleware(300), cmsController.getThirdBanners);
router.get('/gift-card-banner', cacheMiddleware(300), cmsController.getGiftCardBanners);
router.get('/customize-banner', cacheMiddleware(300), cmsController.getCustomizeBanner);
router.get('/product-grid', cacheMiddleware(300), cmsController.getProductGrids);
router.get('/category-grid', cacheMiddleware(300), cmsController.getCategoryGrids);
router.get('/categories-grid', cacheMiddleware(300), cmsController.getCategoriesGrids);
router.get('/footer', cacheMiddleware(300), cmsController.getFooter);
router.get('/layout', cacheMiddleware(300), cmsController.getLayout);
router.get('/review-config', cacheMiddleware(300), cmsController.getReviewConfig);
router.get('/review-config/approved', protect, authorize('admin'), cmsController.getApprovedReviews);

// Helper to clear cache on updates
const bustCache = (req, res, next) => {
    clearCache();
    next();
};

// Protected admin routes for CMS
router.put('/navbar', protect, authorize('admin'), bustCache, cmsController.updateNavbar);

router.post('/hero', protect, authorize('admin'), bustCache, cmsController.createHeroBanner);
router.put('/hero/:id', protect, authorize('admin'), bustCache, cmsController.updateHeroBanner);
router.delete('/hero/:id', protect, authorize('admin'), bustCache, cmsController.deleteHeroBanner);

router.post('/third-banner', protect, authorize('admin'), bustCache, cmsController.createThirdBanner);
router.put('/third-banner/:id', protect, authorize('admin'), bustCache, cmsController.updateThirdBanner);
router.delete('/third-banner/:id', protect, authorize('admin'), bustCache, cmsController.deleteThirdBanner);

router.post('/gift-card-banner', protect, authorize('admin'), bustCache, cmsController.createGiftCardBanner);
router.put('/gift-card-banner/:id', protect, authorize('admin'), bustCache, cmsController.updateGiftCardBanner);
router.delete('/gift-card-banner/:id', protect, authorize('admin'), bustCache, cmsController.deleteGiftCardBanner);

router.post('/product-grid', protect, authorize('admin'), bustCache, cmsController.createProductGrid);
router.put('/product-grid/:id', protect, authorize('admin'), bustCache, cmsController.updateProductGrid);
router.delete('/product-grid/:id', protect, authorize('admin'), bustCache, cmsController.deleteProductGrid);

router.post('/category-grid', protect, authorize('admin'), bustCache, cmsController.createCategoryGrid);
router.put('/category-grid/:id', protect, authorize('admin'), bustCache, cmsController.updateCategoryGrid);
router.delete('/category-grid/:id', protect, authorize('admin'), bustCache, cmsController.deleteCategoryGrid);

router.post('/categories-grid', protect, authorize('admin'), bustCache, cmsController.createCategoriesGrid);
router.put('/categories-grid/:id', protect, authorize('admin'), bustCache, cmsController.updateCategoriesGrid);
router.delete('/categories-grid/:id', protect, authorize('admin'), bustCache, cmsController.deleteCategoriesGrid);

router.put('/customize-banner', protect, authorize('admin'), bustCache, cmsController.updateCustomizeBanner);

router.put('/footer', protect, authorize('admin'), bustCache, cmsController.updateFooter);
router.put('/layout', protect, authorize('admin'), bustCache, cmsController.updateLayout);
router.put('/review-config', protect, authorize('admin'), bustCache, cmsController.updateReviewConfig);

module.exports = router;
