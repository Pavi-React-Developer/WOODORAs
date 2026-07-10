const express = require('express');
const router = express.Router();
const { getWalletSummary } = require('../controllers/walletController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getWalletSummary);

module.exports = router;
