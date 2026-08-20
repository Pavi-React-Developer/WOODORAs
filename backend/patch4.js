const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Order = require('./models/Order');
  const Counter = require('./models/Counter');

  const bad = await Order.find({ orderId: { $in: ['MK00071', 'MK00072', 'MK00073'] }, $or: [{isGiftOrder: true}, {gift_toggle: true}] });
  console.log(`Found ${bad.length} bad gift orders to patch`);
  for (const order of bad) {
    const updated = await Counter.findByIdAndUpdate('giftOrderId', { $inc: { seq: 1 } }, { new: true, upsert: true });
    const newId = `MKG${String(updated.seq - 1).padStart(5, '0')}`;
    await Order.updateOne({ _id: order._id }, { $set: { orderId: newId, invoiceId: newId, isGiftOrder: true } });
    console.log(`✅ Patched ${order.orderId} → ${newId}`);
  }

  const giftCtr = await Counter.findById('giftOrderId');
  console.log(`\nNext gift order will be: MKG${String(giftCtr?.seq).padStart(5, '0')}`);
  process.exit(0);
});
