import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGO_URI;
if (typeof window === "undefined" && !MONGODB_URI) {
  throw new Error("MONGO_URI not set in environment variables");
}

const mongooseCache: {
  conn: mongoose.Connection | null;
  promise: Promise<mongoose.Connection> | null;
} = {
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
  if (typeof window !== "undefined") {
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
        connectTimeoutMS: 30000,
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 30000,
      })
      .then((mongooseInstance) => {
        return mongooseInstance.connection;
      })
      .catch((err) => {
        mongooseCache.promise = null;
        // Log connection errors but don't throw to prevent app crashes
        if (err.name === "MongooseServerSelectionError") {
          console.warn(
            "🔧 MongoDB server selection timeout - database may be unavailable"
          );
        } else if (err.name === "MongooseTimeoutError") {
          console.warn(
            "⏰ MongoDB connection timeout - database may be slow or unavailable"
          );
        } else {
          console.warn("⚠️ MongoDB connection error:", err.message);
        }
        throw err;
      });
  }

  mongooseCache.conn = await mongooseCache.promise;

  // Ensure connection is ready before returning
  if (mongooseCache.conn.readyState !== 1) {
    await new Promise((resolve, reject) => {
      mongooseCache.conn!.once("open", resolve);
      mongooseCache.conn!.once("error", reject);
    });
  }

  return mongooseCache.conn.db;
}
