const User = require('../models/User');

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

module.exports = {
    getAddresses,
    addAddress,
    updateAddress,
    deleteAddress
};
