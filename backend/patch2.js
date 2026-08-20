const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Order = require('./models/Order');
  const Counter = require('./models/Counter');
  
  // Find MK00068
  const order = await Order.findOne({ orderId: 'MK00068' });
  if (order) {
    const giftCounter = await Counter.findByIdAndUpdate(
      'giftOrderId',
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const newId = `MKG${String(giftCounter.seq - 1).padStart(5, '0')}`;
    order.orderId = newId;
    order.invoiceId = newId;
    await order.save();
    console.log(`Updated MK00068 to ${newId}`);
  } else {
    console.log('MK00068 not found');
  }
  process.exit(0);
});
