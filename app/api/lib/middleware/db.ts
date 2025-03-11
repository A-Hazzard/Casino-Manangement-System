// lib/middleware/db.ts
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGO_URI;
if (!MONGODB_URI) throw new Error('❌ MONGO_URI not set in environment variables');

interface MongooseCache {
  conn: mongoose.Connection | null;
  promise: Promise<mongoose.Connection> | null;
}

const mongooseCache: MongooseCache = {
  conn: null,
  promise: null,
};

/**
 * Connects to MongoDB with caching and explicitly returns a native MongoDB Db instance.
 *
 * @returns {Promise<Db>} MongoDB database instance (native MongoDB driver).
 */
export async function connectDB() {
  if (mongooseCache.conn) {
    console.log('🔄 Using cached MongoDB connection');
    return mongooseCache.conn.db; // Return the native driver Db instance
  }

  if (!mongooseCache.promise) {
    mongooseCache.promise = mongoose
        .connect(MONGODB_URI || "", {
          bufferCommands: false,
          connectTimeoutMS: 10000,
        })
        .then((mongooseInstance) => {
          console.log('🔥 MongoDB connected successfully.');
          return mongooseInstance.connection;
        })
        .catch((err) => {
          mongooseCache.promise = null;
          console.error('❌ MongoDB connection error:', err);
          throw err;
        });
  }

  mongooseCache.conn = await mongooseCache.promise;
  return mongooseCache.conn.db; // Native MongoDB driver
}
