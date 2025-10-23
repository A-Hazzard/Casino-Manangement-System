/**
 * Fix Collection Meters Script
 *
 * This script updates machine.collectionMeters to match the most recent collection's
 * metersIn/Out values, ensuring that prevIn/prevOut values are correct for new reports.
 */

const { MongoClient } = require("mongodb");

const MONGODB_URI =
  process.env.MONGO_URI ||
  "mongodb://sunny1:87ydaiuhdsia2e@192.168.8.2:32018/sas-prod-local?authSource=admin";

async function fixCollectionMeters() {
  console.log("🔧 Starting Collection Meters Fix...\n");

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB\n");

    const db = client.db();
    const machinesCollection = db.collection("machines");
    const collectionsCollection = db.collection("collections");

    // Get all machines
    const machines = await machinesCollection.find({}).toArray();
    console.log(`📊 Found ${machines.length} total machines\n`);

    let fixedCount = 0;
    let skippedCount = 0;
    let noCollectionsCount = 0;

    for (const machine of machines) {
      const machineName =
        machine.machineName || machine.serialNumber || machine._id;

      // Get the most recent collection for this machine
      const mostRecentCollection = await collectionsCollection.findOne(
        {
          machineId: machine._id,
          deletedAt: { $exists: false },
        },
        { sort: { timestamp: -1 } }
      );

      if (!mostRecentCollection) {
        console.log(`⚠️  ${machineName}: No collections found (skipping)`);
        noCollectionsCount++;
        continue;
      }

      const currentCollectionMetersIn = machine.collectionMeters?.metersIn || 0;
      const currentCollectionMetersOut =
        machine.collectionMeters?.metersOut || 0;

      const expectedMetersIn = mostRecentCollection.metersIn || 0;
      const expectedMetersOut = mostRecentCollection.metersOut || 0;

      const needsUpdate =
        currentCollectionMetersIn !== expectedMetersIn ||
        currentCollectionMetersOut !== expectedMetersOut;

      if (needsUpdate) {
        console.log(`🔧 Fixing ${machineName}...`);
        console.log(
          `   OLD: In=${currentCollectionMetersIn}, Out=${currentCollectionMetersOut}`
        );
        console.log(`   NEW: In=${expectedMetersIn}, Out=${expectedMetersOut}`);
        console.log(
          `   Diff: In=${expectedMetersIn - currentCollectionMetersIn}, Out=${
            expectedMetersOut - currentCollectionMetersOut
          }`
        );

        // Update the machine's collectionMeters
        await machinesCollection.updateOne(
          { _id: machine._id },
          {
            $set: {
              "collectionMeters.metersIn": expectedMetersIn,
              "collectionMeters.metersOut": expectedMetersOut,
              updatedAt: new Date(),
            },
          }
        );

        console.log(`   ✅ Updated successfully\n`);
        fixedCount++;
      } else {
        console.log(`✅ ${machineName}: Already correct (skipping)`);
        skippedCount++;
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("📊 FIX SUMMARY");
    console.log("=".repeat(80));
    console.log(`✅ Machines FIXED: ${fixedCount}`);
    console.log(`✅ Machines already correct (skipped): ${skippedCount}`);
    console.log(
      `⚠️  Machines with no collections (skipped): ${noCollectionsCount}`
    );
    console.log(`📊 Total machines processed: ${machines.length}`);
    console.log("=".repeat(80));
  } catch (error) {
    console.error("❌ Error during fix:", error);
  } finally {
    await client.close();
    console.log("\n✅ MongoDB connection closed");
  }
}

fixCollectionMeters();
