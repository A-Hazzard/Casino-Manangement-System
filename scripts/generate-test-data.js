/**
 * Mass Test Data Generation Script
 * Creates locations, machines, and meters for comprehensive testing
 * 
 * Run with: node scripts/generate-test-data.js
 * Dry run: node scripts/generate-test-data.js --dry-run
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Generate proper MongoDB hex string ID (24 characters)
const generateMongoId = () => {
  return new mongoose.Types.ObjectId().toHexString();
};

// Check if running in dry-run mode
const isDryRun = process.argv.includes('--dry-run');

console.log('\n🧪 TEST DATA GENERATION SCRIPT');
console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (no changes)' : '✍️  WRITE MODE (will modify database)'}\n`);

// MongoDB Connection
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;
    
    if (!mongoUri) {
      throw new Error('MongoDB URI not found in environment variables');
    }

    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Define Schemas (matching your app structure)
const LocationSchema = new mongoose.Schema({
  name: String,
  status: { type: String, default: 'draft' },
  country: String,
  address: {
    city: String,
    street: String,
    postalCode: String,
  },
  rel: {
    licencee: String,
  },
  profitShare: Number,
  collectionBalance: { type: Number, default: 0 },
  membershipEnabled: { type: Boolean, default: true },
  locationMembershipSettings: Object,
  deletedAt: { type: Date, default: new Date(-1) },
  statusHistory: Array,
  geoCoords: {
    latitude: Number,
    longitude: Number,
  },
  gameDayOffset: { type: Number, default: 8 },
  isLocalServer: { type: Boolean, default: false },
}, { timestamps: true });

const MachineSchema = new mongoose.Schema({
  serialNumber: String,
  relayId: String,
  gamingLocation: String,
  gamingBoard: String,
  smibBoard: String,
  assetStatus: { type: String, default: 'functional' },
  game: String,
  manuf: String,
  cabinetType: String,
  sasVersion: String,
  custom: {
    name: String,
  },
  gameType: { type: String, default: 'slot' },
  billValidator: {
    balance: { type: Number, default: 0 },
    notes: Array,
  },
  billMeters: {
    dollar1: { type: Number, default: 0 },
    dollar2: { type: Number, default: 0 },
    dollar5: { type: Number, default: 0 },
    dollar10: { type: Number, default: 0 },
    dollar20: { type: Number, default: 0 },
    dollar50: { type: Number, default: 0 },
    dollar100: { type: Number, default: 0 },
    dollar500: { type: Number, default: 0 },
    dollar1000: { type: Number, default: 0 },
    dollar2000: { type: Number, default: 0 },
    dollar5000: { type: Number, default: 0 },
    dollar10000: { type: Number, default: 0 },
    dollarTotal: { type: Number, default: 0 },
    dollarTotalUnknown: { type: Number, default: 0 },
  },
  config: {
    enableRte: { type: Boolean, default: false },
    lockMachine: { type: Boolean, default: false },
    lockBvOnLogOut: { type: Boolean, default: false },
  },
  currentSession: { type: String, default: '-1' },
  isSasMachine: { type: Boolean, default: true },
  loggedIn: { type: Boolean, default: false },
  nonRestricted: { type: Number, default: 0 },
  restricted: { type: Number, default: 0 },
  uaccount: { type: Number, default: 0 },
  playableBalance: { type: Number, default: 0 },
  sasMeters: {
    coinIn: { type: Number, default: 0 },
    coinOut: { type: Number, default: 0 },
    jackpot: { type: Number, default: 0 },
    totalHandPaidCancelledCredits: { type: Number, default: 0 },
    totalCancelledCredits: { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 },
    gamesWon: { type: Number, default: 0 },
    currentCredits: { type: Number, default: 0 },
    totalWonCredits: { type: Number, default: 0 },
    drop: { type: Number, default: 0 },
  },
  collectionMeters: {
    metersIn: { type: Number, default: 0 },
    metersOut: { type: Number, default: 0 },
  },
  collectorDenomination: { type: Number, default: 1 },
  gameConfig: Object,
  machineMembershipSettings: Object,
  collectionTime: Date,
  deletedAt: { type: Date, default: new Date(-1) },
  lastActivity: Date,
  collectionMetersHistory: Array,
  previousCollectionTime: Date,
}, { timestamps: true });

const Location = mongoose.model('GamingLocation', LocationSchema, 'gaminglocations');
const Machine = mongoose.model('Machine', MachineSchema, 'machines');

// Get licensee IDs from database
const getLicensees = async () => {
  const LicenseeSchema = new mongoose.Schema({}, { strict: false });
  const Licensee = mongoose.model('Licensee', LicenseeSchema, 'licencees');
  
  // Query for active licensees (deletedAt is null or -1)
  const licensees = await Licensee.find({
    $or: [
      { deletedAt: null },
      { deletedAt: new Date(-1) },
      { deletedAt: { $exists: false } }
    ]
  }).lean();
  
  console.log(`📋 Found ${licensees.length} active licensees in database:`);
  licensees.forEach(l => console.log(`   - ${l.name || 'Unnamed'} (${l._id})`));
  console.log();
  
  if (licensees.length === 0) {
    // Try without filter to see if any exist
    const allLicensees = await Licensee.find({}).lean();
    console.log(`⚠️  Total licensees in DB (including deleted): ${allLicensees.length}`);
    if (allLicensees.length > 0) {
      console.log('   Sample licensees:');
      allLicensees.slice(0, 5).forEach(l => {
        console.log(`   - ${l.name || 'Unnamed'} (${l._id}) - deletedAt: ${l.deletedAt}`);
      });
    }
  }
  
  return licensees;
};

// Test Data Templates
const gameTypes = [
  'Ainsworth Multi Win 13',
  'Roulette',
  'S3 Multigame',
  'IGT Game King',
  'Aristocrat Buffalo',
  'Konami Dragon',
  'Bally Quick Hit',
  'WMS Zeus',
  'Scientific Games Monopoly',
  'Everi Sphinx'
];

const cabinetTypes = ['standing', 'slant-top', 'bar-top'];

const countries = [
  'be622340d9d8384087937ff6', // Barbados
  'Trinidad and Tobago',
  'Guyana'
];

// Generate random meters
const generateRandomMeters = () => {
  const coinIn = Math.random() * 10000 + 500; // $500-$10,500
  const rtp = 0.85 + Math.random() * 0.1; // 85-95% RTP
  const coinOut = coinIn * rtp;
  const gross = coinIn - coinOut;
  
  return {
    sasMeters: {
      coinIn: parseFloat(coinIn.toFixed(2)),
      coinOut: parseFloat(coinOut.toFixed(2)),
      jackpot: Math.random() > 0.9 ? parseFloat((Math.random() * 500).toFixed(2)) : 0,
      totalCancelledCredits: parseFloat(coinOut.toFixed(2)),
      gamesPlayed: Math.floor(Math.random() * 1000) + 100,
      gamesWon: Math.floor(Math.random() * 500) + 50,
      currentCredits: parseFloat((Math.random() * 100).toFixed(2)),
      totalWonCredits: parseFloat(coinOut.toFixed(2)),
      drop: parseFloat(gross.toFixed(2)),
    },
    billMeters: {
      dollar5: Math.floor(Math.random() * 50),
      dollar10: Math.floor(Math.random() * 40),
      dollar20: Math.floor(Math.random() * 30),
      dollar50: Math.floor(Math.random() * 10),
      dollar100: Math.floor(Math.random() * 5),
      dollarTotal: parseFloat(coinIn.toFixed(2)),
    },
    collectionMeters: {
      metersIn: Math.floor(coinIn * 100),
      metersOut: Math.floor(coinOut * 100),
    },
  };
};

// Main generation function
const generateTestData = async () => {
  try {
    await connectDB();
    
    const licensees = await getLicensees();
    
    if (licensees.length === 0) {
      console.log('❌ No licensees found in database. Please create licensees first.');
      process.exit(1);
    }

    let totalLocations = 0;
    let totalMachines = 0;
    
    // Generate data for each licensee
    for (const licensee of licensees) {
      const licenseeName = licensee.name || 'Unnamed';
      const licenseeId = licensee._id.toString();
      
      console.log(`\n🏢 Generating data for licensee: ${licenseeName}`);
      console.log('━'.repeat(60));
      
      // Create 5 test locations per licensee
      const locationsToCreate = [];
      const machinesByLocation = {};
      
      for (let i = 1; i <= 5; i++) {
        const locationName = `Test-${licenseeName}-Loc${i}`;
        const locationId = generateMongoId(); // Generate proper hex string ID
        
        const location = {
          _id: locationId,
          name: locationName,
          status: 'active',
          country: countries[Math.floor(Math.random() * countries.length)],
          address: {
            city: `Test City ${i}`,
            street: `${i}00 Test Street`,
            postalCode: `T${i}000`,
          },
          rel: {
            licencee: licenseeId,
          },
          profitShare: 50,
          collectionBalance: 0,
          membershipEnabled: true,
          geoCoords: {
            latitude: 10.5 + Math.random() * 0.5,
            longitude: -61.4 + Math.random() * 0.5,
          },
          gameDayOffset: 8,
          isLocalServer: false,
          deletedAt: new Date(-1),
        };
        
        locationsToCreate.push(location);
        machinesByLocation[locationName] = [];
        
        // Create 10-15 machines per location
        const machineCount = Math.floor(Math.random() * 6) + 10; // 10-15 machines
        
        for (let m = 1; m <= machineCount; m++) {
          const gameType = gameTypes[Math.floor(Math.random() * gameTypes.length)];
          const cabinetType = cabinetTypes[Math.floor(Math.random() * cabinetTypes.length)];
          const meters = generateRandomMeters();
          const machineId = generateMongoId(); // Generate proper hex string ID
          
          const machine = {
            _id: machineId,
            serialNumber: `TEST-${licenseeName.substring(0, 3).toUpperCase()}-${i}-${m}`,
            relayId: `relay${i}${m}${Math.random().toString(36).substring(2, 8)}`,
            // Will set gamingLocation after location is created
            locationPlaceholder: locationName,
            gamingBoard: '',
            smibBoard: '',
            assetStatus: Math.random() > 0.2 ? 'functional' : 'needs_repair',
            game: gameType,
            manuf: gameType.split(' ')[0], // First word as manufacturer
            cabinetType: cabinetType,
            sasVersion: '6.02',
            custom: {
              name: `${licenseeName}-${i}-M${m}`,
            },
            gameType: gameType.toLowerCase().includes('roulette') ? 'roulette' : 'slot',
            ...meters,
            currentSession: '-1',
            isSasMachine: true,
            loggedIn: false,
            lastActivity: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Last 7 days
            deletedAt: new Date(-1),
          };
          
          machinesByLocation[locationName].push(machine);
        }
        
        console.log(`   📍 ${locationName} - ${machineCount} machines planned`);
      }
      
      if (!isDryRun) {
        // Insert locations using raw MongoDB driver to preserve String _id
        console.log(`\n💾 Inserting ${locationsToCreate.length} locations...`);
        const insertResult = await Location.collection.insertMany(locationsToCreate);
        const insertedLocations = locationsToCreate; // Already have the data
        totalLocations += locationsToCreate.length;
        
        // Create location ID map (IDs are already hex strings)
        const locationIdMap = {};
        insertedLocations.forEach(loc => {
          locationIdMap[loc.name] = loc._id; // Already a string, no need for toString()
        });
        
        // Insert machines with correct location IDs
        console.log(`💾 Inserting machines...`);
        let licenseeMachines = 0;
        
        for (const [locationName, machines] of Object.entries(machinesByLocation)) {
          const locationId = locationIdMap[locationName];
          
          // Update machines with actual location ID
          const machinesWithLocationId = machines.map(m => {
            const { locationPlaceholder, ...machineData } = m;
            return {
              ...machineData,
              gamingLocation: locationId,
            };
          });
          
          await Machine.collection.insertMany(machinesWithLocationId);
          licenseeMachines += machinesWithLocationId.length;
          totalMachines += machinesWithLocationId.length;
        }
        
        console.log(`   ✅ Created ${insertedLocations.length} locations`);
        console.log(`   ✅ Created ${licenseeMachines} machines`);
      } else {
        console.log(`\n🔍 DRY RUN - Would create:`);
        console.log(`   - ${locationsToCreate.length} locations`);
        const totalMachinesForLicensee = Object.values(machinesByLocation).reduce((sum, machines) => sum + machines.length, 0);
        console.log(`   - ${totalMachinesForLicensee} machines`);
        totalLocations += locationsToCreate.length;
        totalMachines += totalMachinesForLicensee;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`\n✅ ${isDryRun ? 'DRY RUN' : 'GENERATION'} COMPLETE!`);
    console.log(`📊 Summary:`);
    console.log(`   - Licensees: ${licensees.length}`);
    console.log(`   - ${isDryRun ? 'Would create' : 'Created'} ${totalLocations} locations`);
    console.log(`   - ${isDryRun ? 'Would create' : 'Created'} ${totalMachines} machines`);
    console.log(`   - Average machines per location: ${(totalMachines / totalLocations).toFixed(1)}`);
    
    if (isDryRun) {
      console.log('\n💡 Run without --dry-run flag to actually create data');
    } else {
      console.log('\n🎉 All test data created successfully!');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB\n');
  }
};

// Run the script
if (require.main === module) {
  generateTestData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { generateTestData };

