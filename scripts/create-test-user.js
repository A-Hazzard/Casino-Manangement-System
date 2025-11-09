/**
 * Create Test User Script
 * Creates a test user with specific permissions for testing
 * 
 * Run with: node scripts/create-test-user.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Generate proper MongoDB hex string ID (24 characters)
const generateMongoId = () => {
  return new mongoose.Types.ObjectId().toHexString();
};

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

const LicenseeSchema = new mongoose.Schema({}, { strict: false });
const Licensee = mongoose.model('Licensee', LicenseeSchema, 'licencees');

const createTestUser = async () => {
  try {
    await connectDB();
    
    // Get licensees
    const licensees = await Licensee.find({
      $or: [
        { deletedAt: null },
        { deletedAt: new Date(-1) },
        { deletedAt: { $exists: false } }
      ]
    }).lean();
    
    console.log(`📋 Found ${licensees.length} licensees`);
    
    // Get test locations for Cabana licensee
    const cabanaLicensee = licensees.find(l => l.name === 'Cabana');
    
    if (!cabanaLicensee) {
      console.error('❌ Cabana licensee not found');
      process.exit(1);
    }
    
    const cabanaId = cabanaLicensee._id.toString();
    console.log(`🏢 Cabana licensee ID: ${cabanaId}`);
    
    // Find Cabana test locations
    const cabanaLocations = await Location.find({ 
      'rel.licencee': cabanaId,
      name: /^Test-Cabana/
    }).lean();
    
    console.log(`📍 Found ${cabanaLocations.length} Cabana test locations`);
    
    if (cabanaLocations.length === 0) {
      console.error('❌ No Cabana test locations found. Run test-data:generate first');
      process.exit(1);
    }
    
    // Select 2 random locations
    const selectedLocations = cabanaLocations.slice(0, 2).map(l => l._id.toString());
    console.log(`📍 Selected locations for test user:`);
    cabanaLocations.slice(0, 2).forEach(l => console.log(`   - ${l.name} (${l._id})`));
    
    // Check if user already exists
    const existingUser = await User.findOne({ username: 'testuser' });
    
    if (existingUser) {
      console.log('\n⚠️  User "testuser" already exists. Deleting...');
      await User.deleteOne({ username: 'testuser' });
    }
    
    // Hash password
    const password = 'TestUser123!';
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Generate proper hex string ID
    const userId = generateMongoId();
    console.log(`\n🆔 Generated user ID: ${userId}`);
    
    // Create user
    const newUser = {
      _id: userId,
      username: 'testuser',
      emailAddress: 'testuser@test.com',
      password: hashedPassword,
      isEnabled: true,
      roles: ['location admin'], // Location Admin role for testing
      profile: {
        firstName: 'Test',
        lastName: 'User',
        gender: 'male',
        address: {
          street: '',
          town: '',
          region: '',
          country: '',
          postalCode: ''
        },
        identification: {
          dateOfBirth: '',
          idType: '',
          idNumber: '',
          notes: ''
        }
      },
      rel: {
        licencee: [cabanaId] // Assign to Cabana
      },
      resourcePermissions: {
        'gaming-locations': {
          entity: 'gaming-locations',
          resources: selectedLocations // Assign 2 Cabana locations
        }
      },
      sessionVersion: 1,
      loginCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Use insertOne with explicit _id to ensure String type
    const result = await User.collection.insertOne(newUser);
    const user = { _id: result.insertedId, ...newUser };
    
    console.log('\n✅ Test user created successfully!');
    console.log('\n📋 User Details:');
    console.log(`   Username: testuser`);
    console.log(`   Password: ${password}`);
    console.log(`   Email: testuser@test.com`);
    console.log(`   Role: Location Admin`);
    console.log(`   Licensee: Cabana`);
    console.log(`   Locations: ${cabanaLocations.slice(0, 2).map(l => l.name).join(', ')}`);
    console.log(`   Session Version: v1`);
    console.log(`   User ID: ${user._id}`);
    
    console.log('\n🎉 You can now login with:');
    console.log(`   Username: testuser`);
    console.log(`   Password: ${password}`);
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB\n');
  }
};

if (require.main === module) {
  createTestUser()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createTestUser };

