/**
 * Clear and Regenerate All Meters Script
 *
 * This script:
 * 1. Clears ALL meters from the database
 * 2. Regenerates meters for all machines for all time periods
 * 3. Uses proper MongoDB ObjectId hex string format for _id
 * 4. Reports expected totals for each time period
 *
 * Usage: node test/clear-and-regenerate-meters.js
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGODB_URL || process.env.DATABASE_URL;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not found in environment variables');
  console.error('   Checked: MONGO_URI, MONGODB_URI, MONGODB_URL, DATABASE_URL');
  process.exit(1);
}

/**
 * Generate MongoDB ObjectId hex string (24 characters)
 */
function generateMongoIdHex() {
  return new ObjectId().toHexString();
}

/**
 * Calculate gaming day range for a period
 */
function getGamingDayRangeForPeriod(
  timePeriod,
  gameDayOffset = 8,
  timezoneOffset = -4
) {
  const nowUtc = new Date();
  const nowLocal = new Date(nowUtc.getTime() + timezoneOffset * 60 * 60 * 1000);

  const today = new Date(
    Date.UTC(
      nowLocal.getUTCFullYear(),
      nowLocal.getUTCMonth(),
      nowLocal.getUTCDate()
    )
  );

  switch (timePeriod) {
    case 'Today': {
      const currentHour = nowLocal.getUTCHours();
      const todayOrYesterday =
        currentHour < gameDayOffset
          ? new Date(today.getTime() - 24 * 60 * 60 * 1000)
          : today;

      const rangeStart = new Date(todayOrYesterday);
      rangeStart.setUTCHours(gameDayOffset - timezoneOffset, 0, 0, 0);

      const rangeEnd = new Date(todayOrYesterday);
      rangeEnd.setDate(rangeEnd.getDate() + 1);
      rangeEnd.setUTCHours(gameDayOffset - timezoneOffset, 0, 0, 0);
      rangeEnd.setMilliseconds(rangeEnd.getMilliseconds() - 1);

      return { rangeStart, rangeEnd };
    }

    case 'Yesterday': {
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

    case '7d':
    case 'last7days': {
      const currentHour = nowLocal.getUTCHours();
      const today7d =
        currentHour < gameDayOffset
          ? new Date(today.getTime() - 24 * 60 * 60 * 1000)
          : today;
      
      const sevenDaysAgo = new Date(today7d);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // -6 because today is day 1

      const rangeStart = new Date(sevenDaysAgo);
      rangeStart.setUTCHours(gameDayOffset - timezoneOffset, 0, 0, 0);

      const rangeEnd = new Date(today7d);
      rangeEnd.setDate(rangeEnd.getDate() + 1);
      rangeEnd.setUTCHours(gameDayOffset - timezoneOffset, 0, 0, 0);
      rangeEnd.setMilliseconds(rangeEnd.getMilliseconds() - 1);

      return { rangeStart, rangeEnd };
    }

    case '30d':
    case 'last30days': {
      const currentHour = nowLocal.getUTCHours();
      const today30d =
        currentHour < gameDayOffset
          ? new Date(today.getTime() - 24 * 60 * 60 * 1000)
          : today;
      
      const thirtyDaysAgo = new Date(today30d);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29); // -29 because today is day 1

      const rangeStart = new Date(thirtyDaysAgo);
      rangeStart.setUTCHours(gameDayOffset - timezoneOffset, 0, 0, 0);

      const rangeEnd = new Date(today30d);
      rangeEnd.setDate(rangeEnd.getDate() + 1);
      rangeEnd.setUTCHours(gameDayOffset - timezoneOffset, 0, 0, 0);
      rangeEnd.setMilliseconds(rangeEnd.getMilliseconds() - 1);

      return { rangeStart, rangeEnd };
    }

    default:
      throw new Error(`Unsupported time period: ${timePeriod}`);
  }
}

/**
 * Generate consistent meter values based on machine and time period
 * This ensures the same machine always has the same values for the same time period
 */
function generateMeterValues(machineId, timePeriod, dayOffset = 0) {
  // Use machine ID and time period to generate consistent values
  const hash = machineId.toString().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const periodHash = timePeriod.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const seed = (hash + periodHash + dayOffset) % 1000;

  // Generate values based on seed for consistency
  const baseMoneyIn = 100 + (seed % 20) * 25; // $100-$600
  const baseMoneyOut = baseMoneyIn * (0.65 + (seed % 10) * 0.03); // 65%-92% of money in

  // Add some variation but keep it consistent
  const moneyIn = baseMoneyIn + (seed % 50);
  const moneyOut = baseMoneyOut + (seed % 30);

  return {
    drop: Math.round(moneyIn * 100) / 100,
    totalCancelledCredits: Math.round(moneyOut * 100) / 100,
    coinIn: Math.round(moneyIn * 1.2 * 100) / 100,
    coinOut: Math.round(moneyOut * 1.1 * 100) / 100,
    gamesPlayed: Math.floor(50 + (seed % 100)),
    gamesWon: Math.floor(20 + (seed % 30)),
    jackpot: Math.round((seed % 10) * 100) / 100,
    currentCredits: 0,
    totalWonCredits: Math.round(moneyOut * 1.1 * 100) / 100,
    totalHandPaidCancelledCredits: Math.round((moneyOut * 0.1) * 100) / 100,
  };
}

/**
 * Create meter records for a machine for a specific time period
 */
async function createMeterRecordsForPeriod(
  db,
  machine,
  location,
  timePeriod,
  gameDayOffset
) {
  const range = getGamingDayRangeForPeriod(timePeriod, gameDayOffset);
  const machineId = machine._id.toString();

  // For multi-day periods, create one meter per day
  // For single-day periods, create 3-5 meters throughout the day
  const isMultiDay = timePeriod === '7d' || timePeriod === '30d' || timePeriod === 'last7days' || timePeriod === 'last30days';
  
  let records = [];
  
  if (isMultiDay) {
    // Create one meter per day for multi-day periods
    const days = timePeriod === '7d' || timePeriod === 'last7days' ? 7 : 30;
    const dayMs = 24 * 60 * 60 * 1000;
    
    for (let day = 0; day < days; day++) {
      const dayStart = new Date(range.rangeStart.getTime() + day * dayMs);
      const dayEnd = new Date(Math.min(dayStart.getTime() + dayMs - 1, range.rangeEnd.getTime()));
      
      // Use middle of the day for readAt
      const readAt = new Date(dayStart.getTime() + (dayEnd.getTime() - dayStart.getTime()) / 2);
      
      const values = generateMeterValues(machineId, timePeriod, day);
      
      const meterId = generateMongoIdHex();
      
      const meterRecord = {
        _id: meterId,
        machine: machineId,
        location: location._id.toString(),
        locationSession: generateMongoIdHex(), // Generate a session ID
        readAt: readAt,
        timestamp: readAt,
        movement: {
          drop: values.drop,
          totalCancelledCredits: values.totalCancelledCredits,
          coinIn: values.coinIn,
          coinOut: values.coinOut,
          jackpot: values.jackpot,
          gamesPlayed: values.gamesPlayed,
          gamesWon: values.gamesWon,
          currentCredits: values.currentCredits,
          totalWonCredits: values.totalWonCredits,
          totalHandPaidCancelledCredits: values.totalHandPaidCancelledCredits,
        },
        // Top-level fields (copy from movement)
        drop: values.drop,
        totalCancelledCredits: values.totalCancelledCredits,
        coinIn: values.coinIn,
        coinOut: values.coinOut,
        jackpot: values.jackpot,
        gamesPlayed: values.gamesPlayed,
        gamesWon: values.gamesWon,
        currentCredits: values.currentCredits,
        totalWonCredits: values.totalWonCredits,
        totalHandPaidCancelledCredits: values.totalHandPaidCancelledCredits,
        viewingAccountDenomination: {
          drop: values.drop,
          totalCancelledCredits: values.totalCancelledCredits,
        },
        createdAt: readAt,
        updatedAt: readAt,
      };
      
      records.push(meterRecord);
    }
  } else {
    // For single-day periods, create 3-5 meters throughout the day
    const numRecords = 3 + (machineId.charCodeAt(0) % 3); // 3-5 records
    const totalValues = generateMeterValues(machineId, timePeriod, 0);
    
    for (let i = 0; i < numRecords; i++) {
      const progress = (i + 1) / (numRecords + 1);
      const readAt = new Date(
        range.rangeStart.getTime() +
          (range.rangeEnd.getTime() - range.rangeStart.getTime()) * progress
      );

      // Divide values across records
      const recordValues = {
        drop: Math.round((totalValues.drop / numRecords) * 100) / 100,
        totalCancelledCredits: Math.round((totalValues.totalCancelledCredits / numRecords) * 100) / 100,
        coinIn: Math.round((totalValues.coinIn / numRecords) * 100) / 100,
        coinOut: Math.round((totalValues.coinOut / numRecords) * 100) / 100,
        gamesPlayed: Math.floor(totalValues.gamesPlayed / numRecords),
        gamesWon: Math.floor(totalValues.gamesWon / numRecords),
        jackpot: i === numRecords - 1 ? totalValues.jackpot : 0, // Only last record has jackpot
        currentCredits: 0,
        totalWonCredits: Math.round((totalValues.totalWonCredits / numRecords) * 100) / 100,
        totalHandPaidCancelledCredits: Math.round((totalValues.totalHandPaidCancelledCredits / numRecords) * 100) / 100,
      };

      const meterId = generateMongoIdHex();

      const meterRecord = {
        _id: meterId,
        machine: machineId,
        location: location._id.toString(),
        locationSession: generateMongoIdHex(),
        readAt: readAt,
        timestamp: readAt,
        movement: {
          drop: recordValues.drop,
          totalCancelledCredits: recordValues.totalCancelledCredits,
          coinIn: recordValues.coinIn,
          coinOut: recordValues.coinOut,
          jackpot: recordValues.jackpot,
          gamesPlayed: recordValues.gamesPlayed,
          gamesWon: recordValues.gamesWon,
          currentCredits: recordValues.currentCredits,
          totalWonCredits: recordValues.totalWonCredits,
          totalHandPaidCancelledCredits: recordValues.totalHandPaidCancelledCredits,
        },
        // Top-level fields
        drop: recordValues.drop,
        totalCancelledCredits: recordValues.totalCancelledCredits,
        coinIn: recordValues.coinIn,
        coinOut: recordValues.coinOut,
        jackpot: recordValues.jackpot,
        gamesPlayed: recordValues.gamesPlayed,
        gamesWon: recordValues.gamesWon,
        currentCredits: recordValues.currentCredits,
        totalWonCredits: recordValues.totalWonCredits,
        totalHandPaidCancelledCredits: recordValues.totalHandPaidCancelledCredits,
        viewingAccountDenomination: {
          drop: recordValues.drop,
          totalCancelledCredits: recordValues.totalCancelledCredits,
        },
        createdAt: readAt,
        updatedAt: readAt,
      };

      records.push(meterRecord);
    }
  }

  return records;
}

async function main() {
  console.log('🚀 Starting meter regeneration script...');
  console.log(`📡 Connecting to MongoDB: ${MONGO_URI ? 'URI found' : 'NO URI'}\n`);
  
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();

    // ============================================================================
    // STEP 1: Clear all meters
    // ============================================================================
    console.log('🗑️  Clearing all meters from database...');
    const deleteResult = await db.collection('meters').deleteMany({});
    console.log(`   Deleted ${deleteResult.deletedCount} meter records\n`);

    // ============================================================================
    // STEP 2: Get all locations and machines
    // ============================================================================
    console.log('📊 Fetching locations and machines...');
    const locations = await db.collection('gaminglocations').find({
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    }).toArray();

    console.log(`   Found ${locations.length} locations`);

    const allMachines = await db.collection('machines').find({
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    }).toArray();

    console.log(`   Found ${allMachines.length} machines\n`);

    // ============================================================================
    // STEP 3: Create meters for each time period
    // ============================================================================
    const timePeriods = ['Today', 'Yesterday', '7d', '30d'];
    const totalsByPeriod = {};

    for (const timePeriod of timePeriods) {
      console.log(`\n📅 Creating meters for: ${timePeriod}`);
      totalsByPeriod[timePeriod] = {
        moneyIn: 0,
        moneyOut: 0,
        gross: 0,
        machines: 0,
        meters: 0,
      };

      const allMeterRecords = [];

      for (const location of locations) {
        const gameDayOffset = location.gameDayOffset ?? 8;
        const locationMachines = allMachines.filter(
          m => m.gamingLocation?.toString() === location._id.toString()
        );

        for (const machine of locationMachines) {
          const records = await createMeterRecordsForPeriod(
            db,
            machine,
            location,
            timePeriod,
            gameDayOffset
          );

          // Calculate totals for this machine
          const machineTotals = records.reduce(
            (acc, record) => ({
              moneyIn: acc.moneyIn + (record.movement.drop || 0),
              moneyOut: acc.moneyOut + (record.movement.totalCancelledCredits || 0),
              gross: acc.gross + ((record.movement.drop || 0) - (record.movement.totalCancelledCredits || 0)),
            }),
            { moneyIn: 0, moneyOut: 0, gross: 0 }
          );

          totalsByPeriod[timePeriod].moneyIn += machineTotals.moneyIn;
          totalsByPeriod[timePeriod].moneyOut += machineTotals.moneyOut;
          totalsByPeriod[timePeriod].gross += machineTotals.gross;
          totalsByPeriod[timePeriod].machines += 1;
          totalsByPeriod[timePeriod].meters += records.length;

          allMeterRecords.push(...records);
        }
      }

      // Insert all meters for this time period in batches
      if (allMeterRecords.length > 0) {
        const BATCH_SIZE = 1000;
        for (let i = 0; i < allMeterRecords.length; i += BATCH_SIZE) {
          const batch = allMeterRecords.slice(i, i + BATCH_SIZE);
          await db.collection('meters').insertMany(batch, { ordered: false });
        }
        console.log(`   ✅ Created ${allMeterRecords.length} meter records`);
      }
    }

    // ============================================================================
    // STEP 4: Report expected totals
    // ============================================================================
    console.log('\n' + '='.repeat(80));
    console.log('📊 EXPECTED TOTALS BY TIME PERIOD');
    console.log('='.repeat(80));
    
    for (const [period, totals] of Object.entries(totalsByPeriod)) {
      console.log(`\n${period}:`);
      console.log(`   Machines: ${totals.machines}`);
      console.log(`   Meters: ${totals.meters}`);
      console.log(`   Money In:  $${totals.moneyIn.toFixed(2)}`);
      console.log(`   Money Out: $${totals.moneyOut.toFixed(2)}`);
      console.log(`   Gross:     $${totals.gross.toFixed(2)}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Meter regeneration complete!');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('✅ Disconnected from MongoDB');
  }
}

main().catch(console.error);

