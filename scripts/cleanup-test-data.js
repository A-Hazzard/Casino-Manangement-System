require('dotenv').config();
const { MongoClient } = require('mongodb');

const DEVLABTUNA_LOCATION_ID = '2691c7cb97750118b3ec290e';
const KEEP_LICENSEES = ['TTG', 'Cabana', 'Barbados'];

async function cleanupTestData() {
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('\n=== CLEANUP TEST DATA ===\n');
    
    // Step 1: Get DevLabTuna's machines
    console.log('Step 1: Finding DevLabTuna machines...');
    const devLabMachines = await db.collection('machines').find({
      gamingLocation: DEVLABTUNA_LOCATION_ID
    }).toArray();
    
    const devLabMachineIds = devLabMachines.map(m => m._id);
    console.log(`Found ${devLabMachines.length} machines at DevLabTuna:`);
    devLabMachines.forEach(m => {
      console.log(`  - ${m.serialNumber} (${m._id})`);
    });
    
    // Step 2: Get licensee IDs to keep
    console.log('\nStep 2: Finding licensees to keep...');
    const keepLicensees = await db.collection('licencees').find({
      name: { $in: KEEP_LICENSEES }
    }).toArray();
    
    const keepLicenseeIds = keepLicensees.map(l => l._id);
    console.log(`Keeping ${keepLicensees.length} licensees:`);
    keepLicensees.forEach(l => {
      console.log(`  - ${l.name} (${l._id})`);
    });
    
    // Step 3: Delete all meters NOT belonging to DevLabTuna's machines
    console.log('\nStep 3: Deleting meters not belonging to DevLabTuna machines...');
    const metersDeleteResult = await db.collection('meters').deleteMany({
      machine: { $nin: devLabMachineIds }
    });
    console.log(`✅ Deleted ${metersDeleteResult.deletedCount} meters`);
    
    // Step 4: Delete all machines NOT at DevLabTuna
    console.log('\nStep 4: Deleting machines not at DevLabTuna...');
    const machinesDeleteResult = await db.collection('machines').deleteMany({
      gamingLocation: { $ne: DEVLABTUNA_LOCATION_ID }
    });
    console.log(`✅ Deleted ${machinesDeleteResult.deletedCount} machines`);
    
    // Step 5: Delete all locations EXCEPT DevLabTuna
    console.log('\nStep 5: Deleting locations except DevLabTuna...');
    const locationsDeleteResult = await db.collection('gamingLocations').deleteMany({
      _id: { $ne: DEVLABTUNA_LOCATION_ID }
    });
    console.log(`✅ Deleted ${locationsDeleteResult.deletedCount} locations`);
    
    // Step 6: Delete all licensees EXCEPT TTG, Cabana, Barbados
    console.log('\nStep 6: Deleting licensees except TTG, Cabana, Barbados...');
    const licenseesDeleteResult = await db.collection('licencees').deleteMany({
      _id: { $nin: keepLicenseeIds }
    });
    console.log(`✅ Deleted ${licenseesDeleteResult.deletedCount} licensees`);
    
    // Step 7: Verify final state
    console.log('\n=== FINAL STATE ===');
    const finalCounts = {
      licensees: await db.collection('licencees').countDocuments(),
      locations: await db.collection('gamingLocations').countDocuments(),
      machines: await db.collection('machines').countDocuments(),
      meters: await db.collection('meters').countDocuments(),
    };
    
    console.log(`Licensees: ${finalCounts.licensees} (TTG, Cabana, Barbados)`);
    console.log(`Locations: ${finalCounts.locations} (DevLabTuna only)`);
    console.log(`Machines: ${finalCounts.machines} (DevLabTuna's 5 machines)`);
    console.log(`Meters: ${finalCounts.meters} (Only for DevLabTuna's machines)`);
    
    // Show DevLabTuna's machines with their meter counts
    console.log('\n=== DEVLABTUNA MACHINES & METERS ===');
    for (const machine of devLabMachines) {
      const meterCount = await db.collection('meters').countDocuments({
        machine: machine._id
      });
      console.log(`${machine.serialNumber}: ${meterCount} meters`);
    }
    
    console.log('\n✅ Cleanup complete!');
    console.log('DevLabTuna location ID:', DEVLABTUNA_LOCATION_ID);
    console.log('Refresh your browser to see the changes.');
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await client.close();
  }
}

cleanupTestData().catch(console.error);
