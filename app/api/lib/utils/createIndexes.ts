import { connectDB } from "../middleware/db";

/**
 * Creates all necessary database indexes for optimal performance.
 * This should be called once during application startup.
 */
export async function createDatabaseIndexes() {
  try {
    const db = await connectDB();
    if (!db) {
      console.error("❌ Failed to connect to database for index creation");
      return;
    }

    console.log("🔧 Creating database indexes for optimal performance...");

    // Create indexes for meters collection
    await db.collection("meters").createIndex({ location: 1, createdAt: 1 });
    await db.collection("meters").createIndex({ machine: 1, readAt: 1 });
    await db.collection("meters").createIndex({ createdAt: 1 });
    await db.collection("meters").createIndex({ location: 1, machine: 1 });
    await db.collection("meters").createIndex({ machine: 1, createdAt: 1 }); // For our optimized query
    await db.collection("meters").createIndex({ "movement.drop": 1 }); // For aggregation
    await db.collection("meters").createIndex({ "movement.totalCancelledCredits": 1 }); // For aggregation

    // Create indexes for machines collection
    await db.collection("machines").createIndex({ gamingLocation: 1, deletedAt: 1 });
    await db.collection("machines").createIndex({ deletedAt: 1 });
    await db.collection("machines").createIndex({ lastActivity: 1 });
    await db.collection("machines").createIndex({ isSasMachine: 1 });
    await db.collection("machines").createIndex({ "sasMeters.coinIn": -1 }); // For sorting
    await db.collection("machines").createIndex({ "Custom.name": 1 }); // For machine names
    await db.collection("machines").createIndex({ serialNumber: 1 }); // For machine names

    // Create indexes for gaminglocations collection
    await db.collection("gaminglocations").createIndex({ "rel.licencee": 1, deletedAt: 1 });
    await db.collection("gaminglocations").createIndex({ deletedAt: 1 });
    await db.collection("gaminglocations").createIndex({ _id: 1, deletedAt: 1 });

    console.log("✅ Database indexes created successfully");
  } catch (error) {
    console.error("❌ Error creating database indexes:", error);
  }
} 