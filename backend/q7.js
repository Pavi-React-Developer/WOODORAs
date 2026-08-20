const mongoose = require('mongoose'); 
const dotenv = require('dotenv'); 
dotenv.config(); 
mongoose.connect(process.env.MONGO_URI).then(async () => { 
  const Order = require('./models/Order'); 
  const orders = await Order.find(); 
  let found = false;
  for (const order of orders) {
    const json = JSON.stringify(order);
    if (json.includes('paymentpayment') || json.includes('session_')) {
      console.log('Found in order:', order._id);
      console.log('paymentMethod:', order.paymentMethod);
      console.log('orderId:', order.orderId);
      console.log('session or paymentpayment match!');
      found = true;
    }
  }
  if (!found) console.log('String not found in ANY order in the DB!');
  process.exit(0); 
});
