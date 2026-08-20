const mongoose = require('mongoose'); 
const dotenv = require('dotenv'); 
dotenv.config(); 
mongoose.connect(process.env.MONGO_URI).then(async () => { 
  const Order = require('./models/Order'); 
  const orders = await Order.find().sort({createdAt: -1}).limit(5); 
  console.log(orders.map(o => ({id: o.orderId, isGift: o.isGiftOrder, pm: o.paymentMethod}))); 
  process.exit(0); 
});
