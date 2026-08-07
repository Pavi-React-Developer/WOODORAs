const mongoose = require('mongoose');
const User = require('./models/User');

async function test() {
  try {
    await mongoose.connect('mongodb+srv://mekharamesh3_db_user:mekhadharshini2004@cluster0.oq5fgf6.mongodb.net/woodentoy?appName=Cluster0');
    console.log('Connected');
    
    let user = await User.findOne({ 'wishlist.0': { $exists: true } });
    if (!user) {
       console.log('No user with wishlist found, getting any user');
       user = await User.findOne({});
    }
    if (!user) return console.log('No users found');
    
    console.log('User email:', user.email);
    console.log('Wishlist before:', JSON.stringify(user.wishlist));
    
    const pid = user.wishlist[0] ? (user.wishlist[0].product?._id || user.wishlist[0].product) : '60d5ecb8b392d700153f3a11';
    const variantIdStr = null;
    const qty = 5;

    const existingItem = user.wishlist.find(w => {
        const wPid = w.product?._id || w.product || w;
        if (!wPid) return false;
        if (wPid.toString() !== pid.toString()) return false;
        
        const wVid = w.variant && w.variant._id ? w.variant._id.toString() : (w.variant ? w.variant.toString() : null);
        return wVid === variantIdStr;
    });

    if (existingItem) {
        console.log('Found existing item, updating qty');
        existingItem.qty = qty;
    } else {
        console.log('Pushing new item');
        user.wishlist.push({ product: pid, variant: null, qty });
    }
    
    console.log('Marking modified');
    user.markModified('wishlist');
    
    console.log('Saving...');
    await user.save();
    console.log('Saved successfully');

    console.log('Populating...');
    await user.populate({
        path: 'wishlist.product',
        select: 'name price salePrice discountPrice images isWishlisted slug hasVariants variants',
    });
    console.log('Populated successfully');
    
  } catch (e) {
    console.error('ERROR OCCURRED:', e);
  } finally {
    process.exit();
  }
}
test();
