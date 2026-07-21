const m = require('mongoose');
m.connect(require('dotenv').config().parsed.MONGO_URI).then(async () => {
  const db = m.connection.db;
  const docs = await db.collection('productvariants').find({}).limit(5).toArray();
  console.log(JSON.stringify(docs.map(d => d.images), null, 2));
  
  const products = await db.collection('products').find({}).limit(5).toArray();
  console.log("PRODUCTS IMAGES:");
  console.log(JSON.stringify(products.map(d => d.images), null, 2));
  
  process.exit();
});
