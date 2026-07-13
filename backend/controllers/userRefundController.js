const Refund = require('../models/Refund');

// @desc    Get refunds for logged in user
// @route   GET /api/refunds/my
// @access  Private
const getMyRefunds = async (req, res) => {
  try {
    // Find refunds where orderRef points to orders owned by this user OR where customerEmail matches
    const refunds = await Refund.find()
      .populate({
        path: 'orderRef',
        select: 'createdAt status orderItems fees shippingPrice totalPrice user',
        populate: [
          { path: 'orderItems.product', select: 'name image price' }
        ]
      })
      .sort({ createdAt: -1 });

    const myRefunds = refunds.filter(r => {
      if (r.orderRef && r.orderRef.user && String(r.orderRef.user) === String(req.user._id)) return true;
      if (r.customerEmail && req.user.email && r.customerEmail === req.user.email) return true;
      return false;
    });

    res.json(myRefunds);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getMyRefunds };
