/**
 * Script to generate 100+ locations with 100 machines each
 * Creates test data for TTG, Cabana, Barbados, Kibana, and Bobbittos licensees
 *
 * CRITICAL: Uses STRING IDs, NOT ObjectId
 * - Generates MongoDB ObjectId-style hex strings (24 chars)
 * - Uses raw MongoDB insertOne() to bypass Mongoose casting
 * - Matches production API behavior (generateMongoId())
 * - Prevents ObjectId casting issues
 *
 * USAGE:
 *   node scripts/generate-100-locations-with-machines.js
 *
 * WHAT IT DOES:
 *   1. Creates/verifies 5 licensees (TTG, Cabana, Barbados exist; creates Kibana, Bobbittos)
 *   2. Creates locations for each licensee to reach 22 per licensee (110 total)
 *   3. Creates 100 machines for each newly created location
 *   4. Uses realistic naming patterns from existing data:
 *      - Locations: Test-[Licensee]-Loc[Number]
 *      - Machines: [Licensee]-[LocNum]-M[MachineNum] (70% standard, 30% alternate)
 *      - Alternate patterns: GM*, GMID*, TTRHP*, numeric
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

// MongoDB connection URI
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not found in environment variables');
  process.exit(1);
}

// Schemas
const licenseeSchema = new mongoose.Schema(
  {},
  { strict: false, collection: 'licencees' }
); // British spelling
const locationSchema = new mongoose.Schema(
  {},
  { strict: false, collection: 'gaminglocations' }
);
const machineSchema = new mongoose.Schema(
  {},
  { strict: false, collection: 'machines' }
);
const meterSchema = new mongoose.Schema(
  {},
  { strict: false, collection: 'meters' }
);

const Licensee = mongoose.model('Licensee', licenseeSchema);
const Location = mongoose.model('GamingLocation', locationSchema);
const Machine = mongoose.model('Machine', machineSchema);
const Meter = mongoose.model('Meter', meterSchema);

// Licensee configurations
// Note: TTG, Cabana, Barbados already exist. We'll add Kibana and Bobbittos
const LICENSEES = [
  {
    name: 'TTG',
    displayName: 'Trinidad & Tobago Gaming',
    code: 'TTG',
    shouldCreate: false,
  }, // Exists
  {
    name: 'Cabana',
    displayName: 'Cabana Gaming',
    code: 'Cabana',
    shouldCreate: false,
  }, // Exists
  {
    name: 'Barbados',
    displayName: 'Barbados Entertainment',
    code: 'Barbados',
    shouldCreate: false,
  }, // Exists
  {
    name: 'Kibana',
    displayName: 'Kibana Gaming',
    code: 'Kibana',
    shouldCreate: true,
  }, // NEW
  {
    name: 'Bobbittos',
    displayName: 'Bobbittos Entertainment',
    code: 'Bobbittos',
    shouldCreate: true,
  }, // NEW
];

// Game names pool (from analysis)
const GAMES = [
  'Ainsworth Multi Win 13',
  'S3 Multigame',
  'Roulette',
  'Konami Dragon',
  'WMS Zeus',
  'Aristocrat Buffalo',
  'IGT Game King',
  'Bally Quick Hit',
  'Scientific Games Monopoly',
  'Novomatic Book of Ra',
  'Aristocrat Queen of the Nile',
  'IGT Cleopatra',
];

// Location name prefixes/suffixes
const LOCATION_PREFIXES = [
  'Casino',
  'Club',
  'Gaming',
  'Entertainment',
  'Lounge',
  'Palace',
  'Arena',
  'Plaza',
  'Center',
  'House',
  'Spot',
  'Zone',
];

const LOCATION_SUFFIXES = [
  'Downtown',
  'Uptown',
  'East',
  'West',
  'North',
  'South',
  'Central',
  'Heights',
  'Village',
  'Bay',
  'Point',
  'Corner',
  'Square',
  'Park',
];

const STREET_NAMES = [
  'Main St',
  'Park Ave',
  'Broadway',
  'Oak St',
  'Maple Ave',
  'Cedar Rd',
  'Pine St',
  'Elm Ave',
  'Washington St',
  'King St',
  'Queen St',
  'Bay St',
];

// Generate MongoDB ObjectId-style hex string (matching the API's generateMongoId)
// Returns 24-character hex string, NOT ObjectId object
function generateId() {
  // Create ObjectId and convert to hex string immediately
  return new mongoose.Types.ObjectId().toHexString();
}

// Generate location name matching existing pattern: Test-[Licensee]-Loc[Number]
function generateLocationName(licenseeCode, index) {
  return `Test-${licenseeCode}-Loc${index + 1}`;
}

// Generate machine serial matching existing pattern: [Licensee]-[LocNum]-M[MachineNum]
// Also supports other patterns like GM*, GMID*, etc.
function generateMachineSerial(
  licenseeCode,
  locationNum,
  machineNum,
  useAlternatePattern
) {
  if (useAlternatePattern) {
    // Use alternate patterns (GM*, GMID*, TTRHP*, numeric)
    const patterns = ['GM', 'GMID', 'TTRHP', 'numeric'];
    const pattern = patterns[machineNum % patterns.length];

    const uniqueNum = locationNum * 100 + machineNum;

    switch (pattern) {
      case 'GM':
        return `GM${String(uniqueNum).padStart(5, '0')}`;
      case 'GMID':
        return `GMID${uniqueNum}`;
      case 'TTRHP':
        return `TTRHP${String(uniqueNum).padStart(3, '0')}`;
      case 'numeric':
        return String(100000 + uniqueNum);
      default:
        return `${licenseeCode}-${locationNum}-M${machineNum}`;
    }
  }

  // Default pattern matching existing: TTG-1-M1, TTG-1-M2, etc.
  return `${licenseeCode}-${locationNum}-M${machineNum}`;
}

// Generate realistic meter values with full SAS meters
function generateMeterValues() {
  // Collection meters (metersIn/metersOut)
  const metersIn = Math.floor(Math.random() * 5000000) + 100000;
  const metersOut = Math.floor(metersIn * (0.85 + Math.random() * 0.1)); // 85-95% payout

  // SAS meters - comprehensive meter data matching machine schema
  const drop = Math.floor(Math.random() * 100000) + 10000; // Money In
  const totalCancelledCredits = Math.floor(
    drop * (0.01 + Math.random() * 0.05)
  ); // 1-6% of drop (manual payouts)
  const coinIn = Math.floor(drop * (2 + Math.random() * 3)); // Handle = 2-5x drop (total bets)
  const coinOut = Math.floor(coinIn * (0.85 + Math.random() * 0.1)); // 85-95% payout
  const gamesPlayed = Math.floor(coinIn / (5 + Math.random() * 45)); // $5-50 avg bet
  const jackpot = Math.floor(Math.random() * 5000); // 0-5000 jackpot
  const totalWonCredits = Math.floor(coinOut + jackpot);
  const gamesWon = Math.floor(gamesPlayed * (0.3 + Math.random() * 0.2)); // 30-50% games won
  const currentCredits = Math.floor(Math.random() * 100); // 0-100 credits on machine
  const moneyOut = totalCancelledCredits; // Same as cancelled credits

  // Bill meters - realistic denomination breakdown
  const totalBills = drop;
  const billMeters = {
    dollar1: Math.floor(totalBills * 0.05),
    dollar2: Math.floor(totalBills * 0.08),
    dollar5: Math.floor(totalBills * 0.15),
    dollar10: Math.floor(totalBills * 0.2),
    dollar20: Math.floor(totalBills * 0.25),
    dollar50: Math.floor(totalBills * 0.15),
    dollar100: Math.floor(totalBills * 0.12),
    dollar500: 0,
    dollar1000: 0,
    dollar2000: 0,
    dollar5000: 0,
    dollarTotal: totalBills,
    dollarTotalUnknown: 0,
  };

  return {
    metersIn,
    metersOut,
    sasMeters: {
      drop,
      totalCancelledCredits,
      gamesPlayed,
      moneyOut,
      slotDoorOpened: Math.floor(Math.random() * 50), // 0-50 door opens
      powerReset: Math.floor(Math.random() * 10), // 0-10 power resets
      totalHandPaidCancelledCredits: totalCancelledCredits,
      coinIn,
      coinOut,
      totalWonCredits,
      jackpot,
      currentCredits,
      gamesWon,
    },
    billMeters,
  };
}

async function generateTestData() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // =====================================================
    // STEP 1: CREATE/VERIFY LICENSEES
    // =====================================================
    console.log('='.repeat(80));
    console.log('STEP 1: CREATING/VERIFYING LICENSEES');
    console.log('='.repeat(80) + '\n');

    const licenseeIds = {};

    for (const licenseeConfig of LICENSEES) {
      let licensee = await Licensee.findOne({
        name: licenseeConfig.name,
      }).lean();

      if (!licensee && licenseeConfig.shouldCreate) {
        const licenseeId = generateId();

        // Use raw MongoDB insertOne to preserve string _id (bypass Mongoose casting)
        await mongoose.connection.db.collection('licencees').insertOne({
          _id: licenseeId, // String ID, not ObjectId
          name: licenseeConfig.name,
          displayName: licenseeConfig.displayName,
          code: licenseeConfig.code,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Fetch it back to get the full document
        licensee = await Licensee.findOne({ _id: licenseeId }).lean();
        console.log(
          `✅ Created licensee: ${licenseeConfig.name} (ID: ${licenseeId})`
        );
      } else if (licensee) {
        console.log(
          `✅ Licensee exists: ${licenseeConfig.name} (ID: ${licensee._id})`
        );
      } else {
        console.log(
          `ℹ️  Skipping licensee creation: ${licenseeConfig.name} (already exists)`
        );
      }

      if (licensee) {
        licenseeIds[licenseeConfig.name] = licensee._id;
      }
    }

    // =====================================================
    // STEP 2: COUNT EXISTING LOCATIONS PER LICENSEE
    // =====================================================
    console.log('\n' + '='.repeat(80));
    console.log('STEP 2: ANALYZING EXISTING LOCATIONS');
    console.log('='.repeat(80) + '\n');

    const existingLocations = await Location.find({}).lean();
    console.log(`📊 Total existing locations: ${existingLocations.length}\n`);

    const locationsByLicensee = {};
    LICENSEES.forEach(lic => {
      const licenseeId = licenseeIds[lic.name];
      locationsByLicensee[lic.name] = existingLocations.filter(
        loc => String(loc.rel?.licencee) === String(licenseeId)
      ).length;
      console.log(
        `  ${lic.name}: ${locationsByLicensee[lic.name]} existing locations`
      );
    });

    // =====================================================
    // STEP 3: CREATE LOCATIONS (aim for 20-25 per licensee)
    // =====================================================
    console.log('\n' + '='.repeat(80));
    console.log('STEP 3: CREATING LOCATIONS');
    console.log('='.repeat(80) + '\n');

    const TARGET_LOCATIONS_PER_LICENSEE = 22; // 5 licensees × 22 = 110 total locations
    const createdLocations = [];

    for (const licenseeConfig of LICENSEES) {
      const licenseeId = licenseeIds[licenseeConfig.name];
      const existing = locationsByLicensee[licenseeConfig.name];
      const toCreate = TARGET_LOCATIONS_PER_LICENSEE - existing;

      console.log(`\n📍 ${licenseeConfig.name}:`);
      console.log(`   Existing: ${existing} locations`);
      console.log(`   Creating: ${toCreate} new locations`);

      if (toCreate <= 0) {
        console.log(`   ✅ Already has enough locations!`);
        continue;
      }

      for (let i = 0; i < toCreate; i++) {
        const globalIndex = existing + i;
        const locationId = generateId();
        const locationName = generateLocationName(
          licenseeConfig.code,
          globalIndex
        );
        const streetNumber = Math.floor(Math.random() * 9000) + 1000;
        const street =
          STREET_NAMES[Math.floor(Math.random() * STREET_NAMES.length)];

        const location = {
          _id: locationId, // String ID
          name: locationName,
          address: {
            street: `${streetNumber} ${street}`,
            city: `${licenseeConfig.name} City`,
            state: 'Test State',
            zipCode: String(10000 + Math.floor(Math.random() * 90000)),
          },
          rel: {
            licencee: licenseeId, // String reference to licensee
          },
          profitShare: 50,
          sasEnabled: Math.random() > 0.5, // 50% chance of SAS
          gameDayOffset: 8, // Standard 8 AM gaming day start
          previousCollectionTime: null,
          deletedAt: new Date(-1), // SMIB boards require this field
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Use raw MongoDB insertOne to preserve string _id
        await mongoose.connection.db
          .collection('gaminglocations')
          .insertOne(location);
        createdLocations.push({ ...location, licensee: licenseeConfig.name });

        if ((i + 1) % 10 === 0) {
          console.log(`   Created ${i + 1}/${toCreate} locations...`);
        }
      }

      console.log(
        `   ✅ Completed: Created ${toCreate} locations for ${licenseeConfig.name}`
      );
    }

    console.log(`\n✅ Total locations created: ${createdLocations.length}`);
    console.log(
      `✅ Total locations in database: ${existingLocations.length + createdLocations.length}`
    );

    // =====================================================
    // STEP 4: CREATE MACHINES (100 per location)
    // =====================================================
    console.log('\n' + '='.repeat(80));
    console.log('STEP 4: CREATING MACHINES (100 PER LOCATION)');
    console.log('='.repeat(80) + '\n');

    const MACHINES_PER_LOCATION = 100;

    let totalMachinesCreated = 0;

    for (const location of createdLocations) {
      console.log(`\n🎰 Creating machines for: ${location.name}`);

      const locationIndex = createdLocations.indexOf(location);
      const machinesCreated = [];

      // Extract location number from name (e.g., "Test-TTG-Loc5" -> 5)
      const locationNumMatch = location.name.match(/Loc(\d+)/);
      const locationNum = locationNumMatch
        ? parseInt(locationNumMatch[1])
        : locationIndex + 1;

      for (let i = 0; i < MACHINES_PER_LOCATION; i++) {
        const machineId = generateId();

        // Use alternate patterns for variety (30% of machines)
        const useAlternate = Math.random() > 0.7;
        const serialNumber = generateMachineSerial(
          location.licensee,
          locationNum,
          i + 1,
          useAlternate
        );
        const game = GAMES[Math.floor(Math.random() * GAMES.length)];
        const meterData = generateMeterValues();

        const machine = {
          _id: machineId, // String ID
          serialNumber: serialNumber,
          custom: {
            name: serialNumber, // Use serial as custom name
          },
          game: game,
          gamingLocation: location._id, // String reference to location

          // Collection meters (for collection reports)
          collectionMeters: {
            metersIn: meterData.metersIn,
            metersOut: meterData.metersOut,
          },
          collectionMetersHistory: [],
          collectionTime: null,
          previousCollectionTime: null,

          // SAS meters (comprehensive meter data)
          sasMeters: meterData.sasMeters,

          // Bill validator meters (denomination breakdown)
          billMeters: meterData.billMeters,

          // Machine configuration
          smibBoard: Math.random() > 0.7, // 30% have SMIB
          smbId: Math.random() > 0.7 ? `SMB-${serialNumber}` : null,
          isSasMachine: true, // All machines are SAS-enabled
          sasVersion: '6.02', // Standard SAS protocol version
          active: true,
          machineType: 'slot', // All are slot machines
          machineStatus: 'active',

          // Additional fields from schema
          lastActivity: new Date(),
          lastSasMeterAt: new Date(),
          lastBillMeterAt: new Date(),
          loggedIn: false,

          deletedAt: new Date(-1), // Standard field for soft deletes
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // Use raw MongoDB insertOne to preserve string _id
        await mongoose.connection.db.collection('machines').insertOne(machine);
        machinesCreated.push(machine);
        totalMachinesCreated++;
      }

      console.log(`   ✅ Created ${machinesCreated.length} machines`);

      if ((locationIndex + 1) % 5 === 0) {
        console.log(
          `\n📊 Progress: ${locationIndex + 1}/${createdLocations.length} locations processed, ${totalMachinesCreated} total machines created`
        );
      }
    }

    // =====================================================
    // STEP 5: CREATE METER READINGS (for dashboard/reports)
    // =====================================================
    console.log('\n' + '='.repeat(80));
    console.log('STEP 5: CREATING METER READINGS FOR MACHINES');
    console.log('='.repeat(80) + '\n');

    console.log('Creating meter readings for newly created machines...');
    console.log('This enables dashboard metrics and financial reports.\n');

    // Get all newly created machines
    const allNewMachines = await Machine.find({
      _id: {
        $in: createdLocations.flatMap(() =>
          Array(MACHINES_PER_LOCATION)
            .fill(null)
            .map(() => generateId())
        ),
      },
    }).lean();

    // Actually, we need to track machine IDs during creation
    // For now, create meter readings for machines in the new locations
    let metersCreated = 0;

    for (const location of createdLocations) {
      const machines = await Machine.find({
        gamingLocation: location._id,
      }).lean();

      // Create 1 meter reading per machine (most recent reading for dashboard)
      for (const machine of machines) {
        const meterId = generateId();
        const readAt = new Date(); // Current time as reading time

        // Use the machine's sasMeters as the meter reading
        const meterReading = {
          _id: meterId, // String ID
          machine: machine._id, // String reference to machine
          machineSerialNumber: machine.serialNumber,
          readAt: readAt,

          // Movement data (primary source for financial metrics)
          movement: {
            drop: machine.sasMeters.drop,
            totalCancelledCredits: machine.sasMeters.totalCancelledCredits,
            coinIn: machine.sasMeters.coinIn,
            coinOut: machine.sasMeters.coinOut,
            jackpot: machine.sasMeters.jackpot,
            gamesPlayed: machine.sasMeters.gamesPlayed,
            gross:
              machine.sasMeters.drop - machine.sasMeters.totalCancelledCredits,
          },

          // SAS meters (fallback/detailed data)
          sasMeters: machine.sasMeters,

          // Metadata
          location: location._id,
          locationName: location.name,
          gameName: machine.game,

          createdAt: readAt,
          updatedAt: readAt,
        };

        // Use raw MongoDB insertOne to preserve string _id
        await mongoose.connection.db
          .collection('meters')
          .insertOne(meterReading);
        metersCreated++;
      }

      if (createdLocations.indexOf(location) % 10 === 0) {
        console.log(
          `   Created meters for ${createdLocations.indexOf(location) + 1}/${createdLocations.length} locations...`
        );
      }
    }

    console.log(`\n✅ Total meter readings created: ${metersCreated}`);

    // =====================================================
    // FINAL SUMMARY
    // =====================================================
    console.log('\n' + '='.repeat(80));
    console.log('GENERATION COMPLETE - FINAL SUMMARY');
    console.log('='.repeat(80) + '\n');

    // Verify final counts
    const finalLicensees = await Licensee.find({}).lean();
    const finalLocations = await Location.find({}).lean();
    const finalMachines = await Machine.find({}).lean();

    console.log('📊 DATABASE TOTALS:');
    console.log(`  Licensees: ${finalLicensees.length}`);
    console.log(`  Locations: ${finalLocations.length}`);
    console.log(`  Machines: ${finalMachines.length}`);

    // Breakdown by licensee
    console.log('\n📋 BREAKDOWN BY LICENSEE:');
    for (const licenseeConfig of LICENSEES) {
      const licenseeId = licenseeIds[licenseeConfig.name];
      const locations = await Location.find({
        'rel.licencee': licenseeId,
      }).lean();

      let machineCount = 0;
      for (const loc of locations) {
        const machines = await Machine.find({ gamingLocation: loc._id }).lean();
        machineCount += machines.length;
      }

      console.log(`\n  ${licenseeConfig.name}:`);
      console.log(`    Locations: ${locations.length}`);
      console.log(`    Machines: ${machineCount}`);
      console.log(
        `    Avg machines per location: ${Math.round(machineCount / locations.length)}`
      );
    }

    console.log('\n✅ Test data generation complete!');
    console.log('\nYou can now:');
    console.log('  1. View locations by licensee in the UI');
    console.log(
      '  2. Create collection reports with 100 machines per location'
    );
    console.log('  3. Test licensee filtering across the system');
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ MongoDB connection closed');
  }
}

// Run the generation
console.log('🚀 Starting test data generation...\n');
console.log('This will create:');
console.log(
  '  - 2 new licensees (Kibana, Bobbittos) + verify 3 existing (TTG, Cabana, Barbados)'
);
console.log('  - 110 total locations (22 per licensee × 5 licensees)');
console.log('  - 100 machines per location (~11,000 total machines)');
console.log('  - Realistic naming patterns matching existing data');
console.log(
  '  - Patterns: Test-[Licensee]-Loc[Num], [Licensee]-[LocNum]-M[MachineNum]'
);
console.log(
  '  - Mixed serial patterns (70% standard, 30% GM*/GMID*/TTRHP*/numeric)\n'
);

const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout,
});

readline.question(
  '⚠️  This will add ~10,000+ documents to your database. Continue? (yes/no): ',
  answer => {
    readline.close();

    if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
      console.log('\n✅ Starting generation...\n');
      generateTestData();
    } else {
      console.log('\n❌ Cancelled by user');
      process.exit(0);
    }
  }
);
