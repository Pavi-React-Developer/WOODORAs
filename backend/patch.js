const mongoose = require('mongoose'); 
const dotenv = require('dotenv'); 
dotenv.config(); 
mongoose.connect(process.env.MONGO_URI).then(async () => { 
  const Order = require('./models/Order'); 
  const Counter = require('./models/Counter'); 
  const orders = await Order.find({ orderId: { $in: ['MK00065', 'MK00066', 'MK00067'] } }); 
  for (let order of orders) { 
    const giftCounter = await Counter.findByIdAndUpdate('giftOrderId', { $inc: { seq: 1 } }, { new: true, upsert: true }); 
    const newId = `MKG${String(giftCounter.seq - 1).padStart(5, '0')}`; 
    order.orderId = newId; 
    order.invoiceId = newId; 
    await Order.collection.updateOne({_id: order._id}, {$set: {orderId: newId, invoiceId: newId}}); 
    console.log(`Updated ${order._id} to ${newId}`); 
  } 
  process.exit(0); 
});
