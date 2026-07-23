const express = require('express');
const router = express.Router();
const cmsController = require('../controllers/cmsController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes for storefront
router.get('/navbar', cmsController.getNavbar);
router.get('/hero', cmsController.getHeroBanners);
router.get('/third-banner', cmsController.getThirdBanners);
router.get('/product-grid', cmsController.getProductGrids);
router.get('/category-grid', cmsController.getCategoryGrids);
router.get('/footer', cmsController.getFooter);
router.get('/layout', cmsController.getLayout);

// Protected admin routes for CMS
router.put('/navbar', protect, authorize('admin'), cmsController.updateNavbar);

router.post('/hero', protect, authorize('admin'), cmsController.createHeroBanner);
router.put('/hero/:id', protect, authorize('admin'), cmsController.updateHeroBanner);
router.delete('/hero/:id', protect, authorize('admin'), cmsController.deleteHeroBanner);

router.post('/third-banner', protect, authorize('admin'), cmsController.createThirdBanner);
router.put('/third-banner/:id', protect, authorize('admin'), cmsController.updateThirdBanner);
router.delete('/third-banner/:id', protect, authorize('admin'), cmsController.deleteThirdBanner);

router.post('/product-grid', protect, authorize('admin'), cmsController.createProductGrid);
router.put('/product-grid/:id', protect, authorize('admin'), cmsController.updateProductGrid);
router.delete('/product-grid/:id', protect, authorize('admin'), cmsController.deleteProductGrid);

router.post('/category-grid', protect, authorize('admin'), cmsController.createCategoryGrid);
router.put('/category-grid/:id', protect, authorize('admin'), cmsController.updateCategoryGrid);
router.delete('/category-grid/:id', protect, authorize('admin'), cmsController.deleteCategoryGrid);

router.put('/footer', protect, authorize('admin'), cmsController.updateFooter);
router.put('/layout', protect, authorize('admin'), cmsController.updateLayout);

module.exports = router;
