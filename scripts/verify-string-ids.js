/**
 * Verify IDs are Plain Strings (not ObjectId)
 */

require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

const verifyStringIds = async () => {
  try {
    await connectDB();
    
    // Query raw MongoDB collection (bypass Mongoose)
    const db = mongoose.connection.db;
    
    console.log('🔍 Checking testuser _id type...');
    const testUser = await db.collection('users').findOne({ username: 'testuser' });
    if (testUser) {
      console.log(`   _id value: ${testUser._id}`);
      console.log(`   _id type: ${typeof testUser._id}`);
      console.log(`   Is ObjectId?: ${testUser._id instanceof mongoose.Types.ObjectId}`);
      console.log(`   _id constructor: ${testUser._id.constructor.name}`);
    }
    
    console.log('\n🔍 Checking Test location _id type...');
    const testLocation = await db.collection('gaminglocations').findOne({ name: /^Test-/ });
    if (testLocation) {
      console.log(`   name: ${testLocation.name}`);
      console.log(`   _id value: ${testLocation._id}`);
      console.log(`   _id type: ${typeof testLocation._id}`);
      console.log(`   Is ObjectId?: ${testLocation._id instanceof mongoose.Types.ObjectId}`);
      console.log(`   _id constructor: ${testLocation._id.constructor.name}`);
    }
    
    console.log('\n🔍 Checking Test machine _id type...');
    const testMachine = await db.collection('machines').findOne({ serialNumber: /^TEST-/ });
    if (testMachine) {
      console.log(`   serialNumber: ${testMachine.serialNumber}`);
      console.log(`   _id value: ${testMachine._id}`);
      console.log(`   _id type: ${typeof testMachine._id}`);
      console.log(`   Is ObjectId?: ${testMachine._id instanceof mongoose.Types.ObjectId}`);
      console.log(`   _id constructor: ${testMachine._id.constructor.name}`);
    }
    
    console.log('\n' + '='.repeat(60));
    if (testUser._id instanceof mongoose.Types.ObjectId ||
        testLocation._id instanceof mongoose.Types.ObjectId ||
        testMachine._id instanceof mongoose.Types.ObjectId) {
      console.log('\n❌ STILL USING ObjectId! Need to fix the scripts.');
    } else {
      console.log('\n✅ SUCCESS! All _id fields are plain strings!');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected\n');
  }
};

verifyStringIds();

