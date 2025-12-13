import mongoose from 'mongoose';

const mongooseCache: {
  conn: mongoose.Connection | null;
  promise: Promise<mongoose.Connection> | null;
  connectionString: string | null;
} = {
  conn: null,
  promise: null,
  connectionString: null,
};

/**
 * Get current MongoDB URI from environment
 * Reads directly from process.env to support dynamic updates
 */
function getMongodbUri(): string {
  const uri = process.env.MONGODB_URI;
  if (typeof window === 'undefined' && !uri) {
    throw new Error('MONGODB_URI not set in environment variables');
  }
  return uri || '';
}

/**
 * Close existing MongoDB connection
 */
async function closeConnection() {
  if (mongooseCache.conn) {
    try {
      await mongooseCache.conn.close();
    } catch (err) {
      console.error('[DB] Error closing connection:', err);
    }
    mongooseCache.conn = null;
    mongooseCache.promise = null;
    mongooseCache.connectionString = null;
  }
}

/**
 * Connects to MongoDB with caching and explicitly returns a native MongoDB Db instance.
 * Automatically detects connection string changes and reconnects.
 *
 * @returns Promise resolving to a MongoDB database instance (native MongoDB driver).
 */
export async function connectDB() {
  // Only run on server-side
  if (typeof window !== 'undefined') {
    throw new Error('connectDB can only be called on the server-side');
  }

  const MONGODB_URI = getMongodbUri();

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI not set in environment variables');
  }

  // Detect connection string change - close old connection and reconnect
  if (
    mongooseCache.conn &&
    mongooseCache.connectionString &&
    mongooseCache.connectionString !== MONGODB_URI
  ) {
    await closeConnection();
  }

  if (mongooseCache.conn) {
    return mongooseCache.conn.db;
  }

  if (!mongooseCache.promise) {
    mongooseCache.connectionString = MONGODB_URI;

    mongooseCache.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        connectTimeoutMS: 30000,
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 120000, // 2 minute socket timeout to prevent hanging
        maxPoolSize: 10, // Limit connection pool size
        minPoolSize: 2, // Maintain minimum connections
      })
      .then(mongooseInstance => {
        return mongooseInstance.connection;
      })
      .catch(err => {
        mongooseCache.promise = null;
        mongooseCache.connectionString = null;
        // Log connection errors but don't throw to prevent app crashes
        if (err.name === 'MongooseServerSelectionError') {
          console.warn(
            '🔧 MongoDB server selection timeout - database may be unavailable'
          );
        } else if (err.name === 'MongooseTimeoutError') {
          console.warn(
            '⏰ MongoDB connection timeout - database may be slow or unavailable'
          );
        } else {
          console.warn('⚠️ MongoDB connection error:', err.message);
        }
        throw err;
      });
  }

  mongooseCache.conn = await mongooseCache.promise;

  // Ensure connection is ready before returning
  if (mongooseCache.conn.readyState !== 1) {
    await new Promise((resolve, reject) => {
      mongooseCache.conn!.once('open', resolve);
      mongooseCache.conn!.once('error', reject);
    });
  }

  return mongooseCache.conn.db;
}

/**
 * Force disconnect and clear cache
 * Useful for testing or when connection string changes
 */
export async function disconnectDB() {
  await closeConnection();
}
