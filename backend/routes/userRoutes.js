const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress
} = require('../controllers/userController');

// All user routes should be protected
router.use(protect);

router.route('/addresses')
    .get(getAddresses)
    .post(addAddress);

router.route('/addresses/:addressId')
    .put(updateAddress)
    .delete(deleteAddress);

module.exports = router;
