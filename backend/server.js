const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const catalogRoutes = require('./routes/catalogRoutes');
const catalogV2Routes = require('./routes/catalogV2Routes');
const staffRoutes = require('./routes/staffRoutes');
const roleRoutes = require('./routes/roleRoutes');
const orderRoutes = require('./routes/orderRoutes');
const cartRoutes = require('./routes/cartRoutes');
const userRoutes = require('./routes/userRoutes');
const feeRoutes = require('./routes/feeRoutes');
const cancellationRoutes = require('./routes/cancellationRoutes');
const refundRoutes = require('./routes/refundRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const reviewRoutes  = require('./routes/reviewRoutes');
const couponRoutes = require('./routes/couponRoutes');
const cmsRoutes = require('./routes/cmsRoutes');
const bulkOrderRoutes = require('./routes/bulkOrderRoutes');
const productFeeRoutes = require('./routes/productFeeRoutes');
const giftCardRoutes = require('./routes/giftCardRoutes');
const customizeRoutes = require('./routes/customizeRoutes');
const walletRoutes = require('./routes/walletRoutes');
const Order = require('./models/Order');
const Review = require('./models/Review');
const Module = require('./models/Module');
const StaffModel = require('./models/Staff');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Seed default attributes once DB is open
mongoose.connection.once('open', async () => {
    try {
        await Review.collection.dropIndex('product_1_user_1');
        console.log('Dropped legacy review unique index product_1_user_1');
    } catch (err) {
        if (err.codeName !== 'IndexNotFound' && err.code !== 27) {
            console.warn('Could not drop legacy review index:', err.message);
        }
    }

    try {
        const duplicates = await Review.aggregate([
            { $match: { user: { $exists: true }, orderId: { $exists: false } } },
            { $group: { _id: '$user', count: { $sum: 1 }, docs: { $push: '$_id' } } },
            { $match: { count: { $gt: 1 } } },
        ]);

        for (const dup of duplicates) {
            const ids = dup.docs.slice(1);
            if (ids.length > 0) {
                await Review.deleteMany({ _id: { $in: ids } });
            }
        }
    } catch (err) {
        console.warn('Could not clean legacy review duplicates:', err.message);
    }

    await Review.syncIndexes();
    console.log('Connected to DB. Valid order statuses:', Order.VALID_STATUSES.join(', '));
    try {
        const existingModules = await Module.find({});
        const existingKeys = existingModules.map(m => m.key);
        const missingKeys = (StaffModel.PERMISSION_MODULES || []).filter(k => !existingKeys.includes(k));

        if (missingKeys.length > 0) {
            const maxOrder = existingModules.length > 0 ? Math.max(...existingModules.map(m => m.displayOrder || 0)) : -1;
            const initial = missingKeys.map((k, i) => ({
                key: k,
                label: k.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
                icon: '',
                isActive: true,
                displayOrder: maxOrder + 1 + i,
            }));
            await Module.insertMany(initial);
            console.log(`Seeded missing modules: ${missingKeys.join(', ')}`);
        }
    } catch (err) {
        console.warn('Could not seed Module collection:', err.message);
    }
});

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const passport = require('./config/passport');
app.use(passport.initialize());
app.use(cors({
    origin: function (origin, callback) {
        const allowedOrigins = [
            'https://marakathai.com',
            'https://linen-finch-820225.hostingersite.com',
            'https://papayawhip-lemur-557495.hostingersite.com',
            'http://localhost:4173',
            'http://localhost:5173'
        ];
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            // Silently reject instead of throwing an Error so static files still load
            callback(null, false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/v2/catalog', catalogV2Routes);
app.use('/api/staff', staffRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/cancellation-rules', cancellationRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/bulk-orders', bulkOrderRoutes);
app.use('/api/gift-cards', giftCardRoutes);
app.use('/api/customize', customizeRoutes);
app.use('/api/product-fees', productFeeRoutes);
app.use('/api/refunds', refundRoutes);
app.use('/api/settings', require('./routes/systemSettingRoutes'));

// Serve static frontend build
app.use(express.static(path.join(__dirname, 'public')));

// Handle 404 for API routes so they don't fall through to the SPA fallback
app.use('/api', (req, res) => {
    res.status(404).json({ success: false, message: 'API Route Not Found' });
});

// SPA Fallback: Any route not handled by the API will serve the React app
app.use((req, res) => {
    const fs = require('fs');
    
    // Attempt to dynamically find the Hostinger public_html folder based on the current path
    // e.g. /home/user/domains/domain.com/.builds/.../nodejs -> /home/user/domains/domain.com/public_html
    let hostingerPublicHtml = null;
    const match = __dirname.match(/(.*?\/domains\/[^/]+)\//);
    if (match && match[1]) {
        hostingerPublicHtml = path.join(match[1], 'public_html', 'index.html');
    }

    const possiblePaths = [
        path.resolve(__dirname, 'public', 'index.html'), // Local prod
        path.resolve(__dirname, '..', 'frontend', 'dist', 'index.html'), // Local dev
    ];
    if (hostingerPublicHtml) possiblePaths.push(hostingerPublicHtml);

    let foundPath = null;
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            foundPath = p;
            break;
        }
    }

    if (foundPath) {
        try {
            const htmlContent = fs.readFileSync(foundPath, 'utf8');
            res.setHeader('Content-Type', 'text/html');
            res.send(htmlContent);
        } catch (err) {
            console.error('SPA Fallback Error (Read):', err);
            res.status(500).send(`Failed to read frontend build at ${foundPath}. Error: ${err.message}`);
        }
    } else {
        // If we still can't find the frontend build, redirect to the root domain
        // because Apache/Hostinger might serve index.html correctly at the root.
        console.error('SPA Fallback Error: Frontend build not found. Attempting redirect to root.');
        const frontendUrl = process.env.FRONTEND_URL || req.headers.origin || `https://${req.headers.host}`;
        // Preserve query parameters
        const queryStr = Object.keys(req.query).length > 0 ? `?${new URLSearchParams(req.query).toString()}` : '';
        // Redirect to a hash router path if needed, or just let the frontend router handle it
        res.redirect(`${frontendUrl}/#${req.originalUrl}`);
    }
});

// Global error handler to prevent HTML responses on errors
app.use((err, req, res, next) => {
    console.error('Global Error Handler:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
