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
            phoneNo,
            totalAmount: price * quantity, // Initial calculation
            balanceAmount: price * quantity
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
        const bookings = await AdvancedBooking.find().populate('user', 'firstName lastName email profilePicture').sort({ createdAt: -1 });
        res.status(200).json(bookings);
    } catch (error) {
        console.error('Error fetching admin bookings:', error);
        res.status(500).json({ success: false, message: 'Server error fetching bookings' });
    }
};

// Dashboard Metrics
exports.getDashboardMetrics = async (req, res) => {
    try {
        const bookings = await AdvancedBooking.find();
        
        let totalRevenue = 0;
        let totalOrders = bookings.length;
        let uniqueCustomers = new Set();
        let uniqueProducts = new Set();
        
        const last30DaysRevenue = {};
        const ordersByDayOfWeek = {
            'Sun': 0, 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0
        };
        const daysArray = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        bookings.forEach(b => {
            totalRevenue += (b.paidAmount || 0);
            uniqueCustomers.add(b.customerName + b.phoneNo);
            uniqueProducts.add(b.productName);

            const bDate = new Date(b.createdAt);
            if (bDate >= thirtyDaysAgo) {
                const dateString = bDate.toISOString().split('T')[0];
                last30DaysRevenue[dateString] = (last30DaysRevenue[dateString] || 0) + (b.paidAmount || 0);
            }

            ordersByDayOfWeek[daysArray[bDate.getDay()]] += 1;
        });

        // Format for charts
        const dailyRevenue = Object.keys(last30DaysRevenue).sort().map(date => ({
            date,
            revenue: last30DaysRevenue[date]
        }));
        
        const ordersDayOfWeek = Object.keys(ordersByDayOfWeek).map(day => ({
            day,
            orders: ordersByDayOfWeek[day]
        }));

        res.status(200).json({
            success: true,
            totalRevenue,
            totalOrders,
            totalCustomers: uniqueCustomers.size,
            totalProducts: uniqueProducts.size,
            dailyRevenue,
            ordersDayOfWeek
        });

    } catch (error) {
        console.error('Error getting metrics:', error);
        res.status(500).json({ success: false, message: 'Server error getting metrics' });
    }
};

// Approve Booking
exports.approveBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, expectedDate, paymentScreenshot, paidAmount } = req.body;

        const booking = await AdvancedBooking.findById(id);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

        booking.bookingStatus = 'Approved';
        booking.reason = reason;
        booking.expectedDate = expectedDate;
        booking.paymentScreenshot = paymentScreenshot;
        
        // Fallback for older bookings
        if (!booking.totalAmount) {
            booking.totalAmount = (booking.price || 0) * (booking.quantity || 1);
        }

        booking.paidAmount = Number(paidAmount) || 0;
        booking.balanceAmount = booking.totalAmount - booking.paidAmount;
        
        if (booking.paidAmount > 0 && booking.balanceAmount > 0) {
            booking.paymentType = 'Partially Paid';
        } else if (booking.balanceAmount <= 0) {
            booking.paymentType = 'Fully Paid';
        }

        await booking.save();
        res.status(200).json({ success: true, message: 'Booking approved', booking });
    } catch (error) {
        console.error('Error approving booking:', error);
        res.status(500).json({ success: false, message: 'Server error approving booking' });
    }
};

// Reject Booking
exports.rejectBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const booking = await AdvancedBooking.findById(id);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

        booking.bookingStatus = 'Rejected';
        booking.reason = reason;

        await booking.save();
        res.status(200).json({ success: true, message: 'Booking rejected', booking });
    } catch (error) {
        console.error('Error rejecting booking:', error);
        res.status(500).json({ success: false, message: 'Server error rejecting booking' });
    }
};

// Update Order Details
exports.updateOrderDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentMethod, orderStatus, shippingDetails, paymentScreenshot, paidAmount } = req.body;

        const booking = await AdvancedBooking.findById(id);
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

        // Fallback for older bookings
        if (!booking.totalAmount) {
            booking.totalAmount = (booking.price || 0) * (booking.quantity || 1);
        }

        // Update fields if provided
        if (paymentMethod) booking.paymentMethod = paymentMethod;
        if (paymentScreenshot) booking.paymentScreenshot = paymentScreenshot;
        if (paidAmount !== undefined) {
            booking.paidAmount = Number(paidAmount);
            booking.balanceAmount = booking.totalAmount - booking.paidAmount;
            if (booking.paidAmount > 0 && booking.balanceAmount > 0) {
                booking.paymentType = 'Partially Paid';
            } else if (booking.balanceAmount <= 0) {
                booking.paymentType = 'Fully Paid';
            }
        }
        
        // Explicit override from frontend if provided
        if (req.body.paymentType) {
            booking.paymentType = req.body.paymentType;
        }

        if (shippingDetails) booking.shippingDetails = shippingDetails;

        // Order status strict flow check (Placed -> Packed -> Shipping -> Out for Delivery -> Delivered)
        if (orderStatus && orderStatus !== booking.orderStatus) {
            const flow = ['Placed', 'Packed', 'Shipping', 'Out of Delivery', 'Delivered', 'Cancelled'];
            const currentIndex = flow.indexOf(booking.orderStatus);
            const nextIndex = flow.indexOf(orderStatus);

            if (orderStatus === 'Cancelled') {
                booking.orderStatus = 'Cancelled';
            } else if (nextIndex === currentIndex + 1) {
                // Rule: Must be Fully Paid to move to Packed
                if (orderStatus === 'Packed' && booking.paymentType !== 'Fully Paid') {
                    return res.status(400).json({ success: false, message: 'Booking must be Fully Paid to move to Packed.' });
                }
                booking.orderStatus = orderStatus;
            } else {
                return res.status(400).json({ success: false, message: 'Invalid order status transition. You cannot jump statuses.' });
            }
        }

        await booking.save();
        res.status(200).json({ success: true, message: 'Order details updated', booking });
    } catch (error) {
        console.error('Error updating order details:', error);
        res.status(500).json({ success: false, message: 'Server error updating details' });
    }
};

// Update booking status (Legacy, maybe keep for Cancel or simple changes, but updateOrderDetails handles it better now)
exports.updateBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const booking = await AdvancedBooking.findByIdAndUpdate(id, { orderStatus: status }, { new: true });
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
