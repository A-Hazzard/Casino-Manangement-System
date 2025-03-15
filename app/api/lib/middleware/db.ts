// lib/middleware/db.ts
import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/";
if (!MONGO_URI) {
    throw new Error("❌ MONGO_URI not set in environment variables");
}

export async function connectDB() {
    try {
        const connection = await mongoose.connect(MONGO_URI, {
            bufferCommands: false,
            connectTimeoutMS: 30000,
        });
        console.log("🔥 MongoDB connected successfully.");
        return connection.connection; // Make sure to return the actual connection
    } catch (err) {
        console.error("❌ MongoDB connection error:", err);
        throw err;
    }
}
