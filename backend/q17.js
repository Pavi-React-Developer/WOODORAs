const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Order = require('./models/Order');
  const order = await Order.findOne({ orderId: 'MK00069' });
  console.log(JSON.stringify(order, null, 2));
  process.exit(0);
});
