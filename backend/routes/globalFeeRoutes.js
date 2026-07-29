const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getGlobalFee, updateGlobalFee } = require('../controllers/globalFeeController');

router
  .route('/')
  .get(getGlobalFee)
  .put(protect, authorize('admin'), updateGlobalFee);

module.exports = router;
