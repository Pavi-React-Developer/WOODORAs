const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Order = require('./models/Order');
  const orders = await Order.find({ paymentMethod: /session_/i });
  console.log(`Found ${orders.length} orders with session_ in paymentMethod`);
  orders.forEach(o => console.log(o.orderId, o.paymentMethod));
  process.exit(0);
});
