const mongoose = require('mongoose'); 
const dotenv = require('dotenv'); 
dotenv.config(); 
mongoose.connect(process.env.MONGO_URI).then(async () => { 
  const Order = require('./models/Order'); 
  const orders = await Order.find({ 'paymentResult.id': /session/ }); 
  console.log('Found in paymentResult:', orders.length); 
  if (orders.length > 0) { 
    console.log(orders[0].paymentResult); 
  } 
  process.exit(0); 
});
