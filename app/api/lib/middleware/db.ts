import mongoose from "mongoose";
import { MongooseCache } from "@/lib/types/mongo";

const MONGODB_URI = process.env.MONGO_URI;
if (typeof window === 'undefined' && !MONGODB_URI) {
  throw new Error("MONGO_URI not set in environment variables");
}

const mongooseCache: MongooseCache = {
  conn: null,
  promise: null,
};

/**
 * Connects to MongoDB with caching and explicitly returns a native MongoDB Db instance.
 *
 * @returns Promise resolving to a MongoDB database instance (native MongoDB driver).
 */
export async function connectDB() {
  // Only run on server-side
  if (typeof window !== 'undefined') {
    throw new Error("connectDB can only be called on the server-side");
  }

  if (!MONGODB_URI) {
    throw new Error("MONGO_URI not set in environment variables");
  }

  if (mongooseCache.conn) {
    return mongooseCache.conn.db;
  }

  if (!mongooseCache.promise) {
    mongooseCache.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        connectTimeoutMS: 10000,
      })
      .then((mongooseInstance) => {
        return mongooseInstance.connection;
      })
      .catch((err) => {
        mongooseCache.promise = null;
        console.error("MongoDB connection error:", err);
        throw err;
      });
  }

  mongooseCache.conn = await mongooseCache.promise;
  return mongooseCache.conn.db;
}
