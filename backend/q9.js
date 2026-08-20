const mongoose = require('mongoose'); 
const dotenv = require('dotenv'); 
dotenv.config(); 
mongoose.connect(process.env.MONGO_URI).then(async () => { 
  const Order = require('./models/Order'); 
  const orders = await Order.find(); 
  let found = [];
  for (const o of orders) {
    if (!o.orderId || (!o.orderId.startsWith('MK') && !o.orderId.startsWith('MKG'))) {
       found.push({id: o._id, orderId: o.orderId, paymentMethod: o.paymentMethod});
    } else if (o.paymentMethod !== 'Cashfree' && o.paymentMethod !== 'COD') {
       found.push({id: o._id, orderId: o.orderId, paymentMethod: o.paymentMethod});
    }
  }
  console.log('Strange orders:', found);
  process.exit(0); 
});
