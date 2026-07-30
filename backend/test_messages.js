const mongoose = require('mongoose');
const GiftMessage = require('./models/GiftMessage');
require('dotenv').config({ path: './.env' });

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const messages = await GiftMessage.find().lean();
  console.log(JSON.stringify(messages, null, 2));
  process.exit(0);
});
