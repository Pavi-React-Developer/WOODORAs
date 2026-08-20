const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Order = require('./models/Order');
  const order = new Order({
    user: '6a5e00cc7a036ea4bd45d90d',
    paymentMethod: 'Cashfree',
    itemsPrice: 0,
    taxPrice: 0,
    shippingPrice: 0,
    totalPrice: 0,
    isGiftOrder: true
  });
  console.log('Before save:', order.isGiftOrder, typeof order.isGiftOrder, order.orderId);
  await order.save();
  console.log('After save:', order.isGiftOrder, order.orderId);
  process.exit(0);
});
