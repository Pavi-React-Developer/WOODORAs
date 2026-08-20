const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI);

const Order = require('./models/Order');
const Counter = require('./models/Counter');

const fixCounters = async () => {
  try {
    console.log('Fixing gift order counter...');
    
    // Find all gift orders
    const orders = await Order.find({ orderId: { $regex: /^MKG/ } });
    
    let maxSeq = 0;
    for (const order of orders) {
      const match = order.orderId.match(/^MKG(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxSeq) {
          maxSeq = num;
        }
      }
    }
    
    console.log(`Highest MKG order found: MKG${String(maxSeq).padStart(5, '0')}`);
    
    // Set counter to maxSeq + 1 (because next order will use seq and then seq-1 if using the same logic, wait, Order.js uses: seq - 1? Let's check Order.js logic)
    // In Order.js: 
    // const giftCounter = await Counter.findByIdAndUpdate('giftOrderId', { $inc: { seq: 1 } }, { new: true, upsert: true });
    // const newId = `MKG${String(giftCounter.seq - 1).padStart(5, '0')}`;
    // So if maxSeq is 86, we want next to be 87.
    // giftCounter.seq - 1 should be 87. So giftCounter.seq should be 88.
    // So we should set seq to 87, then $inc: 1 will make it 88, and 88-1 = 87!
    
    const targetSeq = maxSeq + 1;
    
    await Counter.findOneAndUpdate(
      { _id: 'giftOrderId' },
      { seq: targetSeq },
      { upsert: true }
    );
    
    console.log(`Set giftOrderId counter seq to ${targetSeq}. Next generated ID will be MKG${String(targetSeq).padStart(5, '0')}`);
    
    process.exit(0);
  } catch (err) {
    console.error('Failed to fix counters:', err);
    process.exit(1);
  }
};

fixCounters();
