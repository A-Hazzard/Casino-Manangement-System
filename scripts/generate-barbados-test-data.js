require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

// Barbados licensee ID (existing)
const BARBADOS_LICENSEE_ID = '732b094083226f216b3fc11a';
const GAMING_DAY_OFFSET_HOURS = 8; // 8 AM

function generateId() {
  return new ObjectId().toHexString();
}

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

// Machine configurations for Barbados
const MACHINES = [
  {
    serialNumber: 'BBD-001',
    custom: { name: 'Island Fortune' },
    game: 'Caribbean Gold',
    gameType: 'Slot',
    smibBoard: 'bbd001aabbcc',
    // Very high traffic - premium machine
    meterPatterns: {
      today: { coinIn: 25000, coinOut: 20000, drop: 250 },
      yesterday: { coinIn: 28000, coinOut: 22000, drop: 280 },
    }
  },
  {
    serialNumber: 'BBD-002',
    custom: { name: 'Tropical Wins' },
    game: 'Beach Party',
    gameType: 'Slot',
    smibBoard: 'bbd002ddeeff',
    // High traffic - popular machine
    meterPatterns: {
      today: { coinIn: 18000, coinOut: 15000, drop: 180 },
      yesterday: { coinIn: 20000, coinOut: 16000, drop: 200 },
    }
  },
  {
    serialNumber: 'BBD-003',
    custom: { name: 'Coral Reef' },
    game: 'Ocean Magic',
    gameType: 'Slot',
    smibBoard: 'bbd003112233',
    // Medium-high traffic
    meterPatterns: {
      today: { coinIn: 14000, coinOut: 11000, drop: 140 },
      yesterday: { coinIn: 16000, coinOut: 13000, drop: 160 },
    }
  },
  {
    serialNumber: 'BBD-004',
    custom: { name: 'Sunset Paradise' },
    game: 'Golden Sunset',
    gameType: 'Slot',
    smibBoard: 'bbd004445566',
    // Medium traffic
    meterPatterns: {
      today: { coinIn: 11000, coinOut: 9500, drop: 110 },
      yesterday: { coinIn: 13000, coinOut: 11000, drop: 130 },
    }
  },
  {
    serialNumber: 'BBD-005',
    custom: { name: 'Palm Jackpot' },
    game: 'Tropical Treasure',
    gameType: 'Slot',
    smibBoard: 'bbd005778899',
    // Moderate traffic
    meterPatterns: {
      today: { coinIn: 9000, coinOut: 7500, drop: 90 },
      yesterday: { coinIn: 10000, coinOut: 8500, drop: 100 },
    }
  }
];

async function generateBarbadosData() {
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('\n=== GENERATING BARBADOS TEST DATA ===\n');
    
    // Step 1: Create location
    console.log('Step 1: Creating Barbados test location...');
    const locationId = generateId();
    const location = {
      _id: locationId,
      name: 'Barbados Royal Resort Casino',
      status: 'active',
      profitShare: 50,
      collectionBalance: 0,
      country: 'be622340d9d8384087937ff6',
      address: {
        city: 'Bridgetown',
        street: '456 Royal Avenue',
        zip: 'BB15000'
      },
      rel: {
        licencee: BARBADOS_LICENSEE_ID
      },
      membershipEnabled: true,
      locationMembershipSettings: {
        locationLimit: 15000,
        freePlayAmount: 150,
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
        latitude: 13.0969,
        longitude: -59.6145
      },
      deletedAt: new Date(-1),
      statusHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      __v: 0
    };
    
    await db.collection('gaminglocations').insertOne(location);
    console.log(`✅ Created location: ${location.name} (${locationId})\n`);
    
    // Step 2: Create machines
    console.log('Step 2: Creating 5 machines...');
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
        nextMaintenanceDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
    
    // Step 3: Generate meters for today and yesterday with movement field
    console.log('\nStep 3: Generating meters for today and yesterday...\n');
    
    const periods = [
      { name: 'today', daysAgo: 0 },
      { name: 'yesterday', daysAgo: 1 }
    ];
    
    let totalCreated = 0;
    
    for (const period of periods) {
      const { start } = getGamingDayBoundaries(period.daysAgo);
      console.log(`${period.name.toUpperCase()} (${start.toISOString().split('T')[0]}):`);
      
      for (const { id, config } of machineIds) {
        const pattern = config.meterPatterns[period.name];
        
        const numReadings = 5;
        for (let r = 0; r < numReadings; r++) {
          const hourOffset = Math.floor((r / numReadings) * 24);
          const readingTimestamp = new Date(start.getTime() + hourOffset * 60 * 60 * 1000);
          
          const progress = (r + 1) / numReadings;
          const coinIn = Math.floor(pattern.coinIn * progress);
          const coinOut = Math.floor(pattern.coinOut * progress);
          const drop = Math.floor(pattern.drop * progress);
          
          const movement = {
            coinIn,
            coinOut,
            jackpot: 0,
            totalHandPaidCancelledCredits: 0,
            totalCancelledCredits: 0,
            gamesPlayed: Math.floor(coinIn / 10),
            gamesWon: Math.floor(coinOut / 15),
            currentCredits: 0,
            totalWonCredits: coinOut,
            drop
          };
          
          const meter = {
            _id: generateId(),
            machine: id,
            location: locationId,
            timestamp: readingTimestamp,
            readAt: readingTimestamp, // CRITICAL: Add readAt field for API queries
            movement, // CRITICAL: Add movement field for aggregation
            // Also add top-level fields
            coinIn: movement.coinIn,
            coinOut: movement.coinOut,
            jackpot: movement.jackpot,
            totalHandPaidCancelledCredits: movement.totalHandPaidCancelledCredits,
            totalCancelledCredits: movement.totalCancelledCredits,
            gamesPlayed: movement.gamesPlayed,
            gamesWon: movement.gamesWon,
            currentCredits: movement.currentCredits,
            totalWonCredits: movement.totalWonCredits,
            drop: movement.drop,
            sasMeters: {
              coinIn: movement.coinIn,
              coinOut: movement.coinOut,
              jackpot: movement.jackpot,
              totalHandPaidCancelledCredits: movement.totalHandPaidCancelledCredits,
              totalCancelledCredits: movement.totalCancelledCredits,
              gamesPlayed: movement.gamesPlayed,
              gamesWon: movement.gamesWon,
              currentCredits: movement.currentCredits,
              totalWonCredits: movement.totalWonCredits,
              drop: movement.drop
            },
            billMeters: {
              dollar1: 0,
              dollar2: Math.floor(drop * 0.1),
              dollar5: Math.floor(drop * 0.2),
              dollar10: Math.floor(drop * 0.3),
              dollar20: Math.floor(drop * 0.25),
              dollar50: Math.floor(drop * 0.1),
              dollar100: Math.floor(drop * 0.05),
              dollar500: 0,
              dollar1000: 0,
              dollar2000: 0,
              dollar5000: 0,
              dollar10000: 0,
              dollarTotal: drop,
              dollarTotalUnknown: 0
            },
            createdAt: readingTimestamp,
            updatedAt: readingTimestamp,
            __v: 0
          };
          
          await db.collection('meters').insertOne(meter);
          totalCreated++;
        }
      }
      
      console.log(`  ✅ ${totalCreated - (period.daysAgo === 0 ? 0 : 25)} meters created`);
    }
    
    console.log('\n=== GENERATION COMPLETE ===');
    console.log(`Location: ${location.name} (${locationId})`);
    console.log(`Machines: ${machineIds.length}`);
    console.log(`Total Meters: ${totalCreated}`);
    console.log(`Licensee: Barbados (${BARBADOS_LICENSEE_ID})`);
    console.log(`Currency: BBD (Barbadian Dollar)`);
    
    console.log('\n=== EXPECTED TOTALS (BBD) ===\n');
    
    const todayTotal = MACHINES.reduce((sum, m) => sum + m.meterPatterns.today.coinIn, 0);
    const yesterdayTotal = MACHINES.reduce((sum, m) => sum + m.meterPatterns.yesterday.coinIn, 0);
    
    console.log('TODAY:');
    console.log(`  Money In: ${todayTotal.toLocaleString()} BBD`);
    console.log(`  Gross: ${todayTotal.toLocaleString()} BBD (approx)\n`);
    
    console.log('YESTERDAY:');
    console.log(`  Money In: ${yesterdayTotal.toLocaleString()} BBD`);
    console.log(`  Gross: ${yesterdayTotal.toLocaleString()} BBD (approx)\n`);
    
    console.log('✅ Data generation complete!');
    console.log('Change mkirton to Barbados licensee and test.');
    
  } catch (error) {
    console.error('Error generating data:', error);
  } finally {
    await client.close();
  }
}

generateBarbadosData().catch(console.error);

