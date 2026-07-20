require('dotenv').config({ path: '.env' });
const connectDB = require('./config/db');
const Product = require('./models/Product');

connectDB().then(async () => {
  const res = await Product.updateMany(
    { images: { $elemMatch: { url: '/hero2.jpeg' } } },
    { $set: { images: [] } }
  );
  console.log('Updated products:', res);
  process.exit(0);
}).catch(console.error);
