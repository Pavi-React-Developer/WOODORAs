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
const feeRoutes = require('./routes/feeRoutes');
const cancellationRoutes = require('./routes/cancellationRoutes');
const refundRoutes = require('./routes/refundRoutes');
const walletRoutes = require('./routes/walletRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const reviewRoutes  = require('./routes/reviewRoutes');
const couponRoutes = require('./routes/couponRoutes');
const cmsRoutes = require('./routes/cmsRoutes');
const bulkOrderRoutes = require('./routes/bulkOrderRoutes');
const giftCardRoutes = require('./routes/giftCardRoutes');
const giftBoxRuleRoutes = require('./routes/giftBoxRuleRoutes');
const seedAttributes = require('./seedAttributes');
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
    seedAttributes();
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
        const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) : ['http://localhost:5173'];
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
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
app.use('/api/catalog', catalogRoutes);
app.use('/api/v2/catalog', catalogV2Routes);
app.use('/api/staff', staffRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/cancellation-rules', cancellationRoutes);
app.use('/api/refunds', refundRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/bulk-orders', bulkOrderRoutes);
app.use('/api/gift-cards', giftCardRoutes);
app.use('/api/gift-box-rules', giftBoxRuleRoutes);
const productFeeRuleRoutes = require('./routes/productFeeRuleRoutes');
app.use('/api/product-fee-rules', productFeeRuleRoutes);

app.get('/', (req, res) => {
    res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
