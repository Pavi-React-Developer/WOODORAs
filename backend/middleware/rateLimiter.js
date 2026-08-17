const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const jwt = require('jsonwebtoken');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // limit each IP to 15 requests per windowMs for auth routes
    message: { success: false, message: 'Too many login/signup attempts from this IP, please try again later.' }
});

const authSpeedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 5, // allow 5 requests per 15 minutes, then...
    delayMs: (hits) => (hits - 5) * 500, // add 500ms of delay per request above 5
});

const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 requests per 15 minutes for normal users
    message: { success: false, message: 'Upload limit reached. Please try again later.' },
    skip: (req, res) => {
        // Skip rate limit if user is admin or staff
        try {
            let token;
            if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
                token = req.headers.authorization.split(' ')[1];
            } else if (req.cookies && req.cookies.token) {
                token = req.cookies.token;
            }

            if (token) {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                if (decoded && (decoded.role === 'admin' || decoded.role === 'staff' || decoded.isStaff === true)) {
                    return true; // Skip rate limiting for admin/staff
                }
            }
        } catch (error) {
            // If token is invalid or missing, do not skip
        }
        return false; // Apply rate limit
    }
});

module.exports = { authLimiter, authSpeedLimiter, uploadLimiter };
