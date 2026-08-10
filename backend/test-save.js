const mongoose = require('mongoose');
require('dotenv').config();
const Order = require('./models/Order');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('connected');
  
  const order = new Order({
    user: new mongoose.Types.ObjectId(),
    orderItems: [],
    shippingAddress: {
      fullName: 'test', address: 'test', city: 'test', state: 'test', pinCode: '123', phone: '123'
    },
    paymentMethod: 'COD',
    itemsPrice: 0, taxPrice: 0, shippingPrice: 0, totalPrice: 0
  });

  try {
    await order.save();
    console.log('order saved', order.orderId);
  } catch (e) {
    console.error('Save failed:', e);
  }
  process.exit();
}
test();
