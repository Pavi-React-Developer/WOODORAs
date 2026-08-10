const User = require('../models/User');
const Staff = require('../models/Staff');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('../services/emailService');

const generateAccessToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' }); // 30 days
};

const generateRefreshToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' }); // 7 days
};

const serializeUser = (user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || '',
    dateOfBirth: user.dateOfBirth || null,
    gender: user.gender || '',
    profileImage: user.profileImage || '',
    addresses: user.addresses || [],
    preferences: user.preferences || { preferredAgeGroup: 'All Ages', emailNotifications: true },
    loyalty: user.loyalty || { points: 0, tier: 'Premium Member' },
    wallet: user.wallet || { balance: 0, currency: 'INR', status: 'active' },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});

const normalizeAddresses = (addresses = []) => {
    if (!Array.isArray(addresses)) return [];

    return addresses.map((address, index) => ({
        label: address.label || 'Home',
        fullName: address.fullName || '',
        phone: address.phone || '',
        address: address.address || '',
        city: address.city || '',
        state: address.state || '',
        pinCode: address.pinCode || '',
        landmark: address.landmark || '',
        isDefault: Boolean(address.isDefault || index === 0),
    }));
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password, role } = req.body;

    // Inline Validation
    if (!name || name.trim().length === 0) {
        return res.status(400).json({ message: 'Name is required' });
    }
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ message: 'A valid email is required' });
    }
    if (!password || password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    try {
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            name,
            email,
            password,
            role: role || 'user'
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateAccessToken(user._id),
                refreshToken: generateRefreshToken(user._id)
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body || {};

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ message: 'A valid email is required' });
    }
    if (!password) {
        return res.status(400).json({ message: 'Password is required' });
    }

    try {
        // First check the User collection
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            return res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateAccessToken(user._id),
                refreshToken: generateRefreshToken(user._id)
            });
        }

        // If not found in User, check the Staff collection

        const staff = await Staff.findOne({ email: email.toLowerCase() });

        if (staff && (await staff.matchPassword(password))) {
            // Check if staff is active
            if (staff.status !== 'active') {
                return res.status(401).json({ message: 'Your account is inactive. Contact admin.' });
            }
            return res.json({
                _id: staff._id,
                name: staff.fullName,
                email: staff.email,
                role: staff.role,
                isStaff: true,
                token: generateAccessToken(staff._id),
                refreshToken: generateRefreshToken(staff._id)
            });
        }

        res.status(401).json({ message: 'Invalid email or password' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get new access token from refresh token
// @route   POST /api/auth/refresh
// @access  Public
const refreshToken = async (req, res) => {
    const { token } = req.body || {};

    if (!token) {
        return res.status(401).json({ message: 'No refresh token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        const accessToken = generateAccessToken(decoded.id);
        res.json({ token: accessToken });
    } catch (error) {
        res.status(403).json({ message: 'Invalid refresh token' });
    }
};

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
const forgotPassword = async (req, res) => {
    const { email } = req.body || {};

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            // Fix #10 (security): Do not reveal whether an email exists to prevent user enumeration attacks.
            return res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
        }

        // Generate a cryptographically secure reset token
        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
        await user.save();

        // Dynamically get the frontend URL from the request origin, fallback to env, then localhost
        const frontendUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:5173';
        const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
        await sendPasswordResetEmail(user.email, resetUrl);

        res.status(200).json({
            message: 'If an account with that email exists, a password reset link has been sent.',
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get logged-in customer profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
    try {
        res.json({
            message: 'Profile data accessible by any logged-in user',
            user: serializeUser(req.user),
        });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to fetch profile' });
    }
};

// @desc    Update logged-in customer profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const {
            name,
            phone,
            dateOfBirth,
            gender,
            profileImage,
            addresses,
            preferences,
        } = req.body || {};

        if (name !== undefined) user.name = String(name).trim();
        if (phone !== undefined) user.phone = String(phone).trim();
        if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : undefined;
        if (gender !== undefined) user.gender = gender || '';
        if (profileImage !== undefined) user.profileImage = profileImage;
        if (addresses !== undefined) user.addresses = normalizeAddresses(addresses);
        
        // Sync profile personal details to default address automatically
        if (user.addresses && user.addresses.length > 0) {
            const defaultAddr = user.addresses.find(a => a.isDefault) || user.addresses[0];
            if (defaultAddr) {
                if (name !== undefined) defaultAddr.fullName = String(name).trim();
                if (phone !== undefined) defaultAddr.phone = String(phone).trim();
            }
        }

        if (preferences !== undefined) {
            user.preferences = {
                preferredAgeGroup: preferences.preferredAgeGroup || user.preferences?.preferredAgeGroup || 'All Ages',
                emailNotifications: preferences.emailNotifications !== undefined
                    ? Boolean(preferences.emailNotifications)
                    : user.preferences?.emailNotifications !== false,
            };
        }

        const updatedUser = await user.save();

        res.json({
            message: 'Profile updated successfully',
            user: serializeUser(updatedUser),
        });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to update profile' });
    }
};

// @desc    Get all customers with their order stats (Admin only)
// @route   GET /api/auth/customers
// @access  Private/Admin
const getCustomers = async (req, res) => {
    try {
        const Order = require('../models/Order');
        const users = await User.find({ role: 'user' }).select('-password -resetPasswordToken -resetPasswordExpire').lean();

        // Aggregate total orders count (all statuses) per user
        const allOrderStats = await Order.aggregate([
            { $group: {
                _id: '$user',
                totalOrders: { $sum: 1 },
                lastOrderDate: { $max: '$createdAt' }
            }}
        ]);

        // Aggregate total spend — only Delivered orders count
        const deliveredStats = await Order.aggregate([
            { $match: { status: 'Delivered' } },
            { $group: {
                _id: '$user',
                totalSpend: { $sum: '$totalPrice' }
            }}
        ]);

        const allStatsMap = {};
        allOrderStats.forEach(s => { allStatsMap[String(s._id)] = s; });

        const spendMap = {};
        deliveredStats.forEach(s => { spendMap[String(s._id)] = s.totalSpend; });

        const customers = users.map(u => {
            const stats = allStatsMap[String(u._id)] || { totalOrders: 0, lastOrderDate: null };
            return {
                ...u,
                totalOrders: stats.totalOrders,
                totalSpend: spendMap[String(u._id)] || 0,
                lastOrderDate: stats.lastOrderDate,
            };
        });

        // Sort by totalSpend desc
        customers.sort((a, b) => (b.totalSpend || 0) - (a.totalSpend || 0));

        res.json(customers);
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to fetch customers' });
    }
};

// @desc    Get a single customer's order history (Admin only)
// @route   GET /api/auth/customers/:id/orders
// @access  Private/Admin
const getCustomerOrders = async (req, res) => {
    try {
        const Order = require('../models/Order');
        const orders = await Order.find({ user: req.params.id })
            .populate('orderItems.product', 'name image')
            .sort({ createdAt: -1 })
            .lean();
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to fetch customer orders' });
    }
};

// @desc    OAuth success callback to generate tokens and redirect
// @route   GET /api/auth/:provider/callback
// @access  Public
const oauthSuccessCallback = (req, res) => {
    try {
        if (!req.user) {
            return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=OAuthFailed`);
        }

        const token = generateAccessToken(req.user._id);
        const refreshToken = generateRefreshToken(req.user._id);
        
        // Redirect to frontend OAuthCallback page with tokens
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const redirectUrl = `${frontendUrl}/oauth-success?token=${token}&refreshToken=${refreshToken}`;
        
        res.redirect(redirectUrl);
    } catch (error) {
        console.error('OAuth Callback Error:', error);
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=OAuthCallbackError`);
    }
};

// @desc    Verify reset password token
// @route   GET /api/auth/reset-password/verify?token=TOKEN
// @access  Public
const verifyResetToken = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) {
            return res.json({ valid: false });
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.json({ valid: false });
        }

        res.json({ valid: true });
    } catch (error) {
        console.error('Verify Token Error:', error);
        res.json({ valid: false });
    }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
    try {
        const { token, password, confirmPassword } = req.body;
        
        if (!token || !password || !confirmPassword) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        
        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        // Basic password validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ message: 'Password does not meet the required security rules.' });
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'This password reset link is invalid or has expired.' });
        }

        // Update password (pre-save hook will hash it)
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.json({ message: 'Password has been updated successfully.' });
    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ message: 'Server error during password reset' });
    }
};

module.exports = { registerUser, loginUser, refreshToken, forgotPassword, verifyResetToken, resetPassword, getProfile, updateProfile, getCustomers, getCustomerOrders, oauthSuccessCallback };
