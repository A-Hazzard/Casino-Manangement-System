/**
 * Verify and Delete ALL Documents with ObjectId Format
 * Finds all test data and any documents created with ObjectId _id format
 */

require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;
    if (!mongoUri) throw new Error('MongoDB URI not found');
    
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

const verifyAndDelete = async () => {
  try {
    await connectDB();
    
    console.log('🔍 SEARCHING FOR ALL TEST DATA & OBJECTID DOCUMENTS...\n');
    
    // 1. Find ALL users with username 'testuser' (any format)
    console.log('👤 Searching for testuser...');
    const allTestUsers = await User.find({ username: 'testuser' }).lean();
    console.log(`   Found: ${allTestUsers.length} testuser(s)`);
    if (allTestUsers.length > 0) {
      allTestUsers.forEach(u => {
        const idType = typeof u._id === 'object' ? 'ObjectId' : 'String';
        console.log(`   - ID: ${JSON.stringify(u._id)} (Type: ${idType})`);
      });
      
      const deleteResult = await User.deleteMany({ username: 'testuser' });
      console.log(`   ✅ DELETED ${deleteResult.deletedCount} testuser(s)\n`);
    } else {
      console.log('   ✅ No testuser found\n');
    }
    
    // 2. Find ALL Test-* locations (any ID format)
    console.log('📍 Searching for Test-* locations...');
    const allTestLocations = await Location.find({ name: /^Test-/ }).lean();
    console.log(`   Found: ${allTestLocations.length} test location(s)`);
    if (allTestLocations.length > 0) {
      allTestLocations.forEach(loc => {
        const idType = typeof loc._id === 'object' ? 'ObjectId' : 'String';
        console.log(`   - ${loc.name} | ID: ${JSON.stringify(loc._id)} (Type: ${idType})`);
      });
      
      const locationIds = allTestLocations.map(l => l._id);
      
      // 3. Find ALL test machines (by serialNumber pattern, not just by location)
      console.log('\n🎰 Searching for ALL test machines...');
      const allTestMachines = await Machine.find({
        $or: [
          { gamingLocation: { $in: locationIds } },
          { serialNumber: /^TEST-/ }
        ]
      }).lean();
      console.log(`   Found: ${allTestMachines.length} machine(s)`);
      if (allTestMachines.length > 0) {
        console.log(`   First 5 machines:`);
        allTestMachines.slice(0, 5).forEach(m => {
          const idType = typeof m._id === 'object' ? 'ObjectId' : 'String';
          console.log(`   - ${m.serialNumber || m._id} (Type: ${idType})`);
        });
        
        const machineIds = allTestMachines.map(m => m._id);
        
        // 4. Find meters for those machines
        console.log('\n📊 Searching for meters...');
        const allTestMeters = await Meter.find({
          machine: { $in: machineIds }
        }).lean();
        console.log(`   Found: ${allTestMeters.length} meter(s)`);
        if (allTestMeters.length > 0) {
          const deleteMetersResult = await Meter.deleteMany({
            machine: { $in: machineIds }
          });
          console.log(`   ✅ DELETED ${deleteMetersResult.deletedCount} meter(s)`);
        }
        
        // Delete ALL test machines
        const deleteMachinesResult = await Machine.deleteMany({
          $or: [
            { gamingLocation: { $in: locationIds } },
            { serialNumber: /^TEST-/ }
          ]
        });
        console.log(`   ✅ DELETED ${deleteMachinesResult.deletedCount} machine(s)`);
      }
      
      // Delete locations
      const deleteLocationsResult = await Location.deleteMany({ name: /^Test-/ });
      console.log(`   ✅ DELETED ${deleteLocationsResult.deletedCount} location(s)\n`);
    } else {
      console.log('   ✅ No test locations found\n');
    }
    
    console.log('═'.repeat(60));
    console.log('\n✅ CLEANUP COMPLETE!\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB\n');
  }
};

if (require.main === module) {
  verifyAndDelete()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { verifyAndDelete };

