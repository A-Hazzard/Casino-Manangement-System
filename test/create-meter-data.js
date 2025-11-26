/**
 * Create Meter Data Script
 *
 * This script creates meter data for today and yesterday for all machines
 * using the gaming day offset system.
 *
 * Usage: node test/create-meter-data.js
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/evolution-one-cms';

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

    default:
      throw new Error(`Unsupported time period: ${timePeriod}`);
  }
}

/**
 * Generate random meter values
 */
function generateMeterValues(machineIndex) {
  // Generate realistic values based on machine index for consistency
  const baseMoneyIn = 100 + (machineIndex % 10) * 50; // $100-$550
  const baseMoneyOut = baseMoneyIn * (0.7 + (machineIndex % 3) * 0.1); // 70%-90% of money in

  // Add some randomness
  const moneyIn = baseMoneyIn + Math.random() * 50;
  const moneyOut = baseMoneyOut + Math.random() * 30;

  return {
    drop: Math.round(moneyIn * 100) / 100,
    totalCancelledCredits: Math.round(moneyOut * 100) / 100,
    coinIn: Math.round(moneyIn * 1.2 * 100) / 100,
    coinOut: Math.round(moneyOut * 1.1 * 100) / 100,
    gamesPlayed: Math.floor(50 + Math.random() * 100),
    gamesWon: Math.floor(20 + Math.random() * 30),
    jackpot: Math.round(Math.random() * 10 * 100) / 100,
  };
}

/**
 * Create meter records for a machine
 */
async function createMeterRecords(
  db,
  machine,
  location,
  timePeriod,
  gameDayOffset,
  machineIndex
) {
  const range = getGamingDayRangeForPeriod(timePeriod, gameDayOffset);
  const values = generateMeterValues(machineIndex);

  // Create 3-5 meter records throughout the gaming day
  const numRecords = 3 + Math.floor(Math.random() * 3);
  const records = [];

  for (let i = 0; i < numRecords; i++) {
    // Distribute records throughout the gaming day
    const progress = (i + 1) / (numRecords + 1);
    const readAt = new Date(
      range.rangeStart.getTime() +
        (range.rangeEnd.getTime() - range.rangeStart.getTime()) * progress
    );

    // Divide values across records
    const recordValues = {
      drop: Math.round((values.drop / numRecords) * 100) / 100,
      totalCancelledCredits:
        Math.round((values.totalCancelledCredits / numRecords) * 100) / 100,
      coinIn: Math.round((values.coinIn / numRecords) * 100) / 100,
      coinOut: Math.round((values.coinOut / numRecords) * 100) / 100,
      gamesPlayed: Math.floor(values.gamesPlayed / numRecords),
      gamesWon: Math.floor(values.gamesWon / numRecords),
      jackpot: i === numRecords - 1 ? values.jackpot : 0, // Only last record has jackpot
    };

    const meterId = `${machine._id}_${timePeriod}_${i}_${readAt.getTime()}`;

    const meterRecord = {
      _id: meterId,
      machine: machine._id.toString(),
      location: location._id.toString(),
      locationSession: `session_${location._id}_${timePeriod}`,
      viewingAccountDenomination: {
        drop: recordValues.drop,
        totalCancelledCredits: recordValues.totalCancelledCredits,
      },
      movement: {
        coinIn: recordValues.coinIn,
        coinOut: recordValues.coinOut,
        totalCancelledCredits: recordValues.totalCancelledCredits,
        totalHandPaidCancelledCredits: 0,
        totalWonCredits: recordValues.coinOut * 0.9,
        drop: recordValues.drop,
        jackpot: recordValues.jackpot,
        currentCredits: 0,
        gamesPlayed: recordValues.gamesPlayed,
        gamesWon: recordValues.gamesWon,
      },
      coinIn: recordValues.coinIn,
      coinOut: recordValues.coinOut,
      totalCancelledCredits: recordValues.totalCancelledCredits,
      totalHandPaidCancelledCredits: 0,
      totalWonCredits: recordValues.coinOut * 0.9,
      drop: recordValues.drop,
      jackpot: recordValues.jackpot,
      currentCredits: 0,
      gamesPlayed: recordValues.gamesPlayed,
      gamesWon: recordValues.gamesWon,
      readAt: readAt,
    };

    records.push(meterRecord);
  }

  return records;
}

/**
 * Main function
 */
async function createMeterData() {
  console.log(`🔌 Connecting to database: ${MONGODB_URI.substring(0, 20)}...`);
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🔌 Connecting to database...');
    // Add connection timeout
    await Promise.race([
      client.connect(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Connection timeout after 10 seconds')),
          10000
        )
      ),
    ]);
    console.log('✅ Connected to database');
    const db = client.db();

    console.log('📊 Fetching machines and locations...');

    // Get all machines (excluding deleted)
    const machines = await db
      .collection('machines')
      .find({
        $or: [
          { deletedAt: null },
          { deletedAt: { $exists: false } },
          { deletedAt: { $lt: new Date('2020-01-01') } },
        ],
      })
      .toArray();

    console.log(`Found ${machines.length} machines`);

    if (machines.length === 0) {
      console.log('❌ No machines found. Exiting.');
      return;
    }

    // Get all locations with gameDayOffset
    const locations = await db.collection('gaminglocations').find({}).toArray();
    const locationMap = new Map();
    for (const loc of locations) {
      locationMap.set(loc._id.toString(), loc);
    }

    console.log(`Found ${locations.length} locations\n`);

    // Group machines by location
    const machinesByLocation = new Map();
    for (const machine of machines) {
      const locationId = machine.gamingLocation?.toString();
      if (!locationId || !locationMap.has(locationId)) {
        console.log(
          `⚠️  Machine ${machine._id} has no valid location, skipping`
        );
        continue;
      }

      if (!machinesByLocation.has(locationId)) {
        machinesByLocation.set(locationId, []);
      }
      machinesByLocation.get(locationId).push(machine);
    }

    console.log(`Processing ${machinesByLocation.size} locations...\n`);

    let totalRecordsCreated = 0;
    let machineIndex = 0;

    // Process each location
    for (const [locationId, locationMachines] of machinesByLocation.entries()) {
      const location = locationMap.get(locationId);
      const gameDayOffset = location.gameDayOffset ?? 8;

      console.log(
        `📍 Location: ${location.name || locationId} (gameDayOffset: ${gameDayOffset})`
      );
      console.log(`   Machines: ${locationMachines.length}`);

      // Create meters for today and yesterday
      for (const timePeriod of ['Today', 'Yesterday']) {
        console.log(`   Creating ${timePeriod} meters...`);

        // Delete existing meters for this period (if any)
        const range = getGamingDayRangeForPeriod(timePeriod, gameDayOffset);
        console.log(
          `     Date range: ${range.rangeStart.toISOString()} to ${range.rangeEnd.toISOString()}`
        );

        const deleteResult = await db.collection('meters').deleteMany({
          machine: { $in: locationMachines.map(m => m._id.toString()) },
          readAt: {
            $gte: range.rangeStart,
            $lte: range.rangeEnd,
          },
        });
        console.log(
          `     Deleted ${deleteResult.deletedCount} existing meters`
        );

        // Create new meters
        const allRecords = [];
        for (const machine of locationMachines) {
          const records = await createMeterRecords(
            db,
            machine,
            location,
            timePeriod,
            gameDayOffset,
            machineIndex++
          );
          allRecords.push(...records);
        }

        if (allRecords.length > 0) {
          await db.collection('meters').insertMany(allRecords);
          totalRecordsCreated += allRecords.length;
          console.log(`     ✅ Created ${allRecords.length} meter records`);
        }
      }

      console.log('');
    }

    console.log(
      `\n✅ Complete! Created ${totalRecordsCreated} meter records total.`
    );
    console.log('\n📋 Summary:');
    console.log(`   - Machines processed: ${machines.length}`);
    console.log(`   - Locations processed: ${machinesByLocation.size}`);
    console.log(`   - Time periods: Today, Yesterday`);
    console.log(`   - Total meter records: ${totalRecordsCreated}`);
  } catch (error) {
    console.error('❌ Error creating meter data:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Database connection closed.');
  }
}

// Run if executed directly
if (require.main === module) {
  createMeterData()
    .then(() => {
      console.log('\n✅ Script completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createMeterData };
