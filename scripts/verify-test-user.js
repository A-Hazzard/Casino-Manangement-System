/**
 * Verify Test User Exists
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
    console.log(`   URI: ${mongoUri.substring(0, 30)}...`);
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', UserSchema, 'users');

const verifyTestUser = async () => {
  try {
    await connectDB();
    
    // Find by username
    const userByUsername = await User.findOne({ username: 'testuser' }).lean();
    console.log('🔍 Search by username "testuser":');
    if (userByUsername) {
      console.log('✅ User FOUND!');
      console.log(`   _id: ${userByUsername._id}`);
      console.log(`   username: ${userByUsername.username}`);
      console.log(`   emailAddress: ${userByUsername.emailAddress}`);
      console.log(`   roles: ${JSON.stringify(userByUsername.roles)}`);
      console.log(`   isEnabled: ${userByUsername.isEnabled}`);
      console.log(`   rel.licencee: ${JSON.stringify(userByUsername.rel?.licencee)}`);
      console.log(`   sessionVersion: ${userByUsername.sessionVersion}`);
      console.log(`   loginCount: ${userByUsername.loginCount}`);
      console.log(`   lastLoginAt: ${userByUsername.lastLoginAt}`);
      console.log(`   resourcePermissions: ${JSON.stringify(userByUsername.resourcePermissions, null, 2)}`);
    } else {
      console.log('❌ User NOT FOUND by username');
    }
    
    console.log('\n🔍 Search by ID "690fea8e22ad0f5c17462186":');
    const userById = await User.findById('690fea8e22ad0f5c17462186').lean();
    if (userById) {
      console.log('✅ User FOUND by ID!');
      console.log(`   username: ${userById.username}`);
    } else {
      console.log('❌ User NOT FOUND by ID');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB\n');
  }
};

if (require.main === module) {
  verifyTestUser()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { verifyTestUser };

