const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

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

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
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
        const Staff = require('../models/Staff');
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
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate a simple reset token
        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save();

        // In a real application, send this token via email
        // Mocking the email sending for now
        res.status(200).json({ 
            message: 'Email sent (Mocked)', 
            resetToken: resetToken // Returning token for demonstration purposes
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
        if (profileImage !== undefined) user.profileImage = String(profileImage).trim();
        if (addresses !== undefined) user.addresses = normalizeAddresses(addresses);
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

module.exports = { registerUser, loginUser, refreshToken, forgotPassword, getProfile, updateProfile, getCustomers, getCustomerOrders };
