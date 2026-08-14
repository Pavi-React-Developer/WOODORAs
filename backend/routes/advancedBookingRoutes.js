const express = require('express');
const router = express.Router();
const advancedBookingController = require('../controllers/advancedBookingController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public or semi-public routes (guest or logged-in users)
// Using an optional auth middleware if we want to allow guests, but for now we'll just check if req.user exists in the controller
// Let's use a custom middleware or just make it public and handle req.user if token provided.
// Let's create an extractUser inline if it doesn't exist, or just use a simple one
const optionalAuth = async (req, res, next) => {
    try {
        const jwt = require('jsonwebtoken');
        const User = require('../models/User');
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
        }
        next();
    } catch (error) {
        next(); // If token fails, just proceed as guest
    }
};

router.post('/', optionalAuth, advancedBookingController.createBooking);

// User protected routes
router.get('/my-bookings', protect, advancedBookingController.getUserBookings);

// Admin protected routes
const adminAuth = authorize('admin');
router.get('/admin', protect, adminAuth, advancedBookingController.getAllBookings);
router.put('/admin/:id/status', protect, adminAuth, advancedBookingController.updateBookingStatus);
router.delete('/admin/:id', protect, adminAuth, advancedBookingController.deleteBooking);

module.exports = router;
