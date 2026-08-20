const mongoose = require('mongoose'); 
const dotenv = require('dotenv'); 
dotenv.config(); 
mongoose.connect(process.env.MONGO_URI).then(async () => { 
  const Order = require('./models/Order'); 
  const orders = await Order.find({ paymentMethod: { $nin: ['Cashfree', 'COD'] } }); 
  console.log('Found invalid payment methods:', orders.length); 
  if (orders.length > 0) { 
    console.log(orders.map(o => o.paymentMethod)); 
  } 
  process.exit(0); 
});
