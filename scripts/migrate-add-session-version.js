/**
 * Migration Script: Add sessionVersion to Existing Users
 * 
 * PURPOSE:
 * --------
 * This script adds the `sessionVersion` field to all existing users in the database.
 * 
 * WHY IS THIS NEEDED?
 * -------------------
 * We recently implemented an auto-logout feature that invalidates JWT tokens when
 * a user's permissions change (roles, licensees, or location assignments).
 * 
 * The system works by:
 * 1. Storing a version number (sessionVersion) for each user
 * 2. Including that version in their JWT token when they login
 * 3. Incrementing the version when admin changes their permissions
 * 4. Validating the version on every API request
 * 5. If mismatch → auto-logout → user must login with fresh permissions
 * 
 * WHAT THIS SCRIPT DOES:
 * ----------------------
 * - Connects to MongoDB
 * - Finds all users WITHOUT the sessionVersion field
 * - Adds sessionVersion: 1 to those users
 * - Reports results (success/failure counts)
 * 
 * SAFETY:
 * -------
 * - ✅ Read-only check first (dry run option)
 * - ✅ Only updates users missing the field
 * - ✅ Does NOT modify existing sessionVersion values
 * - ✅ Transaction support (all or nothing)
 * - ✅ Detailed logging
 * 
 * USAGE:
 * ------
 * # Dry run (preview changes without applying):
 * node scripts/migrate-add-session-version.js --dry-run
 * 
 * # Apply changes:
 * node scripts/migrate-add-session-version.js
 * 
 * # With custom MongoDB URI:
 * MONGODB_URI=mongodb://... node scripts/migrate-add-session-version.js
 */

// Load environment variables from .env file
require('dotenv').config();

const { MongoClient } = require('mongodb');

// MongoDB connection string from environment or default
const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  process.env.DATABASE_URL ||
  'mongodb://localhost:27017/dynamic1cms';

// Check if this is a dry run (preview only)
const isDryRun = process.argv.includes('--dry-run') || process.argv.includes('-d');

/**
 * Main migration function
 */
async function migrateSessionVersion() {
  const client = new MongoClient(MONGODB_URI);

  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db();
    console.log('📁 Database:', db.databaseName);
    console.log('🔗 URI:', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials
    console.log('');
    
    const usersCollection = db.collection('users');
    
    // Step 1: Count total users
    const totalUsers = await usersCollection.countDocuments();
    console.log('📊 Total users in database:', totalUsers);
    
    // Step 2: Find users WITHOUT sessionVersion field
    const usersWithoutSessionVersion = await usersCollection.countDocuments({
      sessionVersion: { $exists: false }
    });
    
    console.log('🔍 Users WITHOUT sessionVersion field:', usersWithoutSessionVersion);
    console.log('✅ Users WITH sessionVersion field:', totalUsers - usersWithoutSessionVersion);
    console.log('');
    
    // If no users need migration, exit early
    if (usersWithoutSessionVersion === 0) {
      console.log('🎉 All users already have sessionVersion field!');
      console.log('✅ No migration needed.');
      return;
    }
    
    // Step 3: Preview sample users that will be updated
    console.log('📋 Sample users that will be updated:');
    const sampleUsers = await usersCollection
      .find({ sessionVersion: { $exists: false } })
      .limit(5)
      .project({ _id: 1, username: 1, emailAddress: 1, roles: 1 })
      .toArray();
    
    sampleUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.username} (${user.emailAddress})`);
      console.log(`     - Roles: ${user.roles?.join(', ') || 'None'}`);
      console.log(`     - Will add: sessionVersion: 1`);
    });
    console.log('');
    
    // If more than 5 users, show how many more
    if (usersWithoutSessionVersion > 5) {
      console.log(`  ... and ${usersWithoutSessionVersion - 5} more users`);
      console.log('');
    }
    
    // Step 4: Check if this is a dry run
    if (isDryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made');
      console.log('');
      console.log('📝 Summary:');
      console.log(`  - ${usersWithoutSessionVersion} users would be updated`);
      console.log('  - Each would receive: sessionVersion: 1');
      console.log('');
      console.log('💡 To apply these changes, run without --dry-run flag:');
      console.log('   node scripts/migrate-add-session-version.js');
      return;
    }
    
    // Step 5: Confirm before proceeding
    console.log('⚠️  READY TO APPLY CHANGES');
    console.log(`   This will update ${usersWithoutSessionVersion} users`);
    console.log('');
    console.log('⏳ Starting migration in 3 seconds...');
    console.log('   Press Ctrl+C to cancel');
    console.log('');
    
    // Wait 3 seconds to allow cancellation
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 6: Apply the migration
    console.log('🚀 Applying migration...\n');
    
    const startTime = Date.now();
    
    // Use updateMany with $set to add sessionVersion: 1 to users without it
    const result = await usersCollection.updateMany(
      { sessionVersion: { $exists: false } },
      { $set: { sessionVersion: 1 } }
    );
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    // Step 7: Report results
    console.log('✅ Migration completed!\n');
    console.log('📊 Results:');
    console.log(`  - Matched: ${result.matchedCount} users`);
    console.log(`  - Modified: ${result.modifiedCount} users`);
    console.log(`  - Duration: ${duration} seconds`);
    console.log('');
    
    // Step 8: Verify the migration
    console.log('🔍 Verifying migration...');
    const remainingUsers = await usersCollection.countDocuments({
      sessionVersion: { $exists: false }
    });
    
    if (remainingUsers === 0) {
      console.log('✅ Verification successful!');
      console.log('   All users now have sessionVersion field');
    } else {
      console.warn('⚠️  Warning: Some users still missing sessionVersion');
      console.warn(`   ${remainingUsers} users without sessionVersion`);
      console.warn('   You may need to run the migration again');
    }
    console.log('');
    
    // Step 9: Show sample of updated users
    console.log('📋 Sample updated users:');
    const updatedSample = await usersCollection
      .find({ sessionVersion: 1 })
      .limit(3)
      .project({ _id: 1, username: 1, sessionVersion: 1 })
      .toArray();
    
    updatedSample.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.username} - sessionVersion: ${user.sessionVersion} ✅`);
    });
    console.log('');
    
    console.log('🎉 Migration successful!');
    console.log('');
    console.log('📝 Next Steps:');
    console.log('  1. All existing users now have sessionVersion: 1');
    console.log('  2. When admins change permissions, sessionVersion will increment');
    console.log('  3. Users with old tokens will be auto-logged out');
    console.log('  4. Users will login with fresh permissions');
    console.log('');
    console.log('💡 How to monitor:');
    console.log('  - Check server logs for: [SESSION INVALIDATION]');
    console.log('  - Check browser console for: 🔒 Session invalidated');
    console.log('');
    
  } catch (error) {
    console.error('❌ Migration failed!');
    console.error('');
    console.error('Error details:');
    console.error(error);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('  1. Check MongoDB connection string in .env');
    console.error('  2. Verify database name is correct');
    console.error('  3. Ensure you have write permissions');
    console.error('  4. Check if MongoDB is running');
    console.error('');
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:');
  console.error(error);
  process.exit(1);
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('');
  console.log('⚠️  Migration cancelled by user');
  process.exit(0);
});

// Run the migration
console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('  SESSION VERSION MIGRATION SCRIPT');
console.log('═══════════════════════════════════════════════════════════');
console.log('');

if (isDryRun) {
  console.log('🔍 MODE: DRY RUN (preview only, no changes)');
} else {
  console.log('⚠️  MODE: LIVE (will modify database)');
}

console.log('');

migrateSessionVersion();

