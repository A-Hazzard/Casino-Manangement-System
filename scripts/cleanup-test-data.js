/**
 * Cleanup Test Data Script
 * Removes all test locations and machines created by generate-test-data.js
 * 
 * Run with: node scripts/cleanup-test-data.js
 * Dry run: node scripts/cleanup-test-data.js --dry-run
 */

require('dotenv').config();
const mongoose = require('mongoose');

const isDryRun = process.argv.includes('--dry-run');

console.log('\n🧹 TEST DATA CLEANUP SCRIPT');
console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (no changes)' : '⚠️  DELETE MODE (will remove data)'}\n`);

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;
    
    if (!mongoUri) {
      throw new Error('MongoDB URI not found in environment variables');
    }

    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

const LocationSchema = new mongoose.Schema({}, { strict: false });
const MachineSchema = new mongoose.Schema({}, { strict: false });

const Location = mongoose.model('GamingLocation', LocationSchema, 'gaminglocations');
const Machine = mongoose.model('Machine', MachineSchema, 'machines');

const cleanupTestData = async () => {
  try {
    await connectDB();
    
    // Find test locations (names starting with "Test-")
    const testLocations = await Location.find({ name: /^Test-/ }).lean();
    console.log(`🔍 Found ${testLocations.length} test locations`);
    
    if (testLocations.length === 0) {
      console.log('✅ No test data found to clean up');
      return;
    }
    
    // Get location IDs
    const locationIds = testLocations.map(l => l._id.toString());
    
    // Find machines in test locations
    const testMachines = await Machine.find({ 
      gamingLocation: { $in: locationIds } 
    }).lean();
    
    console.log(`🔍 Found ${testMachines.length} test machines`);
    
    if (!isDryRun) {
      console.log('\n⚠️  DELETING TEST DATA...');
      
      // Delete machines first
      const machineResult = await Machine.deleteMany({ 
        gamingLocation: { $in: locationIds } 
      });
      console.log(`   ✅ Deleted ${machineResult.deletedCount} machines`);
      
      // Delete locations
      const locationResult = await Location.deleteMany({ name: /^Test-/ });
      console.log(`   ✅ Deleted ${locationResult.deletedCount} locations`);
      
      console.log('\n✅ Cleanup complete!');
    } else {
      console.log('\n🔍 DRY RUN - Would delete:');
      console.log(`   - ${testMachines.length} machines`);
      console.log(`   - ${testLocations.length} locations`);
      console.log('\n💡 Run without --dry-run flag to actually delete data');
    }
    
    // Show sample of what would be deleted
    console.log('\n📋 Sample test locations:');
    testLocations.slice(0, 10).forEach(l => {
      console.log(`   - ${l.name} (Licensee: ${l.rel?.licencee || 'Unknown'})`);
    });
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB\n');
  }
};

if (require.main === module) {
  cleanupTestData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupTestData };

