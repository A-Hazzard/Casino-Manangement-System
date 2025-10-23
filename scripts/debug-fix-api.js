const { MongoClient } = require("mongodb");

const MONGODB_URI =
  "mongodb://sunny1:87ydaiuhdsia2e@192.168.8.2:32018/sas-prod-local?authSource=admin";

async function debugFixApi() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("🔍 Connected to MongoDB");

    const db = client.db("sas-prod-local");
    const machinesCollection = db.collection("machines");
    const collectionsCollection = db.collection("collections");

    // Get machine 1309
    const machineId = "5769366190e560cdab9b8e51";

    console.log("\n1. Getting machine document...");
    const machine = await machinesCollection.findOne({ _id: machineId });
    if (!machine) {
      console.log("❌ Machine not found");
      return;
    }
    console.log(`✅ Found machine: ${machine.serialNumber}`);

    console.log("\n2. Getting collections for this machine...");
    const machineCollections = await collectionsCollection
      .find({
        machineId: machineId,
        deletedAt: { $exists: false },
      })
      .sort({ timestamp: 1 })
      .toArray();
    console.log(`✅ Found ${machineCollections.length} collections`);

    console.log("\n3. Rebuilding history...");
    const newHistory = machineCollections.map((collection, index) => {
      let prevIn = 0;
      let prevOut = 0;

      if (index > 0) {
        const previousCollection = machineCollections[index - 1];
        prevIn = previousCollection.metersIn || 0;
        prevOut = previousCollection.metersOut || 0;
      }

      return {
        locationReportId: collection.locationReportId,
        metersIn: collection.metersIn || 0,
        metersOut: collection.metersOut || 0,
        prevIn: prevIn,
        prevOut: prevOut,
        timestamp: new Date(collection.timestamp),
        createdAt: new Date(collection.createdAt || collection.timestamp),
      };
    });

    console.log("✅ Rebuilt history:");
    newHistory.slice(0, 3).forEach((entry, index) => {
      console.log(
        `  Entry ${index + 1}: prevIn=${entry.prevIn}, prevOut=${entry.prevOut}`
      );
    });

    console.log("\n4. Updating machine document...");
    const mostRecentCollection =
      machineCollections[machineCollections.length - 1];
    const updateResult = await machinesCollection.updateOne(
      { _id: machineId },
      {
        $set: {
          collectionMetersHistory: newHistory,
          collectionTime: mostRecentCollection
            ? new Date(mostRecentCollection.timestamp)
            : undefined,
          previousCollectionTime:
            machineCollections.length > 1
              ? new Date(
                  machineCollections[machineCollections.length - 2].timestamp
                )
              : undefined,
          "collectionMeters.metersIn": mostRecentCollection?.metersIn || 0,
          "collectionMeters.metersOut": mostRecentCollection?.metersOut || 0,
          updatedAt: new Date(),
        },
      }
    );

    console.log("✅ Update result:", updateResult);

    console.log("\n5. Verifying update...");
    const updatedMachine = await machinesCollection.findOne({ _id: machineId });
    if (
      updatedMachine.collectionMetersHistory &&
      updatedMachine.collectionMetersHistory.length > 0
    ) {
      console.log("✅ Updated machine history:");
      updatedMachine.collectionMetersHistory
        .slice(0, 3)
        .forEach((entry, index) => {
          console.log(
            `  Entry ${index + 1}: prevIn=${entry.prevIn}, prevOut=${
              entry.prevOut
            }`
          );
        });
    }
  } catch (error) {
    console.error("❌ Error:", error.message || error);
  } finally {
    await client.close();
  }
}

debugFixApi().catch(console.error);
