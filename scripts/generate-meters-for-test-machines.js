/**
 * Script to create meter readings for test machines
 * Only creates meters for machines at Test-* locations
 * 
 * CRITICAL: Uses STRING IDs, NOT ObjectId
 * 
 * USAGE:
 *   node scripts/generate-meters-for-test-machines.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not found in environment variables');
  process.exit(1);
}

// Schemas
const locationSchema = new mongoose.Schema(
  {},
  { strict: false, collection: 'gaminglocations' }
);
const machineSchema = new mongoose.Schema(
  {},
  { strict: false, collection: 'machines' }
);

const Location = mongoose.model('GamingLocation', locationSchema);
const Machine = mongoose.model('Machine', machineSchema);

// Generate MongoDB ObjectId-style hex string (24 chars)
function generateId() {
  return new mongoose.Types.ObjectId().toHexString();
}

async function generateMeters() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // =====================================================
    // STEP 1: FIND ALL TEST LOCATIONS
    // =====================================================
    console.log('='.repeat(80));
    console.log('STEP 1: FINDING TEST LOCATIONS');
    console.log('='.repeat(80) + '\n');

    const testLocations = await Location.find({
      name: /^Test-/i, // All locations starting with "Test-"
    }).lean();

    console.log(`📊 Found ${testLocations.length} test locations\n`);

    if (testLocations.length === 0) {
      console.log('❌ No test locations found');
      return;
    }

    // Show sample
    console.log('Sample test locations:');
    testLocations.slice(0, 5).forEach((loc, idx) => {
      console.log(`  ${idx + 1}. ${loc.name} (ID: ${loc._id})`);
    });
    if (testLocations.length > 5) {
      console.log(`  ... and ${testLocations.length - 5} more`);
    }

    // =====================================================
    // STEP 2: FIND ALL MACHINES AT TEST LOCATIONS
    // =====================================================
    console.log('\n' + '='.repeat(80));
    console.log('STEP 2: FINDING MACHINES AT TEST LOCATIONS');
    console.log('='.repeat(80) + '\n');

    const testLocationIds = testLocations.map(loc => loc._id);
    const testMachines = await Machine.find({
      gamingLocation: { $in: testLocationIds },
    }).lean();

    console.log(`📊 Found ${testMachines.length} machines at test locations\n`);

    // Check if any already have meters
    const machineIds = testMachines.map(m => m._id);
    const existingMeters = await mongoose.connection.db
      .collection('meters')
      .countDocuments({ machine: { $in: machineIds } });

    console.log(`Existing meter readings: ${existingMeters}`);
    console.log(`Machines needing meters: ${testMachines.length - existingMeters}\n`);

    if (existingMeters >= testMachines.length) {
      console.log('✅ All test machines already have meter readings!');
      return;
    }

    // =====================================================
    // STEP 3: CREATE METER READINGS
    // =====================================================
    console.log('='.repeat(80));
    console.log('STEP 3: CREATING METER READINGS');
    console.log('='.repeat(80) + '\n');

    const readAt = new Date(); // Current time as reading time
    let metersCreated = 0;
    let metersSkipped = 0;

    for (const machine of testMachines) {
      // Check if meter already exists
      const existingMeter = await mongoose.connection.db
        .collection('meters')
        .findOne({ machine: machine._id });

      if (existingMeter) {
        metersSkipped++;
        continue;
      }

      // Find the location for this machine
      const location = testLocations.find(
        loc => String(loc._id) === String(machine.gamingLocation)
      );

      if (!location) {
        console.warn(`⚠️  Machine ${machine.serialNumber} has no matching location, skipping...`);
        continue;
      }

      const meterId = generateId();

      // Use the machine's sasMeters if available, otherwise generate new ones
      let sasMeters = machine.sasMeters;
      if (!sasMeters || !sasMeters.drop) {
        // Generate realistic SAS meters
        const drop = Math.floor(Math.random() * 100000) + 10000;
        const totalCancelledCredits = Math.floor(drop * (0.01 + Math.random() * 0.05));
        const coinIn = Math.floor(drop * (2 + Math.random() * 3));
        const coinOut = Math.floor(coinIn * (0.85 + Math.random() * 0.1));
        const gamesPlayed = Math.floor(coinIn / (5 + Math.random() * 45));
        const jackpot = Math.floor(Math.random() * 5000);

        sasMeters = {
          drop,
          totalCancelledCredits,
          gamesPlayed,
          moneyOut: totalCancelledCredits,
          slotDoorOpened: Math.floor(Math.random() * 50),
          powerReset: Math.floor(Math.random() * 10),
          totalHandPaidCancelledCredits: totalCancelledCredits,
          coinIn,
          coinOut,
          totalWonCredits: coinOut + jackpot,
          jackpot,
          currentCredits: Math.floor(Math.random() * 100),
          gamesWon: Math.floor(gamesPlayed * (0.3 + Math.random() * 0.2)),
        };
      }

      const meterReading = {
        _id: meterId, // String ID
        machine: machine._id, // String reference to machine
        machineSerialNumber: machine.serialNumber,
        readAt: readAt,

        // Movement data (primary source for financial metrics)
        movement: {
          drop: sasMeters.drop,
          totalCancelledCredits: sasMeters.totalCancelledCredits,
          coinIn: sasMeters.coinIn,
          coinOut: sasMeters.coinOut,
          jackpot: sasMeters.jackpot,
          gamesPlayed: sasMeters.gamesPlayed,
          gross: sasMeters.drop - sasMeters.totalCancelledCredits,
        },

        // SAS meters (comprehensive meter data)
        sasMeters: sasMeters,

        // Metadata
        location: location._id,
        locationName: location.name,
        gameName: machine.game,

        createdAt: readAt,
        updatedAt: readAt,
      };

      // Use raw MongoDB insertOne to preserve string _id
      await mongoose.connection.db.collection('meters').insertOne(meterReading);
      metersCreated++;

      if (metersCreated % 100 === 0) {
        console.log(`   Created ${metersCreated} meter readings...`);
      }
    }

    // =====================================================
    // FINAL SUMMARY
    // =====================================================
    console.log('\n' + '='.repeat(80));
    console.log('METER GENERATION COMPLETE');
    console.log('='.repeat(80) + '\n');

    console.log('📊 RESULTS:');
    console.log(`  Meters created: ${metersCreated}`);
    console.log(`  Meters skipped (already exist): ${metersSkipped}`);
    console.log(`  Total meters for test machines: ${metersCreated + metersSkipped}`);

    // Verify
    const finalMeterCount = await mongoose.connection.db
      .collection('meters')
      .countDocuments({ machine: { $in: machineIds } });

    console.log(`\n✅ Verification: ${finalMeterCount} total meter readings for ${testMachines.length} test machines`);

    console.log('\n✅ Meter readings created successfully!');
    console.log('\nThese meters will now appear in:');
    console.log('  1. Dashboard financial metrics');
    console.log('  2. Location performance tables');
    console.log('  3. Machine evaluation reports');
    console.log('  4. Collection report calculations');

  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ MongoDB connection closed');
  }
}

// Run the generation
console.log('🚀 Creating meter readings for test machines...\n');
generateMeters();

