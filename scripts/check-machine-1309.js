const { MongoClient } = require("mongodb");

const MONGODB_URI =
  "mongodb://sunny1:87ydaiuhdsia2e@192.168.8.2:32018/sas-prod-local?authSource=admin";

async function checkMachine1309() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("🔍 Connected to MongoDB");

    const db = client.db("sas-prod-local");
    const machinesCollection = db.collection("machines");

    // Check all machines with serialNumber 1309
    const machines = await machinesCollection
      .find({ serialNumber: "1309" })
      .toArray();
    console.log(
      `\n📋 Found ${machines.length} machines with serialNumber 1309:`
    );

    machines.forEach((machine, index) => {
      console.log(`\nMachine ${index + 1}:`);
      console.log(`  _id: ${machine._id}`);
      console.log(`  serialNumber: ${machine.serialNumber}`);
      console.log(`  relayId: ${machine.relayId}`);

      if (
        machine.collectionMetersHistory &&
        machine.collectionMetersHistory.length > 0
      ) {
        console.log(
          `  collectionMetersHistory entries: ${machine.collectionMetersHistory.length}`
        );
        console.log(
          `  Entry 2 prevIn: ${machine.collectionMetersHistory[1]?.prevIn}`
        );
        console.log(
          `  Entry 2 prevOut: ${machine.collectionMetersHistory[1]?.prevOut}`
        );
      } else {
        console.log(`  No collectionMetersHistory found`);
      }
    });

    // Also check the specific machine ID we've been using
    const specificMachine = await machinesCollection.findOne({
      _id: "5769366190e560cdab9b8e51",
    });
    if (specificMachine) {
      console.log(`\n📋 Specific machine 5769366190e560cdab9b8e51:`);
      console.log(`  serialNumber: ${specificMachine.serialNumber}`);
      console.log(`  relayId: ${specificMachine.relayId}`);
    } else {
      console.log(`\n❌ Machine 5769366190e560cdab9b8e51 not found`);
    }
  } catch (error) {
    console.error("❌ Error:", error.message || error);
  } finally {
    await client.close();
  }
}

checkMachine1309().catch(console.error);
