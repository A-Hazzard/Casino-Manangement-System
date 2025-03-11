import mongoose from "mongoose"
import { Db } from "mongodb"

const MONGO_URI = process.env.MONGO_URI as string

if (!MONGO_URI) {
  throw new Error("❌ MongoDB connection string is missing from env variables")
}

let cachedDb: mongoose.Connection | null = null
let connectionPromise: Promise<Db | undefined> | null = null; // For locking

/**
 * Connects to MongoDB and returns the database instance.
 * Uses caching to avoid multiple connections.
 * 
 * @returns {Promise<Db>} - The MongoDB database instance.
 */
export async function connectDB(): Promise<Db | undefined> {
  if (cachedDb) {
    console.log("🔄 Using cached database connection");
    return mongoose.connection.db;
  }

  if (!connectionPromise) {
    connectionPromise = (async () => {
      console.log("🔌 Connecting to MongoDB...");
      const connection = await mongoose.connect(MONGO_URI);
      cachedDb = connection.connection; // Cache successful connection
      console.log("✅ Connected to MongoDB");

      return mongoose.connection.db;
    })();
  }

  return connectionPromise;
}
