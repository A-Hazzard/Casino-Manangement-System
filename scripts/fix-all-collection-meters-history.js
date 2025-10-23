const { MongoClient } = require("mongodb");

const MONGODB_URI =
  "mongodb://sunny1:87ydaiuhdsia2e@192.168.8.2:32018/sas-prod-local?authSource=admin";

async function fixAllCollectionMetersHistory() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("sas-prod-local");
    const machinesCollection = db.collection("machines");
    const collectionsCollection = db.collection("collections");

    console.log("\n🔧 Fixing all collectionMetersHistory issues...\n");

    // Find all machines with collectionMetersHistory
    const machinesWithHistory = await machinesCollection
      .find({
        collectionMetersHistory: { $exists: true, $ne: [] },
      })
      .toArray();

    console.log(
      `Found ${machinesWithHistory.length} machines with collectionMetersHistory`
    );

    let totalMachinesFixed = 0;
    let totalEntriesFixed = 0;
    let machinesWithIssues = 0;

    for (const machine of machinesWithHistory) {
      const history = machine.collectionMetersHistory || [];

      // Check if this machine has issues (any entry after the first with prevIn/prevOut as 0 or undefined)
      let hasIssues = false;
      for (let i = 1; i < history.length; i++) {
        const entry = history[i];
        const prevIn = entry.prevIn || 0;
        const prevOut = entry.prevOut || 0;

        if (
          (prevIn === 0 || prevIn === undefined || prevIn === null) &&
          (prevOut === 0 || prevOut === undefined || prevOut === null)
        ) {
          hasIssues = true;
          break;
        }
      }

      if (!hasIssues) {
        console.log(
          `✅ Machine ${
            machine.name || machine.assetNumber || machine._id
          } - No issues found`
        );
        continue;
      }

      machinesWithIssues++;
      console.log(
        `🔧 Fixing machine: ${
          machine.name || machine.assetNumber || machine._id
        }`
      );

      // Get all collections for this machine
      const machineCollections = await collectionsCollection
        .find({
          machineId: machine._id.toString(),
          deletedAt: { $exists: false },
        })
        .sort({ timestamp: 1 })
        .toArray();

      console.log(
        `   Found ${machineCollections.length} collections for this machine`
      );

      // Rebuild history like the API does
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

      // Count how many entries were fixed
      let entriesFixed = 0;
      for (let i = 1; i < newHistory.length; i++) {
        const oldEntry = history[i];
        const newEntry = newHistory[i];

        if (
          oldEntry &&
          ((oldEntry.prevIn || 0) !== newEntry.prevIn ||
            (oldEntry.prevOut || 0) !== newEntry.prevOut)
        ) {
          entriesFixed++;
        }
      }

      // Update the machine with the fixed history
      const mostRecentCollection =
        machineCollections[machineCollections.length - 1];
      const result = await machinesCollection.updateOne(
        { _id: machine._id },
        {
          $set: {
            collectionMetersHistory: newHistory,
            collectionTime:
              machineCollections.length > 0
                ? new Date(
                    machineCollections[machineCollections.length - 1].timestamp
                  )
                : undefined,
            previousCollectionTime:
              machineCollections.length > 1
                ? new Date(
                    machineCollections[machineCollections.length - 2].timestamp
                  )
                : undefined,
            // Sync collectionMeters with most recent collection
            "collectionMeters.metersIn": mostRecentCollection?.metersIn || 0,
            "collectionMeters.metersOut": mostRecentCollection?.metersOut || 0,
          },
        }
      );

      if (result.modifiedCount > 0) {
        totalMachinesFixed++;
        totalEntriesFixed += entriesFixed;
        console.log(
          `   ✅ Fixed ${entriesFixed} entries in collectionMetersHistory`
        );
      } else {
        console.log(`   ❌ Failed to update machine`);
      }
    }

    console.log(`\n🎉 Fix Complete!`);
    console.log(`   Total machines processed: ${machinesWithHistory.length}`);
    console.log(`   Machines with issues: ${machinesWithIssues}`);
    console.log(`   Machines fixed: ${totalMachinesFixed}`);
    console.log(`   Total entries fixed: ${totalEntriesFixed}`);

    // Run a final verification
    console.log(`\n🔍 Running final verification...`);
    const remainingIssues = await machinesCollection.countDocuments({
      collectionMetersHistory: { $exists: true, $ne: [] },
      $expr: {
        $gt: [
          {
            $size: {
              $filter: {
                input: "$collectionMetersHistory",
                cond: {
                  $and: [
                    {
                      $ne: [
                        { $arrayElemAt: ["$$ROOT.collectionMetersHistory", 0] },
                        "$$this",
                      ],
                    }, // Not first entry
                    {
                      $or: [
                        { $eq: ["$$this.prevIn", 0] },
                        { $eq: ["$$this.prevIn", null] },
                        { $not: { $ifNull: ["$$this.prevIn", false] } },
                      ],
                    },
                  ],
                },
              },
            },
          },
          0,
        ],
      },
    });

    console.log(`   Remaining machines with issues: ${remainingIssues}`);

    if (remainingIssues === 0) {
      console.log(`\n🎯 All collectionMetersHistory issues have been fixed!`);
    } else {
      console.log(
        `\n⚠️  ${remainingIssues} machines still have issues that need manual attention.`
      );
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
    console.log("\n✅ Fix operation complete");
  }
}

fixAllCollectionMetersHistory().catch(console.error);
