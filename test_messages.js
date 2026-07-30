const mongoose = require('mongoose');
const GiftMessage = require('./backend/models/GiftMessage');
require('dotenv').config({ path: './backend/.env' });

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
  const messages = await GiftMessage.find().lean();
  console.log(JSON.stringify(messages, null, 2));
  process.exit(0);
});
