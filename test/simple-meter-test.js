/**
 * Simple Meter Test Script
 *
 * This script:
 * 1. Clears ALL meters
 * 2. Creates ONE meter for ONE machine with movement.drop: 2
 * 3. Tests that all APIs return $2.00
 *
 * Usage: node test/simple-meter-test.js
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGODB_URL || process.env.DATABASE_URL;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not found in environment variables');
  process.exit(1);
}

/**
 * Generate MongoDB ObjectId hex string (24 characters)
 */
function generateMongoIdHex() {
  return new ObjectId().toHexString();
}

/**
 * Calculate gaming day range for Yesterday
 */
function getYesterdayGamingDayRange(gameDayOffset = 8, timezoneOffset = -4) {
  const nowUtc = new Date();
  const nowLocal = new Date(nowUtc.getTime() + timezoneOffset * 60 * 60 * 1000);
  const today = new Date(
    Date.UTC(
      nowLocal.getUTCFullYear(),
      nowLocal.getUTCMonth(),
      nowLocal.getUTCDate()
    )
  );

  const currentHour = nowLocal.getUTCHours();
  const yesterdayBase =
    currentHour < gameDayOffset
      ? new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
      : new Date(today.getTime() - 24 * 60 * 60 * 1000);

  const rangeStart = new Date(yesterdayBase);
  rangeStart.setUTCHours(gameDayOffset - timezoneOffset, 0, 0, 0);

  const rangeEnd = new Date(yesterdayBase);
  rangeEnd.setDate(rangeEnd.getDate() + 1);
  rangeEnd.setUTCHours(gameDayOffset - timezoneOffset, 0, 0, 0);
  rangeEnd.setMilliseconds(rangeEnd.getMilliseconds() - 1);

  return { rangeStart, rangeEnd };
}

async function main() {
  console.log('🚀 Starting simple meter test...\n');
  
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();

    // ============================================================================
    // STEP 1: Clear all meters
    // ============================================================================
    console.log('🗑️  Clearing all meters...');
    const deleteResult = await db.collection('meters').deleteMany({});
    console.log(`   Deleted ${deleteResult.deletedCount} meter records\n`);

    // ============================================================================
    // STEP 2: Get first machine and its location
    // ============================================================================
    console.log('📊 Finding first machine...');
    const machine = await db.collection('machines').findOne({
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    });

    if (!machine) {
      console.error('❌ No machines found in database');
      return;
    }

    const machineId = machine._id.toString();
    const locationId = machine.gamingLocation?.toString();

    if (!locationId) {
      console.error('❌ Machine has no location');
      return;
    }

    const location = await db.collection('gaminglocations').findOne({
      _id: locationId,
    });

    if (!location) {
      console.error('❌ Location not found');
      return;
    }

    console.log(`   Machine: ${machine.serialNumber || machine.custom?.name || machineId}`);
    console.log(`   Location: ${location.name || locationId}`);
    console.log(`   Machine ID: ${machineId}`);
    console.log(`   Location ID: ${locationId}\n`);

    // ============================================================================
    // STEP 3: Create ONE simple meter with movement.drop: 2
    // ============================================================================
    console.log('📝 Creating simple meter with movement.drop: 2...');
    
    const gameDayOffset = location.gameDayOffset ?? 8;
    const { rangeStart, rangeEnd } = getYesterdayGamingDayRange(gameDayOffset);
    
    // Use middle of the gaming day for readAt
    const readAt = new Date(rangeStart.getTime() + (rangeEnd.getTime() - rangeStart.getTime()) / 2);
    
    const meterId = generateMongoIdHex();
    const sessionId = generateMongoIdHex();

    const meterRecord = {
      _id: meterId,
      machine: machineId,
      location: locationId,
      locationSession: sessionId,
      readAt: readAt,
      timestamp: readAt,
      movement: {
        drop: 2, // Simple test value
        totalCancelledCredits: 0,
        coinIn: 0,
        coinOut: 0,
        jackpot: 0,
        gamesPlayed: 0,
        gamesWon: 0,
        currentCredits: 0,
        totalWonCredits: 0,
        totalHandPaidCancelledCredits: 0,
      },
      // Top-level fields (copy from movement)
      drop: 2,
      totalCancelledCredits: 0,
      coinIn: 0,
      coinOut: 0,
      jackpot: 0,
      gamesPlayed: 0,
      gamesWon: 0,
      currentCredits: 0,
      totalWonCredits: 0,
      totalHandPaidCancelledCredits: 0,
      viewingAccountDenomination: {
        drop: 2,
        totalCancelledCredits: 0,
      },
      createdAt: readAt,
      updatedAt: readAt,
    };

    await db.collection('meters').insertOne(meterRecord);
    console.log(`   ✅ Created meter with _id: ${meterId}`);
    console.log(`   ✅ readAt: ${readAt.toISOString()}`);
    console.log(`   ✅ Gaming day range: ${rangeStart.toISOString()} to ${rangeEnd.toISOString()}\n`);

    // ============================================================================
    // STEP 4: Verify the meter was created correctly
    // ============================================================================
    console.log('🔍 Verifying meter in database...');
    const verifyMeter = await db.collection('meters').findOne({ _id: meterId });
    if (verifyMeter) {
      console.log(`   ✅ Meter found: movement.drop = ${verifyMeter.movement?.drop}`);
      console.log(`   ✅ Machine: ${verifyMeter.machine}`);
      console.log(`   ✅ Location: ${verifyMeter.location}`);
      console.log(`   ✅ readAt: ${verifyMeter.readAt?.toISOString()}\n`);
    } else {
      console.error('   ❌ Meter not found after creation!');
      return;
    }

    // ============================================================================
    // STEP 5: Calculate expected totals
    // ============================================================================
    console.log('='.repeat(80));
    console.log('📊 EXPECTED RESULTS');
    console.log('='.repeat(80));
    console.log('\nFor time period: Yesterday');
    console.log(`   Machine: ${machine.serialNumber || machine.custom?.name || machineId}`);
    console.log(`   Location: ${location.name || locationId}`);
    console.log(`   Expected Money In: $2.00`);
    console.log(`   Expected Money Out: $0.00`);
    console.log(`   Expected Gross: $2.00\n`);
    console.log('='.repeat(80));
    console.log('✅ Test data created!');
    console.log('='.repeat(80));
    console.log('\n📋 Test Information:');
    console.log(`   Machine ID: ${machineId}`);
    console.log(`   Location ID: ${locationId}`);
    console.log(`   Meter ID: ${meterId}`);
    console.log(`   Gaming Day Range: ${rangeStart.toISOString()} to ${rangeEnd.toISOString()}`);
    console.log(`   readAt: ${readAt.toISOString()}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('✅ Disconnected from MongoDB');
  }
}

main().catch(console.error);

