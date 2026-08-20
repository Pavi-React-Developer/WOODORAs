const mongoose = require('mongoose'); 
const dotenv = require('dotenv'); 
dotenv.config(); 
mongoose.connect(process.env.MONGO_URI).then(async () => { 
  const Order = require('./models/Order'); 
  const orders = await Order.find(); 
  const methods = [...new Set(orders.map(o => o.paymentMethod))]; 
  console.log('Methods:', methods); 
  process.exit(0); 
});
