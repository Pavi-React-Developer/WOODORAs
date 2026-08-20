const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Order = require('./models/Order');
  
  // Find ALL gift orders (isGiftOrder:true OR gift_toggle:true) that have wrong MK prefix
  const badGiftOrders = await Order.find({
    $or: [
      { isGiftOrder: true },
      { gift_toggle: true },
      { 'giftWrapping.enabled': true }
    ]
  }).sort({ createdAt: -1 }).limit(30);
  
  console.log(`\nTotal gift orders found: ${badGiftOrders.length}`);
  console.log('\nAll gift orders (recent 30):');
  badGiftOrders.forEach(o => {
    const wrong = o.orderId && !o.orderId.startsWith('MKG');
    console.log(`  ${wrong ? '❌ WRONG' : '✅ OK   '} | orderId: ${o.orderId} | isGiftOrder: ${o.isGiftOrder} | gift_toggle: ${o.gift_toggle} | created: ${o.createdAt?.toISOString().slice(0,16)}`);
  });

  const wrongOnes = badGiftOrders.filter(o => o.orderId && !o.orderId.startsWith('MKG'));
  console.log(`\n❌ Gift orders with WRONG prefix: ${wrongOnes.length}`);
  wrongOnes.forEach(o => console.log(`   ${o.orderId}`));
  
  process.exit(0);
});
