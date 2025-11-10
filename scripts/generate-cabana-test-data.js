require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

// Cabana licensee ID (existing)
const CABANA_LICENSEE_ID = 'c03b094083226f216b3fc39c';

// Generate a 24-char hex string ID (mimics ObjectId but as string)
function generateId() {
  return new ObjectId().toHexString();
}

// Gaming day offset (8 AM)
const GAMING_DAY_OFFSET_HOURS = 8;

// Helper to get gaming day boundaries
function getGamingDayBoundaries(daysAgo = 0) {
  const now = new Date();
  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() - daysAgo);
  
  const gamingDayStart = new Date(targetDate);
  gamingDayStart.setHours(GAMING_DAY_OFFSET_HOURS, 0, 0, 0);
  
  const gamingDayEnd = new Date(gamingDayStart);
  gamingDayEnd.setDate(gamingDayEnd.getDate() + 1);
  
  return { start: gamingDayStart, end: gamingDayEnd };
}

// Machine configurations with realistic meter patterns
const MACHINES = [
  {
    serialNumber: 'CABANA-001',
    custom: { name: 'Lucky Dragon' },
    game: 'Dragon Gold',
    gameType: 'Slot',
    smibBoard: 'cab001aabbcc',
    // High traffic machine - consistent activity
    meterPatterns: {
      today: { coinIn: 15000, coinOut: 12000, drop: 150 },
      yesterday: { coinIn: 18000, coinOut: 14000, drop: 180 },
      twoDaysAgo: { coinIn: 16000, coinOut: 13000, drop: 160 },
      threeDaysAgo: { coinIn: 17000, coinOut: 13500, drop: 170 },
      fourDaysAgo: { coinIn: 19000, coinOut: 15000, drop: 190 },
      fiveDaysAgo: { coinIn: 14000, coinOut: 11000, drop: 140 },
      sixDaysAgo: { coinIn: 16500, coinOut: 13500, drop: 165 },
    }
  },
  {
    serialNumber: 'CABANA-002',
    custom: { name: 'Phoenix Rising' },
    game: 'Fire Phoenix',
    gameType: 'Slot',
    smibBoard: 'cab002ddeeff',
    // Medium traffic - growing trend
    meterPatterns: {
      today: { coinIn: 8000, coinOut: 7000, drop: 80 },
      yesterday: { coinIn: 7500, coinOut: 6500, drop: 75 },
      twoDaysAgo: { coinIn: 7000, coinOut: 6000, drop: 70 },
      threeDaysAgo: { coinIn: 6500, coinOut: 5500, drop: 65 },
      fourDaysAgo: { coinIn: 6000, coinOut: 5000, drop: 60 },
      fiveDaysAgo: { coinIn: 5500, coinOut: 4500, drop: 55 },
      sixDaysAgo: { coinIn: 5000, coinOut: 4000, drop: 50 },
    }
  },
  {
    serialNumber: 'CABANA-003',
    custom: { name: 'Ocean Treasure' },
    game: 'Dolphin Bay',
    gameType: 'Slot',
    smibBoard: 'cab003112233',
    // Low traffic - weekend spike
    meterPatterns: {
      today: { coinIn: 3000, coinOut: 2800, drop: 30 }, // Monday
      yesterday: { coinIn: 12000, coinOut: 10000, drop: 120 }, // Sunday (high)
      twoDaysAgo: { coinIn: 15000, coinOut: 12000, drop: 150 }, // Saturday (high)
      threeDaysAgo: { coinIn: 4000, coinOut: 3500, drop: 40 }, // Friday
      fourDaysAgo: { coinIn: 3500, coinOut: 3000, drop: 35 }, // Thursday
      fiveDaysAgo: { coinIn: 3000, coinOut: 2500, drop: 30 }, // Wednesday
      sixDaysAgo: { coinIn: 2500, coinOut: 2000, drop: 25 }, // Tuesday
    }
  },
  {
    serialNumber: 'CABANA-004',
    custom: { name: 'Wild West' },
    game: 'Gold Rush',
    gameType: 'Slot',
    smibBoard: 'cab004445566',
    // Steady traffic - minimal variance
    meterPatterns: {
      today: { coinIn: 10000, coinOut: 9000, drop: 100 },
      yesterday: { coinIn: 10500, coinOut: 9500, drop: 105 },
      twoDaysAgo: { coinIn: 9800, coinOut: 8800, drop: 98 },
      threeDaysAgo: { coinIn: 10200, coinOut: 9200, drop: 102 },
      fourDaysAgo: { coinIn: 9900, coinOut: 8900, drop: 99 },
      fiveDaysAgo: { coinIn: 10100, coinOut: 9100, drop: 101 },
      sixDaysAgo: { coinIn: 10300, coinOut: 9300, drop: 103 },
    }
  },
  {
    serialNumber: 'CABANA-005',
    custom: { name: 'Mystic Moon' },
    game: 'Lunar Fortune',
    gameType: 'Slot',
    smibBoard: 'cab005778899',
    // New machine - ramping up
    meterPatterns: {
      today: { coinIn: 12000, coinOut: 10000, drop: 120 },
      yesterday: { coinIn: 10000, coinOut: 8500, drop: 100 },
      twoDaysAgo: { coinIn: 8000, coinOut: 7000, drop: 80 },
      threeDaysAgo: { coinIn: 6000, coinOut: 5000, drop: 60 },
      fourDaysAgo: { coinIn: 4000, coinOut: 3500, drop: 40 },
      fiveDaysAgo: { coinIn: 2000, coinOut: 1800, drop: 20 },
      sixDaysAgo: { coinIn: 1000, coinOut: 900, drop: 10 },
    }
  }
];

async function generateCabanaData() {
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('\n=== GENERATING CABANA TEST DATA ===\n');
    
    // Step 1: Create location
    console.log('Step 1: Creating Cabana test location...');
    const locationId = generateId();
    const location = {
      _id: locationId,
      name: 'Cabana Paradise Casino',
      status: 'active',
      profitShare: 50,
      collectionBalance: 0,
      country: 'be622340d9d8384087937ff6', // Existing country
      address: {
        city: 'Bridgetown',
        street: '123 Paradise Lane',
        zip: 'BB11000'
      },
      rel: {
        licencee: CABANA_LICENSEE_ID
      },
      membershipEnabled: true,
      locationMembershipSettings: {
        locationLimit: 10000,
        freePlayAmount: 100,
        enablePoints: true,
        enableFreePlays: true,
        pointsRatioMethod: 'wager',
        wagerRatio: 10,
        pointMethodValue: 10,
        pointsMethodGameTypes: ['slot'],
        freePlayGameTypes: ['slot'],
        freePlayCreditsTimeout: 86400
      },
      billValidatorOptions: {
        denom1: false,
        denom2: true,
        denom5: true,
        denom10: true,
        denom20: true,
        denom50: true,
        denom100: true,
        denom200: false,
        denom500: false,
        denom1000: false,
        denom2000: false,
        denom5000: false,
        denom10000: false
      },
      gameDayOffset: 8,
      isLocalServer: false,
      geoCoords: {
        latitude: 13.1939,
        longitude: -59.5432
      },
      deletedAt: new Date(-1),
      statusHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      __v: 0
    };
    
    await db.collection('gaminglocations').insertOne(location);
    console.log(`✅ Created location: ${location.name} (${locationId})`);
    
    // Step 2: Create machines
    console.log('\nStep 2: Creating 5 machines...');
    const machineIds = [];
    
    for (const machineConfig of MACHINES) {
      const machineId = generateId();
      machineIds.push({ id: machineId, config: machineConfig });
      
      const machine = {
        _id: machineId,
        serialNumber: machineConfig.serialNumber,
        custom: machineConfig.custom,
        game: machineConfig.game,
        gameType: machineConfig.gameType,
        gamingLocation: locationId,
        smibBoard: machineConfig.smibBoard,
        relayId: machineConfig.smibBoard,
        isSasMachine: true,
        sasVersion: '6.02',
        machineType: 'Gaming',
        machineStatus: 'Active',
        assetStatus: 'functional',
        cabinetType: 'Standing',
        loggedIn: false,
        billValidator: {
          balance: 0,
          notes: []
        },
        config: {
          enableRte: false,
          lockMachine: false,
          lockBvOnLogOut: false
        },
        playableBalance: 0,
        balances: {
          cashable: 0
        },
        curProcess: {
          name: '',
          next: ''
        },
        tasks: {
          pendingHandpay: {
            name: '',
            steps: [],
            currentStepIndex: 0,
            retryAttempts: 0
          }
        },
        sasMeters: {
          coinIn: 0,
          coinOut: 0,
          jackpot: 0,
          totalHandPaidCancelledCredits: 0,
          totalCancelledCredits: 0,
          gamesPlayed: 0,
          gamesWon: 0,
          currentCredits: 0,
          totalWonCredits: 0,
          drop: 0
        },
        billMeters: {
          dollar1: 0,
          dollar2: 0,
          dollar5: 0,
          dollar10: 0,
          dollar20: 0,
          dollar50: 0,
          dollar100: 0,
          dollar500: 0,
          dollar1000: 0,
          dollar2000: 0,
          dollar5000: 0,
          dollar10000: 0,
          dollarTotal: 0,
          dollarTotalUnknown: 0
        },
        gameConfig: {
          accountingDenomination: 0.1,
          additionalId: '',
          gameOptions: '',
          maxBet: '',
          payTableId: '',
          progressiveGroup: '',
          theoreticalRtp: 0
        },
        collectionMeters: {
          metersIn: 0,
          metersOut: 0
        },
        collectionMetersHistory: [],
        lastActivity: new Date(),
        lastSasMeterAt: new Date(),
        lastBillMeterAt: new Date(),
        lastMaintenanceDate: new Date(),
        nextMaintenanceDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        maintenanceHistory: [],
        collectorDenomination: 2, // BBD
        deletedAt: new Date(-1),
        createdAt: new Date(),
        updatedAt: new Date(),
        __v: 0
      };
      
      await db.collection('machines').insertOne(machine);
      console.log(`  ✅ ${machineConfig.serialNumber} (${machineConfig.custom.name}) - ${machineId}`);
    }
    
    // Step 3: Generate meters for last 7 days
    console.log('\nStep 3: Generating meters for last 7 days...');
    const periods = ['today', 'yesterday', 'twoDaysAgo', 'threeDaysAgo', 'fourDaysAgo', 'fiveDaysAgo', 'sixDaysAgo'];
    const meterCounts = { today: 0, yesterday: 0, twoDaysAgo: 0, threeDaysAgo: 0, fourDaysAgo: 0, fiveDaysAgo: 0, sixDaysAgo: 0 };
    
    for (let i = 0; i < periods.length; i++) {
      const period = periods[i];
      const { start, end } = getGamingDayBoundaries(i);
      const meterTimestamp = new Date(start.getTime() + 8 * 60 * 60 * 1000); // 4 PM same day
      
      for (const { id, config } of machineIds) {
        const pattern = config.meterPatterns[period];
        
        // Generate 3-5 meter readings per day
        const numReadings = Math.floor(Math.random() * 3) + 3; // 3-5 readings
        
        for (let r = 0; r < numReadings; r++) {
          const meterId = generateId();
          const readingTimestamp = new Date(start.getTime() + (r * 3 * 60 * 60 * 1000)); // Every 3 hours
          
          // Progressive meter values throughout the day
          const progress = (r + 1) / numReadings;
          const coinIn = Math.floor(pattern.coinIn * progress);
          const coinOut = Math.floor(pattern.coinOut * progress);
          const drop = Math.floor(pattern.drop * progress);
          
          const meter = {
            _id: meterId,
            machine: id,
            location: locationId,
            timestamp: readingTimestamp,
            sasMeters: {
              coinIn,
              coinOut,
              jackpot: 0,
              totalHandPaidCancelledCredits: 0,
              totalCancelledCredits: 0,
              gamesPlayed: Math.floor(coinIn / 10), // Avg 10 credits per game
              gamesWon: Math.floor(coinOut / 15), // Avg 15 credits per win
              currentCredits: 0,
              totalWonCredits: coinOut,
              drop
            },
            billMeters: {
              dollar2: Math.floor(drop * 0.1),
              dollar5: Math.floor(drop * 0.2),
              dollar10: Math.floor(drop * 0.3),
              dollar20: Math.floor(drop * 0.25),
              dollar50: Math.floor(drop * 0.1),
              dollar100: Math.floor(drop * 0.05),
              dollarTotal: drop,
              dollarTotalUnknown: 0
            },
            createdAt: readingTimestamp,
            updatedAt: readingTimestamp,
            __v: 0
          };
          
          await db.collection('meters').insertOne(meter);
          meterCounts[period]++;
        }
      }
      
      console.log(`  ✅ ${period}: ${meterCounts[period]} meters`);
    }
    
    // Step 4: Summary
    console.log('\n=== GENERATION COMPLETE ===');
    const totalMeters = Object.values(meterCounts).reduce((a, b) => a + b, 0);
    console.log(`Location: ${location.name} (${locationId})`);
    console.log(`Machines: ${machineIds.length}`);
    console.log(`Total Meters: ${totalMeters}`);
    console.log(`\nLicensee: Cabana (${CABANA_LICENSEE_ID})`);
    console.log(`Currency: BBD (Barbadian Dollar)`);
    console.log(`Gaming Day Offset: 8 AM`);
    
    console.log('\n✅ Data generation complete!');
    console.log('See CABANA_TEST_DATA_EXPECTED_RESULTS.md for expected calculations.');
    
  } catch (error) {
    console.error('Error generating data:', error);
  } finally {
    await client.close();
  }
}

generateCabanaData().catch(console.error);

