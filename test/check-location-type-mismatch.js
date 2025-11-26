/**
 * Check for location ID type mismatch in Dashboard API
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not found');
  process.exit(1);
}

async function check() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected\n');
    
    const db = client.db();
    
    // Get all locations
    const locations = await db.collection('gaminglocations').find({
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    }).toArray();
    
    console.log(`📊 Found ${locations.length} locations\n`);
    
    // Check how machines store gamingLocation
    const sampleMachine = await db.collection('machines').findOne({
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    });
    
    if (sampleMachine) {
      console.log('🔍 Sample Machine gamingLocation type:');
      console.log(`   Type: ${typeof sampleMachine.gamingLocation}`);
      console.log(`   Value: ${sampleMachine.gamingLocation}`);
      console.log(`   Is ObjectId: ${sampleMachine.gamingLocation instanceof ObjectId}`);
      console.log(`   toString(): ${sampleMachine.gamingLocation.toString()}\n`);
    }
    
    // Test query with string IDs (like Dashboard API does)
    const locationIdsAsStrings = locations.map(l => l._id.toString());
    console.log(`🔍 Testing query with string IDs (Dashboard method):`);
    const machinesWithStrings = await db.collection('machines').find({
      gamingLocation: { $in: locationIdsAsStrings },
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    }).toArray();
    console.log(`   Found ${machinesWithStrings.length} machines\n`);
    
    // Test query with ObjectIds (correct method)
    const locationIdsAsObjectIds = locations.map(l => l._id);
    console.log(`🔍 Testing query with ObjectIds (correct method):`);
    const machinesWithObjectIds = await db.collection('machines').find({
      gamingLocation: { $in: locationIdsAsObjectIds },
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    }).toArray();
    console.log(`   Found ${machinesWithObjectIds.length} machines\n`);
    
    if (machinesWithStrings.length !== machinesWithObjectIds.length) {
      console.log(`❌ TYPE MISMATCH DETECTED!`);
      console.log(`   String query: ${machinesWithStrings.length} machines`);
      console.log(`   ObjectId query: ${machinesWithObjectIds.length} machines`);
      console.log(`   Missing: ${machinesWithObjectIds.length - machinesWithStrings.length} machines\n`);
      
      // Find which machines are missing
      const stringMachineIds = new Set(machinesWithStrings.map(m => m._id.toString()));
      const missingMachines = machinesWithObjectIds.filter(
        m => !stringMachineIds.has(m._id.toString())
      );
      
      console.log(`🔍 Missing machines (first 5):`);
      missingMachines.slice(0, 5).forEach(m => {
        console.log(`   Machine: ${m._id}, Location: ${m.gamingLocation} (type: ${typeof m.gamingLocation})`);
      });
    } else {
      console.log(`✅ Both queries return the same number of machines`);
    }
    
    // Check licensee assignment
    console.log(`\n🔍 Checking licensee assignments:`);
    const licenseeCounts = {};
    locations.forEach(loc => {
      const licensee = loc.rel?.licencee;
      const key = licensee ? licensee.toString() : 'null';
      licenseeCounts[key] = (licenseeCounts[key] || 0) + 1;
    });
    
    console.log(`   Licensee distribution:`);
    Object.entries(licenseeCounts).forEach(([key, count]) => {
      console.log(`     ${key === 'null' ? 'Unassigned' : key}: ${count} locations`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

check().catch(console.error);

