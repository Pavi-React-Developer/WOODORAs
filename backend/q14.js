const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Order = require('./models/Order');
  const orders = await Order.find({ $text: { $search: "session" } });
  console.log(`Found ${orders.length} orders by text search`);
  if(orders.length === 0) {
    const all = await Order.find().sort({createdAt: -1}).limit(20);
    const withSession = all.filter(o => JSON.stringify(o).includes('session_'));
    console.log(`Found ${withSession.length} orders by stringify search`);
    withSession.forEach(o => console.log(JSON.stringify(o, null, 2)));
  }
  process.exit(0);
});
