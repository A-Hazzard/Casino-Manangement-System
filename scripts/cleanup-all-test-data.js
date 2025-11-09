/**
 * Cleanup ALL Test Data Script
 * Deletes the testuser and all Test-* locations and machines
 * 
 * Run with: node scripts/cleanup-all-test-data.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

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

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', UserSchema, 'users');

const LocationSchema = new mongoose.Schema({}, { strict: false });
const Location = mongoose.model('GamingLocation', LocationSchema, 'gaminglocations');

const MachineSchema = new mongoose.Schema({}, { strict: false });
const Machine = mongoose.model('Machine', MachineSchema, 'machines');

const MeterSchema = new mongoose.Schema({}, { strict: false });
const Meter = mongoose.model('Meter', MeterSchema, 'meters');

const cleanupAllTestData = async (dryRun = false) => {
  try {
    await connectDB();
    
    console.log('🔍 Finding test data to clean up...\n');
    
    // 1. Find testuser
    const testUser = await User.findOne({ username: 'testuser' });
    if (testUser) {
      console.log(`👤 Found testuser: ${testUser._id}`);
      if (!dryRun) {
        await User.deleteOne({ username: 'testuser' });
        console.log('   ✅ Deleted testuser');
      } else {
        console.log('   🔸 Would delete testuser (dry run)');
      }
    } else {
      console.log('👤 No testuser found');
    }
    
    // 2. Find Test-* locations
    const testLocations = await Location.find({
      name: /^Test-/
    }).lean();
    
    console.log(`\n📍 Found ${testLocations.length} test locations`);
    if (testLocations.length > 0) {
      testLocations.forEach(loc => {
        console.log(`   - ${loc.name} (${loc._id})`);
      });
      
      if (!dryRun) {
        const deleteLocationsResult = await Location.deleteMany({
          name: /^Test-/
        });
        console.log(`   ✅ Deleted ${deleteLocationsResult.deletedCount} locations`);
      } else {
        console.log(`   🔸 Would delete ${testLocations.length} locations (dry run)`);
      }
    }
    
    // 3. Find machines in test locations
    const testLocationIds = testLocations.map(l => l._id);
    if (testLocationIds.length > 0) {
      const testMachines = await Machine.find({
        gamingLocation: { $in: testLocationIds }
      }).lean();
      
      console.log(`\n🎰 Found ${testMachines.length} machines in test locations`);
      if (testMachines.length > 0) {
        if (!dryRun) {
          const deleteMachinesResult = await Machine.deleteMany({
            gamingLocation: { $in: testLocationIds }
          });
          console.log(`   ✅ Deleted ${deleteMachinesResult.deletedCount} machines`);
        } else {
          console.log(`   🔸 Would delete ${testMachines.length} machines (dry run)`);
        }
        
        // 4. Find meters for test machines
        const testMachineIds = testMachines.map(m => m._id);
        const testMeters = await Meter.find({
          machine: { $in: testMachineIds }
        }).lean();
        
        console.log(`\n📊 Found ${testMeters.length} meters for test machines`);
        if (testMeters.length > 0) {
          if (!dryRun) {
            const deleteMetersResult = await Meter.deleteMany({
              machine: { $in: testMachineIds }
            });
            console.log(`   ✅ Deleted ${deleteMetersResult.deletedCount} meters`);
          } else {
            console.log(`   🔸 Would delete ${testMeters.length} meters (dry run)`);
          }
        }
      }
    }
    
    console.log('\n✅ Cleanup complete!');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB\n');
  }
};

if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  
  if (dryRun) {
    console.log('🔸 DRY RUN MODE - No changes will be made\n');
  }
  
  cleanupAllTestData(dryRun)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupAllTestData };

