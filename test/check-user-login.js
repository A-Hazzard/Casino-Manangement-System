/**
 * Debug script to check user login status
 * Usage: node test/check-user-login.js aaronsploit@gmail.com
 */

require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env');
  process.exit(1);
}

const emailToCheck = process.argv[2] || 'aaronsploit@gmail.com';

async function checkUser() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const UserModel = mongoose.model(
      'User',
      new mongoose.Schema({}, { strict: false, collection: 'users' })
    );

    console.log(`🔍 Checking user: ${emailToCheck}\n`);

    // Try case-insensitive email lookup (matching the code)
    const user = await UserModel.findOne({
      emailAddress: { $regex: new RegExp(`^${emailToCheck}$`, 'i') },
    });

    if (!user) {
      console.log('❌ User NOT FOUND in database');
      console.log('\n📋 Trying username lookup...');
      const userByUsername = await UserModel.findOne({
        username: { $regex: new RegExp(`^${emailToCheck}$`, 'i') },
      });
      if (userByUsername) {
        console.log('✅ Found user by username:');
        console.log('   Username:', userByUsername.username);
        console.log('   Email:', userByUsername.emailAddress);
        console.log('   Enabled:', userByUsername.isEnabled);
        console.log('   Roles:', userByUsername.roles);
      } else {
        console.log('❌ User NOT FOUND by username either');
        console.log('\n🔍 Searching for similar emails...');
        const similarUsers = await UserModel.find({
          emailAddress: { $regex: /aaronsploit/i },
        }).limit(5);
        if (similarUsers.length > 0) {
          console.log(`\n📋 Found ${similarUsers.length} similar user(s):`);
          similarUsers.forEach(u => {
            console.log(
              `   - ${u.emailAddress} (username: ${u.username}, enabled: ${u.isEnabled})`
            );
          });
        } else {
          console.log('❌ No similar users found');
        }
      }
    } else {
      console.log('✅ User FOUND in database:');
      console.log('   _id:', user._id);
      console.log('   Username:', user.username);
      console.log('   Email:', user.emailAddress);
      console.log('   Enabled:', user.isEnabled);
      console.log('   Roles:', user.roles);
      console.log('   Has Password:', !!user.password);
      console.log('   Deleted At:', user.deletedAt);
      console.log('   Session Version:', user.sessionVersion);
      console.log(
        '   Assigned Locations:',
        user.assignedLocations?.length || 0
      );
      console.log(
        '   Assigned Licensees:',
        user.assignedLicensees?.length || 0
      );

      if (!user.isEnabled) {
        console.log('\n⚠️  WARNING: User account is DISABLED');
      }
      if (user.deletedAt && new Date(user.deletedAt) > new Date('2020-01-01')) {
        console.log('\n⚠️  WARNING: User account is DELETED');
      }
      if (!user.password) {
        console.log('\n⚠️  WARNING: User has NO PASSWORD set');
      }
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkUser();
