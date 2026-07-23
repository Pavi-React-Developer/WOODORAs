const jwt = require('jsonwebtoken');
const User = require('../models/User');

const getAuthFailureResponse = (message, reason) => {
    const response = { message };
    if (process.env.NODE_ENV !== 'production' && reason) {
        response.reason = reason;
    }
    return response;
};

const protect = async (req, res, next) => {
    const authorization = req.headers.authorization || '';
    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    if (!process.env.JWT_SECRET) {
        return res
            .status(500)
            .json(getAuthFailureResponse('Authentication is not configured', 'missing_jwt_secret'));
    }

    try {
        const decoded = jwt.verify(token.trim(), process.env.JWT_SECRET);
        let user = await User.findById(decoded.id).select('-password');

        // If not found in User collection, check Staff collection
        if (!user) {
            const Staff = require('../models/Staff');
            const staff = await Staff.findById(decoded.id).select('-password');
            if (staff) {
                // Map staff fields to match expected user shape
                req.user = { _id: staff._id, name: staff.fullName, email: staff.email, role: staff.role, isStaff: true, permissions: staff.permissions };
                return next();
            }
            return res
                .status(401)
                .json(getAuthFailureResponse('Not authorized, user not found', 'user_not_found'));
        }

        req.user = user;
        return next();
    } catch (error) {
        return res
            .status(401)
            .json(getAuthFailureResponse('Not authorized, token failed', error.name));
    }
};

const optionalAuth = async (req, res, next) => {
    const authorization = req.headers.authorization || '';
    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token.trim(), process.env.JWT_SECRET);
        let user = await User.findById(decoded.id).select('-password');
        if (user) {
            req.user = user;
        }
    } catch (error) {
        // Ignore errors, just proceed without req.user
    }
    return next();
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authorized, no user context' });
        }

        // Admin users always pass
        if (roles.includes(req.user.role?.toLowerCase())) {
            return next();
        }

        // Staff users with isStaff flag are allowed through admin routes
        // (their access is controlled by permissions on the frontend)
        if (req.user.isStaff) {
            return next();
        }

        return res.status(403).json({ message: `User role ${req.user.role} is not authorized to access this route` });
    };
};

module.exports = { protect, optionalAuth, authorize };
