const express = require('express');
const router = express.Router();
const passport = require('passport');
const { registerUser, loginUser, refreshToken, forgotPassword, getProfile, updateProfile, getCustomers, getCustomerOrders, oauthSuccessCallback } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/refresh', refreshToken);
router.post('/forgotpassword', forgotPassword);

// ==========================================
// OAuth Routes
// ==========================================

// Google
router.get('/google', passport.authenticate('google', { session: false }));
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/login?error=OAuthFailed' }), oauthSuccessCallback);

// Facebook
router.get('/facebook', passport.authenticate('facebook', { session: false, scope: ['email'] }));
router.get('/facebook/callback', passport.authenticate('facebook', { session: false, failureRedirect: '/login?error=OAuthFailed' }), oauthSuccessCallback);

// GitHub
router.get('/github', passport.authenticate('github', { session: false }));
router.get('/github/callback', passport.authenticate('github', { session: false, failureRedirect: '/login?error=OAuthFailed' }), oauthSuccessCallback);

// Microsoft
router.get('/microsoft', passport.authenticate('microsoft', { session: false, prompt: 'select_account' }));
router.get('/microsoft/callback', passport.authenticate('microsoft', { session: false, failureRedirect: '/login?error=OAuthFailed' }), oauthSuccessCallback);

// Apple
router.get('/apple', passport.authenticate('apple', { session: false }));
router.post('/apple/callback', express.urlencoded({ extended: true }), passport.authenticate('apple', { session: false, failureRedirect: '/login?error=OAuthFailed' }), oauthSuccessCallback);


router.route('/profile').get(protect, getProfile).put(protect, updateProfile);

// Example of an admin-only route
router.get('/admin', protect, authorize('admin'), (req, res) => {
    res.json({ message: 'Admin dashboard data accessible only by admins' });
});

// Example of a staff-only route (staff and admin can usually access staff areas)
router.get('/staff', protect, authorize('staff', 'admin'), (req, res) => {
    res.json({ message: 'Staff area data' });
});

// Admin: Customer Management
router.route('/customers').get(protect, authorize('admin', 'manager', 'staff'), getCustomers);
router.route('/customers/:id/orders').get(protect, authorize('admin', 'manager', 'staff'), getCustomerOrders);

module.exports = router;
