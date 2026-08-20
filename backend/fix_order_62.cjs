const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI);

const Order = require('./models/Order');

const fixOrders = async () => {
  try {
    console.log('Fixing MK00062...');
    
    // Find the newly created order
    const order62 = await Order.findOne({ orderId: 'MK00062' });
    if (order62) {
      order62.orderId = 'MKG00089';
      await order62.save({ validateBeforeSave: false });
      console.log('Updated order 62 to MKG00089');
    } else {
      console.log('Order MK00062 not found. Maybe already fixed?');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Failed to fix orders:', err);
    process.exit(1);
  }
};

fixOrders();
