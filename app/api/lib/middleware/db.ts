import mongoose from "mongoose";
import { Db } from "mongodb";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/";

if (!MONGO_URI) {
    console.error("❌ MONGO_URI is not set in environment variables.");
}

export async function connectDB(): Promise<Db | null> { // Now returns `Db | null`
    try {
        const connection = await mongoose.connect(MONGO_URI, {
            bufferCommands: false,
            connectTimeoutMS: 30000,
        });

        console.log("🔥 MongoDB connected successfully.");

        if (!connection.connection.db) {
            console.error("❌ Failed to get MongoDB database instance.");
            return null; // Instead of throwing, we return `null`
        }

        return connection.connection.db; // Everything is good, return the database
    } catch (err) {
        console.error("❌ MongoDB connection error:", err);
        return null; // Return `null` on failure
    }
}
