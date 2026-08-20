const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI);

const Order = require('./models/Order');
const Counter = require('./models/Counter');

const fixOrders = async () => {
  try {
    console.log('Fixing specific order IDs...');
    
    // Find the order that currently has orderId ending in 60
    const order60 = await Order.findOne({ orderId: { $regex: /00060$/ } });
    if (order60) {
      order60.orderId = 'MKG00087';
      await order60.save({ validateBeforeSave: false });
      console.log('Updated order 60 to MKG00087');
    }

    // Find the order that currently has orderId ending in 61
    const order61 = await Order.findOne({ orderId: { $regex: /00061$/ } });
    if (order61) {
      order61.orderId = 'MKG00088';
      await order61.save({ validateBeforeSave: false });
      console.log('Updated order 61 to MKG00088');
    }
    
    // Update the counter to 89 so the next order is MKG00089
    await Counter.findOneAndUpdate(
      { _id: 'giftOrderId' },
      { seq: 89 },
      { upsert: true }
    );
    console.log('Updated counter seq to 89. Next generated ID will be MKG00089');
    
    process.exit(0);
  } catch (err) {
    console.error('Failed to fix orders:', err);
    process.exit(1);
  }
};

fixOrders();
