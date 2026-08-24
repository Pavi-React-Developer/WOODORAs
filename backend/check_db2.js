const mongoose = require('mongoose');
const BulkOrder = require('./models/BulkOrder');
require('./models/Product');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const orders = await BulkOrder.find({ displayId: { $in: ['MKB00024', 'MKB00011'] } }).populate('product');
    console.log(JSON.stringify(orders, null, 2));
    process.exit(0);
  });
