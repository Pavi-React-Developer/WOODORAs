require('dotenv').config({ path: 'backend/.env' });
const mongoose = require('mongoose');
const Product = require('./backend/models/Product');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const res = await Product.updateMany(
    { $or: [{ images: { $size: 0 } }, { images: { $exists: false } }] },
    { $set: { images: ['/hero1.jpeg'] } }
  );
  console.log('Updated products:', res);
  process.exit(0);
}).catch(console.error);
