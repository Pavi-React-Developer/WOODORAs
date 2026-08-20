const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Order = require('./models/Order');
  const Counter = require('./models/Counter');

  // Check current counter values
  const giftCounter = await Counter.findById('giftOrderId');
  const regularCounter = await Counter.findById('orderId');
  console.log('Current gift counter seq:', giftCounter?.seq);
  console.log('Current regular counter seq:', regularCounter?.seq);

  // Patch MK00069 and MK00070 to MKG IDs
  const badOrders = await Order.find({ orderId: { $in: ['MK00069', 'MK00070'] } });
  console.log(`\nFound ${badOrders.length} bad orders to patch`);

  for (const order of badOrders) {
    const updated = await Counter.findByIdAndUpdate(
      'giftOrderId',
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const newId = `MKG${String(updated.seq - 1).padStart(5, '0')}`;
    const oldId = order.orderId;
    
    // Use direct DB update (bypass pre-save hook)
    await Order.updateOne(
      { _id: order._id },
      { $set: { orderId: newId, invoiceId: newId, isGiftOrder: true } }
    );
    console.log(`✅ Patched ${oldId} → ${newId}`);
  }

  // Final counter state
  const finalGift = await Counter.findById('giftOrderId');
  console.log(`\nGift counter after patch: ${finalGift?.seq}`);
  console.log(`Next new gift order will be: MKG${String(finalGift?.seq).padStart(5, '0')}`);

  process.exit(0);
});
