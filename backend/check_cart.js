const mongoose = require('mongoose');
const Cart = require('./models/Cart');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const carts = await Cart.find({});
    console.log("Carts:", JSON.stringify(carts, null, 2));
    process.exit(0);
});
