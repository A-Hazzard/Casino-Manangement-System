/**
 * Create Simple Test Meters
 *
 * Creates meters for testing currency conversion:
 * - 1 machine in Barbados location: movement.drop = 2 (BBD)
 * - 1 machine in TTG location: movement.drop = 4 (TTD)
 * - 1 machine in Cabana location: movement.drop = 8 (GYD)
 *
 * Usage: node test/create-simple-test-meters.js
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGODB_URI ||
  process.env.MONGODB_URL ||
  process.env.DATABASE_URL;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

function generateMongoIdHex() {
  return new ObjectId().toHexString();
}

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
  console.log('🚀 Creating simple test meters...\n');

  const client = new MongoClient(MONGODB_URI);

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
    // STEP 2: Find locations for each licensee
    // ============================================================================
    console.log('📊 Finding locations...');

    // Find Barbados location
    const barbadosLocation = await db.collection('gaminglocations').findOne(
      {
        'rel.licencee': { $exists: true, $ne: null },
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2020-01-01') } },
        ],
      },
      {
        projection: { _id: 1, name: 1, 'rel.licencee': 1, gameDayOffset: 1 },
      }
    );

    // Get licensee name for Barbados
    let barbadosLicenseeName = null;
    if (barbadosLocation?.rel?.licencee) {
      const licensee = await db.collection('licencees').findOne({
        _id: barbadosLocation.rel.licencee,
      });
      barbadosLicenseeName = licensee?.name;
    }

    // Find TTG location
    const ttgLocation = await db.collection('gaminglocations').findOne(
      {
        'rel.licencee': { $exists: true, $ne: null },
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2020-01-01') } },
        ],
      },
      {
        projection: { _id: 1, name: 1, 'rel.licencee': 1, gameDayOffset: 1 },
      }
    );

    // Get licensee name for TTG
    let ttgLicenseeName = null;
    if (ttgLocation?.rel?.licencee) {
      const licensee = await db.collection('licencees').findOne({
        _id: ttgLocation.rel.licencee,
      });
      ttgLicenseeName = licensee?.name;
    }

    // Find Cabana location
    const cabanaLocation = await db.collection('gaminglocations').findOne(
      {
        'rel.licencee': { $exists: true, $ne: null },
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2020-01-01') } },
        ],
      },
      {
        projection: { _id: 1, name: 1, 'rel.licencee': 1, gameDayOffset: 1 },
      }
    );

    // Get licensee name for Cabana
    let cabanaLicenseeName = null;
    if (cabanaLocation?.rel?.licencee) {
      const licensee = await db.collection('licencees').findOne({
        _id: cabanaLocation.rel.licencee,
      });
      cabanaLicenseeName = licensee?.name;
    }

    // Actually, let's find locations by licensee name
    const allLicensees = await db
      .collection('licencees')
      .find({
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2020-01-01') } },
        ],
      })
      .toArray();

    let barbadosLicenseeId = null;
    let ttgLicenseeId = null;
    let cabanaLicenseeId = null;

    for (const lic of allLicensees) {
      if (lic.name === 'Barbados') barbadosLicenseeId = lic._id;
      if (lic.name === 'TTG') ttgLicenseeId = lic._id;
      if (lic.name === 'Cabana') cabanaLicenseeId = lic._id;
    }

    const barbadosLoc = await db.collection('gaminglocations').findOne({
      'rel.licencee': barbadosLicenseeId,
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    });

    const ttgLoc = await db.collection('gaminglocations').findOne({
      'rel.licencee': ttgLicenseeId,
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    });

    const cabanaLoc = await db.collection('gaminglocations').findOne({
      'rel.licencee': cabanaLicenseeId,
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    });

    if (!barbadosLoc || !ttgLoc || !cabanaLoc) {
      console.error('❌ Could not find all required locations');
      console.log('   Barbados:', barbadosLoc ? barbadosLoc.name : 'NOT FOUND');
      console.log('   TTG:', ttgLoc ? ttgLoc.name : 'NOT FOUND');
      console.log('   Cabana:', cabanaLoc ? cabanaLoc.name : 'NOT FOUND');
      return;
    }

    console.log(`   Barbados: ${barbadosLoc.name} (${barbadosLoc._id})`);
    console.log(`   TTG: ${ttgLoc.name} (${ttgLoc._id})`);
    console.log(`   Cabana: ${cabanaLoc.name} (${cabanaLoc._id})\n`);

    // ============================================================================
    // STEP 3: Find one machine in each location
    // ============================================================================
    const barbadosMachine = await db.collection('machines').findOne({
      gamingLocation: barbadosLoc._id,
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    });

    const ttgMachine = await db.collection('machines').findOne({
      gamingLocation: ttgLoc._id,
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    });

    const cabanaMachine = await db.collection('machines').findOne({
      gamingLocation: cabanaLoc._id,
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    });

    if (!barbadosMachine || !ttgMachine || !cabanaMachine) {
      console.error('❌ Could not find machines in all locations');
      return;
    }

    console.log(
      `   Barbados Machine: ${barbadosMachine.serialNumber || barbadosMachine._id}`
    );
    console.log(`   TTG Machine: ${ttgMachine.serialNumber || ttgMachine._id}`);
    console.log(
      `   Cabana Machine: ${cabanaMachine.serialNumber || cabanaMachine._id}\n`
    );

    // ============================================================================
    // STEP 4: Create meters
    // ============================================================================
    console.log('📝 Creating meters...');

    const meters = [];

    // Barbados: 2 BBD
    const barbadosGameDayOffset = barbadosLoc.gameDayOffset ?? 8;
    const barbadosRange = getYesterdayGamingDayRange(barbadosGameDayOffset);
    const barbadosReadAt = new Date(
      barbadosRange.rangeStart.getTime() +
        (barbadosRange.rangeEnd.getTime() -
          barbadosRange.rangeStart.getTime()) /
          2
    );

    meters.push({
      _id: generateMongoIdHex(),
      machine: barbadosMachine._id.toString(),
      location: barbadosLoc._id.toString(),
      locationSession: generateMongoIdHex(),
      readAt: barbadosReadAt,
      timestamp: barbadosReadAt,
      movement: {
        drop: 2, // 2 BBD
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
      createdAt: barbadosReadAt,
      updatedAt: barbadosReadAt,
    });

    // TTG: 4 TTD
    const ttgGameDayOffset = ttgLoc.gameDayOffset ?? 8;
    const ttgRange = getYesterdayGamingDayRange(ttgGameDayOffset);
    const ttgReadAt = new Date(
      ttgRange.rangeStart.getTime() +
        (ttgRange.rangeEnd.getTime() - ttgRange.rangeStart.getTime()) / 2
    );

    meters.push({
      _id: generateMongoIdHex(),
      machine: ttgMachine._id.toString(),
      location: ttgLoc._id.toString(),
      locationSession: generateMongoIdHex(),
      readAt: ttgReadAt,
      timestamp: ttgReadAt,
      movement: {
        drop: 4, // 4 TTD
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
      drop: 4,
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
        drop: 4,
        totalCancelledCredits: 0,
      },
      createdAt: ttgReadAt,
      updatedAt: ttgReadAt,
    });

    // Cabana: 8 GYD
    const cabanaGameDayOffset = cabanaLoc.gameDayOffset ?? 8;
    const cabanaRange = getYesterdayGamingDayRange(cabanaGameDayOffset);
    const cabanaReadAt = new Date(
      cabanaRange.rangeStart.getTime() +
        (cabanaRange.rangeEnd.getTime() - cabanaRange.rangeStart.getTime()) / 2
    );

    meters.push({
      _id: generateMongoIdHex(),
      machine: cabanaMachine._id.toString(),
      location: cabanaLoc._id.toString(),
      locationSession: generateMongoIdHex(),
      readAt: cabanaReadAt,
      timestamp: cabanaReadAt,
      movement: {
        drop: 8, // 8 GYD
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
      drop: 8,
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
        drop: 8,
        totalCancelledCredits: 0,
      },
      createdAt: cabanaReadAt,
      updatedAt: cabanaReadAt,
    });

    await db.collection('meters').insertMany(meters);

    console.log('   ✅ Created 3 meters\n');

    // ============================================================================
    // STEP 5: Calculate expected totals
    // ============================================================================
    console.log('='.repeat(80));
    console.log('📊 EXPECTED RESULTS');
    console.log('='.repeat(80));
    console.log('\nFor time period: Yesterday');
    console.log('\nIndividual Licensees (raw values):');
    console.log(`   Barbados: $2.00 BBD (native currency)`);
    console.log(`   TTG: $4.00 TTD (native currency)`);
    console.log(`   Cabana: $8.00 GYD (native currency)\n`);
    console.log('All Licensees (converted to USD):');
    console.log('   Barbados: 2 BBD ÷ 2.0 = $1.00 USD');
    console.log('   TTG: 4 TTD ÷ 6.75 = $0.59 USD');
    console.log('   Cabana: 8 GYD ÷ 207.98 = $0.04 USD');
    console.log('   Total: $1.00 + $0.59 + $0.04 = $1.63 USD\n');
    console.log('='.repeat(80));
    console.log('✅ Test data created!');
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
