require('dotenv').config();
const mongoose = require('mongoose');
const AdvancedBooking = require('./models/AdvancedBooking');
const Counter = require('./models/Counter');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/marakathai').then(async () => {
  console.log('Connected to DB for backfill.');
  
  const bookings = await AdvancedBooking.find({ orderId: { $exists: false } }).sort({ createdAt: 1 });
  console.log(`Found ${bookings.length} bookings without orderId.`);
  
  for (const booking of bookings) {
    const counter = await Counter.findByIdAndUpdate(
      { _id: 'advancedBookingId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const orderId = `MKA${String(counter.seq).padStart(5, '0')}`;
    booking.orderId = orderId;
    await booking.save();
    console.log(`Updated booking ${booking._id} with orderId ${orderId}`);
  }
  
  console.log('Backfill complete.');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
