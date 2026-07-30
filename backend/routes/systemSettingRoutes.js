const express = require('express');
const router = express.Router();
const { getWalletConfig, updateWalletConfig } = require('../controllers/systemSettingController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/wallet')
  .get(getWalletConfig)
  .put(protect, authorize('admin'), updateWalletConfig);

module.exports = router;
