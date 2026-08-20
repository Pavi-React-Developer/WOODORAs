const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

mongoose.connect(process.env.MONGO_URI);

const BulkOrder = require('./models/BulkOrder');
const Order = require('./models/Order');
const GiftMessage = require('./models/GiftMessage');
const Counter = require('./models/Counter');

const backfill = async () => {
  try {
    console.log('Starting backfill...');
    
    // 1. Backfill Bulk Orders
    const bulkOrders = await BulkOrder.find({}).sort({ createdAt: 1 });
    console.log(`Found ${bulkOrders.length} bulk orders.`);
    
    // Reset bulk order counter
    await Counter.findOneAndUpdate(
      { _id: 'bulkOrderId' },
      { seq: bulkOrders.length + 1 },
      { upsert: true }
    );

    let bulkSeq = 0;
    for (const order of bulkOrders) {
      order.displayId = `MKB${String(bulkSeq).padStart(5, '0')}`;
      await order.save({ validateBeforeSave: false });
      bulkSeq++;
    }
    console.log('Bulk Orders backfilled successfully.');

    // 2. Backfill Gift Orders
    const giftOrders = await Order.find({ isGiftOrder: true }).sort({ createdAt: 1 });
    console.log(`Found ${giftOrders.length} gift orders.`);

    // Reset gift order counter
    await Counter.findOneAndUpdate(
      { _id: 'giftOrderId' },
      { seq: giftOrders.length + 1 },
      { upsert: true }
    );

    let giftSeq = 0;
    for (const order of giftOrders) {
      const newId = `MKG${String(giftSeq).padStart(5, '0')}`;
      order.orderId = newId;
      order.invoiceId = newId;
      await order.save({ validateBeforeSave: false });
      giftSeq++;
    }
    console.log('Gift Orders backfilled successfully.');

    // 3. Backfill Gift Messages
    const giftMessages = await GiftMessage.find({}).sort({ createdAt: 1 });
    console.log(`Found ${giftMessages.length} gift messages.`);

    // Reset gift message counter
    await Counter.findOneAndUpdate(
      { _id: 'giftMessageId' },
      { seq: giftMessages.length + 1 },
      { upsert: true }
    );

    let msgSeq = 0;
    for (const msg of giftMessages) {
      msg.displayId = `MKG${String(msgSeq).padStart(5, '0')}`;
      await msg.save({ validateBeforeSave: false });
      msgSeq++;
    }
    console.log('Gift Messages backfilled successfully.');

    console.log('Backfill complete!');
    process.exit(0);
  } catch (err) {
    console.error('Backfill failed:', err);
    process.exit(1);
  }
};

backfill();
