const { MongoClient } = require('mongodb');
require('dotenv').config();

async function run() {
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    const db = client.db();
    const users = await db.collection('users').find({ 'profileImage.url': '[object Object]' }).toArray();
    console.log('Broken users count:', users.length);
    for (const u of users) {
        await db.collection('users').updateOne({ _id: u._id }, { $unset: { profileImage: '' } });
    }
    console.log('Fixed broken urls in DB.');
    await client.close();
}
run().catch(console.error);
