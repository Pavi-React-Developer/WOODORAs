const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    getWishlist,
    toggleWishlist,
    mergeWishlist
} = require('../controllers/userController');

// All user routes should be protected
router.use(protect);

router.route('/addresses')
    .get(getAddresses)
    .post(addAddress);

router.route('/addresses/:addressId')
    .put(updateAddress)
    .delete(deleteAddress);

// Wishlist routes
router.route('/wishlist')
    .get(getWishlist)
    .post(toggleWishlist);

router.route('/wishlist/merge')
    .post(mergeWishlist);

module.exports = router;
