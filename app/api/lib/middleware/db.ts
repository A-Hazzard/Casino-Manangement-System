// lib/middleware/db.ts
import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    throw new Error("❌ MONGO_URI not set in environment variables");
}

// Extend Node's global object to include our mongoose cache.
declare global {
    namespace NodeJS {
        interface Global {
            __mongooseCache?: {
                conn: mongoose.Connection | null;
                promise: Promise<mongoose.Connection> | null;
            };
        }
    }
}

// Ensure the global cache is initialized (works in serverless envs like Vercel)
const globalWithCache = global as typeof global & { __mongooseCache?: { conn: mongoose.Connection | null; promise: Promise<mongoose.Connection> | null } };

if (!globalWithCache.__mongooseCache) {
    globalWithCache.__mongooseCache = { conn: null, promise: null };
}

const cached = globalWithCache.__mongooseCache; // Now TypeScript knows this exists

export async function connectDB() {
    if (cached.conn) {
        console.log("🔄 Using cached MongoDB connection");
        return cached.conn.db; // Return the native MongoDB driver instance
    }

    if (!cached.promise) {
        cached.promise = mongoose
            .connect(MONGO_URI!, {
                bufferCommands: false,
                connectTimeoutMS: 30000,
            })
            .then((mongooseInstance) => {
                console.log("🔥 MongoDB connected successfully.");
                return mongooseInstance.connection;
            })
            .catch((err) => {
                cached.promise = null;
                console.error("❌ MongoDB connection error:", err);
                throw err;
            });
    }

    cached.conn = await cached.promise;
    return cached.conn.db;
}
