const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const User = require('./models/User');
    const Product = require('./models/Product');
    const Staff = require('./models/Staff');
    
    let user = await User.findOne({ wishlist: { $not: { $size: 0 } } }).populate({
        path: 'wishlist',
        select: 'name price salePrice discountPrice images isWishlisted slug hasVariants variants',
        populate: {
            path: 'variants',
            select: 'price salePrice discountPrice basePrice options images'
        }
    });

    if (!user) {
        user = await Staff.findOne({ wishlist: { $not: { $size: 0 } } }).populate({
            path: 'wishlist',
            select: 'name price salePrice discountPrice images isWishlisted slug hasVariants variants',
            populate: {
                path: 'variants',
                select: 'price salePrice discountPrice basePrice options images'
            }
        });
    }

    if (user && user.wishlist.length > 0) {
        const item = user.wishlist.find(i => i != null);
        if (item) {
            console.log('Wishlist item keys:', Object.keys(item.toObject()));
            console.log('Images field:', JSON.stringify(item.images, null, 2));
        } else {
            console.log('All wishlist items are null (deleted products). Raw array:', user.wishlist);
        }
    } else {
        console.log('No user found with wishlist items');
    }
    mongoose.disconnect();
});
