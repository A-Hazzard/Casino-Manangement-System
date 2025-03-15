// lib/middleware/db.ts
import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    throw new Error("❌ MONGO_URI not set in environment variables");
}

// Use a global variable for caching the connection in serverless environments.
const globalCache = global as typeof global & {
    __mongooseCache?: { conn: mongoose.Connection | null; promise: Promise<mongoose.Connection> | null };
};

// Ensure globalCache.__mongooseCache exists
if (!globalCache.__mongooseCache) {
    globalCache.__mongooseCache = { conn: null, promise: null };
}

export async function connectDB() {
    const cache = globalCache.__mongooseCache!; // Now TypeScript knows it's always defined

    if (cache.conn) {
        console.log("🔄 Using cached MongoDB connection");
        return cache.conn.db;
    }

    if (!cache.promise) {
        cache.promise = mongoose
            .connect(MONGO_URI!, {
                bufferCommands: false,
                connectTimeoutMS: 30000,
            })
            .then((mongooseInstance) => {
                console.log("🔥 MongoDB connected successfully.");
                return mongooseInstance.connection;
            })
            .catch((err) => {
                cache.promise = null;
                console.error("❌ MongoDB connection error:", err);
                throw err;
            });
    }

    cache.conn = await cache.promise;
    return cache.conn.db;
}
