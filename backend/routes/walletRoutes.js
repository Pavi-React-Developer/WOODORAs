const express = require('express');
const router = express.Router();
const { getWalletSummary } = require('../controllers/walletController');
const { protect } = require('../middleware/authMiddleware');
const { checkWalletEnabled } = require('../middleware/walletToggleMiddleware');

router.route('/').get(protect, checkWalletEnabled, getWalletSummary);

module.exports = router;
