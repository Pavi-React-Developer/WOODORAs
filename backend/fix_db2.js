const { MongoClient } = require('mongodb');
require('dotenv').config();

async function run() {
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    const db = client.db();
    const users = await db.collection('users').find({ profileImage: '[object Object]' }).toArray();
    console.log('Broken profileImage count:', users.length);
    for (const u of users) {
        await db.collection('users').updateOne({ _id: u._id }, { $unset: { profileImage: '' } });
    }
    
    // Also check if profileImage is a string at all
    const usersStr = await db.collection('users').find({ profileImage: { $type: "string" } }).toArray();
    console.log('String profileImage count:', usersStr.length);
    for (const u of usersStr) {
        await db.collection('users').updateOne({ _id: u._id }, { $unset: { profileImage: '' } });
    }

    console.log('Fixed broken urls in DB.');
    await client.close();
}
run().catch(console.error);
