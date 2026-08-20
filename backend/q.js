const mongoose = require('mongoose'); 
const dotenv = require('dotenv'); 
dotenv.config(); 
mongoose.connect(process.env.MONGO_URI).then(async () => { 
  const Order = require('./models/Order'); 
  const orders = await Order.find({ paymentMethod: /session/ }); 
  console.log('Found:', orders.length); 
  if (orders.length > 0) { 
    console.log(orders[0].paymentMethod); 
  } 
  process.exit(0); 
});
