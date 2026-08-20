const mongoose = require('mongoose'); 
const dotenv = require('dotenv'); 
dotenv.config(); 
mongoose.connect(process.env.MONGO_URI).then(async () => { 
  const Order = require('./models/Order'); 
  const d = new Date(); 
  d.setDate(d.getDate() - 2); 
  const orders = await Order.find({ createdAt: { $gte: d } }); 
  console.log(JSON.stringify(orders.map(o => ({_id: o._id, orderId: o.orderId, pm: o.paymentMethod})), null, 2)); 
  process.exit(0); 
});
