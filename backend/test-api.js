const axios = require('axios');
const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const admin = await User.findOne({ email: 'vanaja.grmtech@gmail.com' });
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
  
  const res = await axios.get('http://localhost:5000/api/orders/myorders', {
    headers: { Authorization: 'Bearer ' + token }
  });
  
  const giftOrders = res.data.filter(o => o.isGiftOrder);
  console.log('Total orders:', res.data.length);
  console.log('Gift orders:', giftOrders.length);
  if (giftOrders.length > 0) {
    console.log('isGiftOrder property:', giftOrders[0].isGiftOrder);
  }
  process.exit(0);
});
