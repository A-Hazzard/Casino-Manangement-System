/**
 * Seed Test Meters Script
 *
 * This script:
 * 1. Deletes all existing meters from the database
 * 2. Creates test meter records for machine c0dca5afa53282e6a4ba15d0
 * 3. Generates data for different time periods (today, yesterday, 3d, 7d)
 * 4. Uses gaming day offset (8 AM Trinidad time = 12 PM UTC)
 *
 * Usage: node seed-test-meters.js
 */

const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

// MongoDB connection string - update with your actual connection string
const MONGODB_URI =
  'mongodb://sunny1:87ydaiuhdsia2e@147.182.133.136:27017/sas-dev?authSource=admin';

// Machine ID to create test data for
const MACHINE_ID = 'c0dca5afa53282e6a4ba15d0';

// Gaming day offset (8 AM Trinidad time)
const GAMING_DAY_OFFSET = 8;

/**
 * Calculate gaming day date range
 * Gaming day starts at 8 AM Trinidad time (12 PM UTC)
 */
function getGamingDayRange(daysAgo = 0) {
  const now = new Date();

  // Calculate the gaming day start (8 AM local = 12 PM UTC for Trinidad UTC-4)
  const gamingDayStart = new Date(now);
  gamingDayStart.setUTCHours(12, 0, 0, 0); // 8 AM Trinidad = 12 PM UTC

  // If current time is before 8 AM, we're still in yesterday's gaming day
  const currentHour = now.getUTCHours();
  if (currentHour < 12) {
    gamingDayStart.setUTCDate(gamingDayStart.getUTCDate() - 1);
  }

  // Go back the specified number of days
  gamingDayStart.setUTCDate(gamingDayStart.getUTCDate() - daysAgo);

  return gamingDayStart;
}

/**
 * Create a meter record with movement data
 */
function createMeterRecord(machineId, readAt, movementData) {
  return {
    machine: machineId,
    readAt: readAt,
    movement: {
      coinIn: movementData.coinIn || 0,
      coinOut: movementData.coinOut || 0,
      drop: movementData.drop || 0,
      totalCancelledCredits: movementData.totalCancelledCredits || 0,
      jackpot: movementData.jackpot || 0,
      gamesPlayed: movementData.gamesPlayed || 0,
      gamesWon: movementData.gamesWon || 0,
      handPaidCancelledCredits: movementData.handPaidCancelledCredits || 0,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

async function seedTestMeters() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const metersCollection = db.collection('meters');

    // Step 1: Delete all existing meters
    console.log('🗑️  Deleting all existing meters...');
    const deleteResult = await metersCollection.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} meter records`);

    // Step 2: Create test meters for different time periods
    const testMeters = [];

    // Today's data (multiple records for hourly breakdown)
    console.log('📊 Creating test data for TODAY...');
    const todayStart = getGamingDayRange(0);
    for (let hour = 0; hour < 5; hour++) {
      const readAt = new Date(todayStart);
      readAt.setUTCHours(readAt.getUTCHours() + hour);

      testMeters.push(
        createMeterRecord(MACHINE_ID, readAt, {
          coinIn: 10 + hour * 5,
          coinOut: 5 + hour * 2,
          drop: 50 + hour * 20, // GYD
          totalCancelledCredits: 40 + hour * 15,
          jackpot: 0,
          gamesPlayed: 10 + hour * 5,
          gamesWon: 3 + hour * 2,
        })
      );
    }
    console.log(`  ✅ Created ${testMeters.length} records for today`);

    // Yesterday's data
    console.log('📊 Creating test data for YESTERDAY...');
    const yesterdayStart = getGamingDayRange(1);
    for (let hour = 0; hour < 5; hour++) {
      const readAt = new Date(yesterdayStart);
      readAt.setUTCHours(readAt.getUTCHours() + hour);

      testMeters.push(
        createMeterRecord(MACHINE_ID, readAt, {
          coinIn: 15 + hour * 6,
          coinOut: 8 + hour * 3,
          drop: 75 + hour * 25,
          totalCancelledCredits: 60 + hour * 18,
          jackpot: 0,
          gamesPlayed: 15 + hour * 6,
          gamesWon: 5 + hour * 2,
        })
      );
    }
    console.log(`  ✅ Total records: ${testMeters.length}`);

    // 3 days ago
    console.log('📊 Creating test data for 3 DAYS AGO...');
    const threeDaysAgo = getGamingDayRange(3);
    for (let hour = 0; hour < 4; hour++) {
      const readAt = new Date(threeDaysAgo);
      readAt.setUTCHours(readAt.getUTCHours() + hour);

      testMeters.push(
        createMeterRecord(MACHINE_ID, readAt, {
          coinIn: 12 + hour * 4,
          coinOut: 6 + hour * 2,
          drop: 60 + hour * 18,
          totalCancelledCredits: 48 + hour * 12,
          jackpot: 0,
          gamesPlayed: 12 + hour * 4,
          gamesWon: 4 + hour,
        })
      );
    }
    console.log(`  ✅ Total records: ${testMeters.length}`);

    // 5 days ago (for 7d period)
    console.log('📊 Creating test data for 5 DAYS AGO...');
    const fiveDaysAgo = getGamingDayRange(5);
    for (let hour = 0; hour < 3; hour++) {
      const readAt = new Date(fiveDaysAgo);
      readAt.setUTCHours(readAt.getUTCHours() + hour);

      testMeters.push(
        createMeterRecord(MACHINE_ID, readAt, {
          coinIn: 8 + hour * 3,
          coinOut: 4 + hour,
          drop: 40 + hour * 15,
          totalCancelledCredits: 32 + hour * 10,
          jackpot: 0,
          gamesPlayed: 8 + hour * 3,
          gamesWon: 2 + hour,
        })
      );
    }
    console.log(`  ✅ Total records: ${testMeters.length}`);

    // 6 days ago (for 7d period)
    console.log('📊 Creating test data for 6 DAYS AGO...');
    const sixDaysAgo = getGamingDayRange(6);
    for (let hour = 0; hour < 3; hour++) {
      const readAt = new Date(sixDaysAgo);
      readAt.setUTCHours(readAt.getUTCHours() + hour);

      testMeters.push(
        createMeterRecord(MACHINE_ID, readAt, {
          coinIn: 10 + hour * 4,
          coinOut: 5 + hour * 2,
          drop: 50 + hour * 18,
          totalCancelledCredits: 40 + hour * 12,
          jackpot: 0,
          gamesPlayed: 10 + hour * 4,
          gamesWon: 3 + hour,
        })
      );
    }
    console.log(`  ✅ Total records: ${testMeters.length}`);

    // Insert all test meters
    console.log(`\n💾 Inserting ${testMeters.length} test meter records...`);
    const insertResult = await metersCollection.insertMany(testMeters);
    console.log(`✅ Inserted ${insertResult.insertedCount} meter records`);

    // Summary
    console.log('\n📊 Test Data Summary:');
    console.log(`   Machine ID: ${MACHINE_ID}`);
    console.log(`   Total Meters: ${testMeters.length}`);
    console.log(`   Today: ${todayStart.toISOString()}`);
    console.log(`   Yesterday: ${yesterdayStart.toISOString()}`);
    console.log(`   3 Days Ago: ${threeDaysAgo.toISOString()}`);
    console.log(`   5 Days Ago: ${fiveDaysAgo.toISOString()}`);
    console.log(`   6 Days Ago: ${sixDaysAgo.toISOString()}`);

    console.log('\n✅ Test data seeded successfully!');
    console.log('\n📌 Next steps:');
    console.log('   1. Open http://localhost:3000/');
    console.log('   2. Check machine GMID1 in Top Performing section');
    console.log(
      '   3. Open http://localhost:3000/cabinets/c0dca5afa53282e6a4ba15d0'
    );
    console.log('   4. Verify metrics show for different time periods');
  } catch (error) {
    console.error('❌ Error seeding test meters:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
seedTestMeters()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
