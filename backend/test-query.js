const mongoose = require('mongoose');
const Order = require('./models/Order');
const User = require('./models/User');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const res = await Order.find({ isGiftOrder: true, user: { $ne: null } }).populate('user', 'name email').limit(2).lean();
  console.log(JSON.stringify(res, null, 2));
  process.exit(0);
}
run().catch(console.error);
