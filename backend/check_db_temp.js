const mongoose = require('mongoose');
const BulkOrder = require('./models/BulkOrder');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://developer:developer@cluster0.oq5fgf6.mongodb.net/marakathai?retryWrites=true&w=majority')
  .then(async () => {
    const orders = await BulkOrder.find({ displayId: { $in: ['MKB00024', 'MKB00011'] } }).populate('product');
    console.log(JSON.stringify(orders, null, 2));
    process.exit(0);
  });
