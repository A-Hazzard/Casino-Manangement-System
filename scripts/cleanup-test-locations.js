require('dotenv').config();
const { MongoClient } = require('mongodb');

const DEVLABTUNA_LOCATION_ID = '2691c7cb97750118b3ec290e';

async function cleanupTestLocations() {
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    await client.connect();
    const db = client.db();

    console.log('\n=== CLEANUP TEST LOCATIONS ===\n');

    // Step 1: Get all locations to see what we have
    console.log('Step 1: Finding all locations...');
    const allLocations = await db
      .collection('gaminglocations')
      .find({})
      .toArray();
    console.log(`Found ${allLocations.length} total locations:`);
    allLocations.forEach(l => {
      console.log(`  - ${l.name} (${l._id})`);
    });

    // Step 2: Delete all Test-* locations
    console.log('\nStep 2: Deleting Test-* locations...');
    const testLocationsDeleteResult = await db
      .collection('gaminglocations')
      .deleteMany({
        name: { $regex: /^Test-/i },
      });
    console.log(
      `✅ Deleted ${testLocationsDeleteResult.deletedCount} test locations`
    );

    // Step 3: Verify final state
    console.log('\n=== FINAL STATE ===');
    const remainingLocations = await db
      .collection('gaminglocations')
      .find({})
      .toArray();
    console.log(`Remaining locations: ${remainingLocations.length}`);
    remainingLocations.forEach(l => {
      console.log(`  - ${l.name} (${l._id})`);
    });

    // Step 4: Verify DevLabTuna machines and meters
    console.log('\n=== DEVLABTUNA VERIFICATION ===');
    const devLabMachines = await db
      .collection('machines')
      .find({
        gamingLocation: DEVLABTUNA_LOCATION_ID,
      })
      .toArray();

    console.log(`DevLabTuna machines: ${devLabMachines.length}`);
    for (const machine of devLabMachines) {
      const meterCount = await db.collection('meters').countDocuments({
        machine: machine._id,
      });
      console.log(`  - ${machine.serialNumber}: ${meterCount} meters`);
    }

    const totalMeters = await db.collection('meters').countDocuments();
    console.log(`\nTotal meters in DB: ${totalMeters}`);

    console.log('\n✅ Cleanup complete! Refresh your browser.');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await client.close();
  }
}

cleanupTestLocations().catch(console.error);
