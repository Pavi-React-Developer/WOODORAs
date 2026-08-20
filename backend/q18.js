const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Order = require('./models/Order');
  // Find orders where paymentMethod is NOT COD or Cashfree
  const bad = await Order.find({
    paymentMethod: { $nin: ['COD', 'Cashfree'] }
  }).sort({ createdAt: -1 }).limit(10);
  
  console.log(`Found ${bad.length} orders with unexpected paymentMethod`);
  bad.forEach(o => console.log(`  orderId: ${o.orderId} | paymentMethod: "${o.paymentMethod}" | created: ${o.createdAt?.toISOString().slice(0,16)}`));
  process.exit(0);
});
