/**
 * Test password verification for a user
 * Usage: node test/test-password.js aaronsploit@gmail.com Decrypted12!
 */

require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env');
  process.exit(1);
}

const emailToCheck = process.argv[2] || 'aaronsploit@gmail.com';
const passwordToTest = process.argv[3] || 'Decrypted12!';

async function testPassword() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const UserModel = mongoose.model(
      'User',
      new mongoose.Schema({}, { strict: false, collection: 'users' })
    );

    console.log(`🔍 Testing password for: ${emailToCheck}`);
    console.log(`🔑 Password to test: ${passwordToTest}\n`);

    // Find user
    const user = await UserModel.findOne({
      emailAddress: { $regex: new RegExp(`^${emailToCheck}$`, 'i') },
    });

    if (!user) {
      console.log('❌ User NOT FOUND');
      await mongoose.disconnect();
      return;
    }

    console.log('✅ User found:');
    console.log('   Username:', user.username);
    console.log('   Email:', user.emailAddress);
    console.log('   Enabled:', user.isEnabled);
    console.log('   Has Password:', !!user.password);
    console.log('   Password Hash Length:', user.password?.length || 0);
    console.log('');

    if (!user.password) {
      console.log('❌ User has NO PASSWORD set');
      await mongoose.disconnect();
      return;
    }

    // Test password
    console.log('🔐 Testing password...');
    const isMatch = await bcrypt.compare(passwordToTest, user.password);

    if (isMatch) {
      console.log('✅ PASSWORD MATCHES!');
      console.log('   The password is correct.');
    } else {
      console.log('❌ PASSWORD DOES NOT MATCH');
      console.log(
        '   The password in the database does not match the provided password.'
      );
      console.log('   This could mean:');
      console.log('   1. The password was changed in the database');
      console.log('   2. The password in .env is incorrect');
      console.log('   3. The password hash is corrupted');
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testPassword();
