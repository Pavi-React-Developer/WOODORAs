const mongoose = require('mongoose');
const BulkOrder = require('./models/BulkOrder');
require('./models/Product');
require('./models/Category');
require('./models/SubCategory');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const orders = await BulkOrder.find({ displayId: { $in: ['MKB00024', 'MKB00011'] } })
      .populate('category')
      .populate('subCategory')
      .populate('product');
    console.log(JSON.stringify(orders.map(o => ({
      id: o.displayId,
      catImage: o.category?.image,
      subCatImage: o.subCategory?.image
    })), null, 2));
    process.exit(0);
  });
