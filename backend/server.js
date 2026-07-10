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
const seedAttributes = require('./seedAttributes');
const Order = require('./models/Order');
const Review = require('./models/Review');

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
});

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
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

app.get('/', (req, res) => {
    res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
