const AdvancedBooking = require('../models/AdvancedBooking');

// Create a new advanced booking
exports.createBooking = async (req, res) => {
    try {
        const { product, category, subCategory, productName, productImage, price, variants, quantity, customerName, phoneNo } = req.body;

        const newBooking = new AdvancedBooking({
            user: req.user ? req.user.id : undefined, // Works for logged in users
            product,
            category,
            subCategory,
            productName,
            productImage,
            price,
            variants,
            quantity,
            customerName,
            phoneNo
        });

        await newBooking.save();
        res.status(201).json({ success: true, message: 'Advanced booking created successfully', booking: newBooking });
    } catch (error) {
        console.error('Error creating advanced booking:', error);
        res.status(500).json({ success: false, message: 'Server error creating advanced booking' });
    }
};

// Get bookings for a specific user
exports.getUserBookings = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const bookings = await AdvancedBooking.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.status(200).json(bookings);
    } catch (error) {
        console.error('Error fetching user bookings:', error);
        res.status(500).json({ success: false, message: 'Server error fetching bookings' });
    }
};

// Get all bookings (for Admin)
exports.getAllBookings = async (req, res) => {
    try {
        const bookings = await AdvancedBooking.find().populate('user', 'firstName lastName email').sort({ createdAt: -1 });
        res.status(200).json(bookings);
    } catch (error) {
        console.error('Error fetching admin bookings:', error);
        res.status(500).json({ success: false, message: 'Server error fetching bookings' });
    }
};

// Update booking status (for Admin)
exports.updateBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const booking = await AdvancedBooking.findByIdAndUpdate(id, { status }, { new: true });
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        
        res.status(200).json({ success: true, message: 'Status updated successfully', booking });
    } catch (error) {
        console.error('Error updating booking status:', error);
        res.status(500).json({ success: false, message: 'Server error updating booking status' });
    }
};

// Delete a booking (for Admin)
exports.deleteBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const booking = await AdvancedBooking.findByIdAndDelete(id);
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        res.status(200).json({ success: true, message: 'Booking deleted successfully' });
    } catch (error) {
        console.error('Error deleting booking:', error);
        res.status(500).json({ success: false, message: 'Server error deleting booking' });
    }
};
