const mongoose = require('mongoose');

const connectDB = async () => {
    // Primary: Atlas URI from env or hardcoded (comment out to use localhost directly)
    const atlasUri = process.env.MONGO_URI;
    //   || "mongodb+srv://mekharamesh3_db_user:Mekha%402004@cluster0.oq5fgf6.mongodb.net/woodentoy?appName=Cluster0";
    const localUri = "mongodb://127.0.0.1:27017/woodentoy";

    // If no Atlas URI is configured, connect directly to localhost
    if (!atlasUri) {
        try {
            const localConn = await mongoose.connect(localUri);
            console.log(`MongoDB Connected (Localhost): ${localConn.connection.host}`);
        } catch (localError) {
            console.error(`Localhost connection failed: ${localError.message}`);
            process.exit(1);
        }
        return;
    }

    // Try Atlas first, fallback to localhost
    try {
        console.log("Attempting to connect to MongoDB Atlas...");
        const conn = await mongoose.connect(atlasUri, {
            serverApi: {
                version: '1',
                strict: true,
                deprecationErrors: true,
            }
        });
        console.log(`MongoDB Connected (Atlas): ${conn.connection.host}`);
    } catch (atlasError) {
        console.error(`Atlas connection failed: ${atlasError.message}`);
        console.log("Falling back to localhost MongoDB...");

        try {
            const localConn = await mongoose.connect(localUri);
            console.log(`MongoDB Connected (Localhost): ${localConn.connection.host}`);
        } catch (localError) {
            console.error(`Localhost connection also failed: ${localError.message}`);
            process.exit(1);
        }
    }
};

module.exports = connectDB;
