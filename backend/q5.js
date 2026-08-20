const mongoose = require('mongoose'); 
const dotenv = require('dotenv'); 
dotenv.config(); 
mongoose.connect(process.env.MONGO_URI).then(async () => { 
  const Order = require('./models/Order'); 
  const orders = await Order.find({ orderId: /session/ }); 
  console.log('Found orderId:', orders.length); 
  if (orders.length > 0) { 
    console.log(orders[0].orderId); 
  } 
  process.exit(0); 
});
