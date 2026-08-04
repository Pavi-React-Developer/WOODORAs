const User = require('../models/User');
const Staff = require('../models/Staff');
const ProductImage = require('../models/catalog/ProductImage');

// @desc    Get all addresses for logged-in user
// @route   GET /api/user/addresses
// @access  Private
const getAddresses = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('addresses');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ success: true, addresses: user.addresses || [] });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add a new address
// @route   POST /api/user/addresses
// @access  Private
const addAddress = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const newAddress = {
            label: req.body.label || 'Home',
            fullName: req.body.fullName,
            phone: req.body.phone,
            address: req.body.address,
            city: req.body.city,
            state: req.body.state,
            pinCode: req.body.pinCode,
            landmark: req.body.landmark || '',
            isDefault: req.body.isDefault || false
        };

        if (newAddress.isDefault && user.addresses) {
            user.addresses.forEach(addr => addr.isDefault = false);
        }

        user.addresses.push(newAddress);
        
        // If it's the first address, make it default
        if (user.addresses.length === 1) {
            user.addresses[0].isDefault = true;
        }

        // Sync default address details to profile automatically
        const isDefaultNow = newAddress.isDefault || user.addresses.length === 1;
        if (isDefaultNow) {
            if (newAddress.fullName) user.name = newAddress.fullName;
            if (newAddress.phone) user.phone = newAddress.phone;
        }

        await user.save();
        res.status(201).json({ success: true, addresses: user.addresses });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update an address
// @route   PUT /api/user/addresses/:addressId
// @access  Private
const updateAddress = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const address = user.addresses.id(req.params.addressId);
        if (!address) {
            return res.status(404).json({ message: 'Address not found' });
        }

        if (req.body.isDefault) {
            user.addresses.forEach(addr => addr.isDefault = false);
        }

        address.label = req.body.label !== undefined ? req.body.label : address.label;
        address.fullName = req.body.fullName !== undefined ? req.body.fullName : address.fullName;
        address.phone = req.body.phone !== undefined ? req.body.phone : address.phone;
        address.address = req.body.address !== undefined ? req.body.address : address.address;
        address.city = req.body.city !== undefined ? req.body.city : address.city;
        address.state = req.body.state !== undefined ? req.body.state : address.state;
        address.pinCode = req.body.pinCode !== undefined ? req.body.pinCode : address.pinCode;
        address.landmark = req.body.landmark !== undefined ? req.body.landmark : address.landmark;
        
        if (req.body.isDefault !== undefined) {
            address.isDefault = req.body.isDefault;
        }

        // Sync default address details to profile automatically
        if (address.isDefault) {
            if (address.fullName) user.name = address.fullName;
            if (address.phone) user.phone = address.phone;
        }

        await user.save();
        res.json({ success: true, addresses: user.addresses });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete an address
// @route   DELETE /api/user/addresses/:addressId
// @access  Private
const deleteAddress = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const address = user.addresses.id(req.params.addressId);
        if (!address) {
            return res.status(404).json({ message: 'Address not found' });
        }

        const wasDefault = address.isDefault;
        
        // Remove the address using Mongoose pull
        user.addresses.pull(req.params.addressId);

        if (wasDefault && user.addresses.length > 0) {
            user.addresses[0].isDefault = true;
        }

        await user.save();
        res.json({ success: true, addresses: user.addresses });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Helper: inject ProductImage URLs into each wishlist product
// Products use a separate ProductImage collection for actual images.
// The embedded Product.images field may be empty, so we must always
// check ProductImage first, then fall back to the embedded field.
const injectWishlistImages = async (wishlistItems) => {
    if (!wishlistItems || wishlistItems.length === 0) return wishlistItems;
    const productIds = wishlistItems.map(item => item.product?._id || item._id).filter(Boolean);
    if (!productIds.length) return wishlistItems;

    const productImages = await ProductImage.find({ product: { $in: productIds } })
        .sort({ isThumbnail: -1, displayOrder: 1 });

    return wishlistItems.map(item => {
        if (!item) return item;
        
        // Support both old flat format and new nested format
        const isNested = !!item.product;
        const rawProduct = isNested ? item.product : item;
        
        if (!rawProduct) return item;

        const productObj = rawProduct.toObject ? rawProduct.toObject() : { ...rawProduct };
        if (!productObj._id) return item;

        const imgs = productImages.filter(img => img.product.toString() === productObj._id.toString());
        if (imgs.length > 0) {
            productObj.images = imgs.map(img => ({ url: img.url, public_id: img.public_id || '', isThumbnail: img.isThumbnail }));
        }
        
        if (isNested) {
            const itemObj = item.toObject ? item.toObject() : { ...item };
            itemObj.product = productObj;
            return itemObj;
        }
        return productObj;
    });
};

// Wishlist Controllers
const getWishlist = async (req, res) => {
    try {
        let user = await User.findById(req.user._id).populate({
            path: 'wishlist.product',
            select: 'name price salePrice discountPrice images isWishlisted slug hasVariants variants',
        });
        
        if (!user) {
            user = await Staff.findById(req.user._id).populate({
                path: 'wishlist.product',
                select: 'name price salePrice discountPrice images isWishlisted slug hasVariants variants'
            });
        }
        
        if (!user) return res.status(404).json({ message: 'User not found' });
        
        // Clean up any deleted/invalid products from the wishlist
        const validWishlist = user.wishlist.filter(item => item.product != null);
        if (validWishlist.length !== user.wishlist.length) {
            user.wishlist = validWishlist;
            await user.save();
        }

        const finalWishlist = await injectWishlistImages(user.wishlist || []);
        res.json({ success: true, wishlist: finalWishlist });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const toggleWishlist = async (req, res) => {
    try {
        const { productId, variant = null, qty = 1 } = req.body;
        if (!productId) return res.status(400).json({ message: 'Product ID is required' });
        
        let user = await User.findById(req.user._id);
        if (!user) {
            user = await Staff.findById(req.user._id);
        }
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Try to find exact match of product + variant
        const variantIdStr = variant && variant._id ? variant._id.toString() : (variant ? variant.toString() : null);
        const index = user.wishlist.findIndex(item => {
            const pId = item.product?._id || item.product || item;
            if (pId.toString() !== productId.toString()) return false;
            
            const vId = item.variant && item.variant._id ? item.variant._id.toString() : (item.variant ? item.variant.toString() : null);
            return vId === variantIdStr;
        });

        let action = '';
        if (index > -1) {
            user.wishlist.splice(index, 1);
            action = 'removed';
        } else {
            user.wishlist.push({ product: productId, variant, qty });
            action = 'added';
        }
        await user.save();
        
        await user.populate({
            path: 'wishlist.product',
            select: 'name price salePrice discountPrice images isWishlisted slug hasVariants variants',
        });

        const validWishlist = user.wishlist.filter(item => item.product != null);
        if (validWishlist.length !== user.wishlist.length) {
            user.wishlist = validWishlist;
            await user.save();
        }

        const finalWishlist = await injectWishlistImages(user.wishlist || []);
        res.json({ success: true, action, wishlist: finalWishlist });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const mergeWishlist = async (req, res) => {
    try {
        // Can be array of strings (legacy) or array of {product, variant, qty}
        const { productIds } = req.body; 
        if (!productIds || !Array.isArray(productIds)) {
            return res.status(400).json({ message: 'Product IDs array is required' });
        }

        let user = await User.findById(req.user._id);
        if (!user) {
            user = await Staff.findById(req.user._id);
        }
        if (!user) return res.status(404).json({ message: 'User not found' });

        for (const item of productIds) {
            let pid, variant, qty;
            if (typeof item === 'string' || item instanceof mongoose.Types.ObjectId) {
                pid = item;
                variant = null;
                qty = 1;
            } else {
                pid = item.product?._id || item.product || item.id;
                variant = item.variant;
                qty = item.qty || 1;
            }
            if (!pid) continue;

            const variantIdStr = variant && variant._id ? variant._id.toString() : (variant ? variant.toString() : null);
            
            // Check if exists
            const exists = user.wishlist.some(w => {
                const wPid = w.product?._id || w.product || w;
                if (wPid.toString() !== pid.toString()) return false;
                
                const wVid = w.variant && w.variant._id ? w.variant._id.toString() : (w.variant ? w.variant.toString() : null);
                return wVid === variantIdStr;
            });

            if (!exists) {
                user.wishlist.push({ product: pid, variant, qty });
            }
        }
        await user.save();

        await user.populate({
            path: 'wishlist.product',
            select: 'name price salePrice discountPrice images isWishlisted slug hasVariants variants',
        });

        const validWishlist = user.wishlist.filter(item => item.product != null);
        if (validWishlist.length !== user.wishlist.length) {
            user.wishlist = validWishlist;
            await user.save();
        }

        const finalWishlist = await injectWishlistImages(user.wishlist || []);
        res.json({ success: true, wishlist: finalWishlist });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress,
    getWishlist,
    toggleWishlist,
    mergeWishlist
};
