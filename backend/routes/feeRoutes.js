const express = require('express');
const router = express.Router();
const feeController = require('../controllers/feeController');
// const { protect, admin } = require('../middleware/authMiddleware'); 
// Assuming auth middleware exists if needed, but keeping it open for development as per standard routes. 
// If protect/admin is required, we can import them. Currently following standard pattern of other basic routes.

// Fee Categories
router.route('/categories')
  .get(feeController.getFeeCategories)
  .post(feeController.createFeeCategory);

router.route('/categories/:id')
  .delete(feeController.deleteFeeCategory);

// Payment Methods
router.route('/payment-methods')
  .get(feeController.getPaymentMethods)
  .post(feeController.createPaymentMethod);

// COD Availability
router.get('/cod-availability', feeController.checkCodAvailability);

// Fees
router.route('/')
  .get(feeController.getFees)
  .post(feeController.createFee);

router.route('/:feeId/weight-slabs')
  .post(feeController.createWeightSlab);

router.route('/:feeId/weight-slabs/reorder')
  .put(feeController.reorderWeightSlabs);

router.route('/:feeId/weight-slabs/:slabId')
  .put(feeController.updateWeightSlab)
  .delete(feeController.deleteWeightSlab);

router.route('/:id')
  .get(feeController.getFeeById)
  .put(feeController.updateFee)
  .delete(feeController.deleteFee);

module.exports = router;
