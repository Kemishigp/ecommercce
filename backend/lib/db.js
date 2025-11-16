import mongoose from 'mongoose';

export const connectDB = async () => {
    const uri = process.env.MONGO_URI;

    if (!uri) {
        console.error("❌ MONGO_URI is missing in .env");
        process.exit(1);
    }

    try {
        const conn = await mongoose.connect(uri);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error("❌ Error connecting to the database", error);
        process.exit(1);
    }
};
export default connectDB;