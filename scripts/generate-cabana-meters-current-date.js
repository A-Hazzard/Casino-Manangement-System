require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const CABANA_LOCATION_ID = '691142e37f88af78f4193b6d';
const GAMING_DAY_OFFSET_HOURS = 8; // 8 AM

// Generate a 24-char hex string ID
function generateId() {
  return new ObjectId().toHexString();
}

// Get gaming day boundaries for a specific date offset
function getGamingDayBoundaries(daysAgo = 0) {
  const now = new Date();
  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() - daysAgo);
  
  // Set to 8 AM of the target date
  const gamingDayStart = new Date(targetDate);
  gamingDayStart.setHours(GAMING_DAY_OFFSET_HOURS, 0, 0, 0);
  
  // Gaming day ends at 8 AM next day
  const gamingDayEnd = new Date(gamingDayStart);
  gamingDayEnd.setDate(gamingDayEnd.getDate() + 1);
  
  return { start: gamingDayStart, end: gamingDayEnd };
}

// Machine meter patterns by time period
const METER_PATTERNS = {
  // CABANA-001 (Lucky Dragon) - High traffic
  '691142e37f88af78f4193b6e': {
    today: { coinIn: 15000, coinOut: 12000, drop: 150 },
    yesterday: { coinIn: 18000, coinOut: 14000, drop: 180 },
    day2: { coinIn: 16000, coinOut: 13000, drop: 160 },
    day3: { coinIn: 17000, coinOut: 13500, drop: 170 },
    day4: { coinIn: 19000, coinOut: 15000, drop: 190 },
    day5: { coinIn: 14000, coinOut: 11000, drop: 140 },
    day6: { coinIn: 16500, coinOut: 13500, drop: 165 },
    day7: { coinIn: 15500, coinOut: 12500, drop: 155 },
    day8: { coinIn: 17500, coinOut: 14500, drop: 175 },
    day9: { coinIn: 16000, coinOut: 13000, drop: 160 },
    day10: { coinIn: 18500, coinOut: 15000, drop: 185 },
    day15: { coinIn: 16000, coinOut: 13000, drop: 160 },
    day20: { coinIn: 17000, coinOut: 14000, drop: 170 },
    day25: { coinIn: 15500, coinOut: 12500, drop: 155 },
    day30: { coinIn: 18000, coinOut: 14500, drop: 180 },
  },
  // CABANA-002 (Phoenix Rising) - Growing trend
  '691142e37f88af78f4193b6f': {
    today: { coinIn: 8000, coinOut: 7000, drop: 80 },
    yesterday: { coinIn: 7500, coinOut: 6500, drop: 75 },
    day2: { coinIn: 7000, coinOut: 6000, drop: 70 },
    day3: { coinIn: 6500, coinOut: 5500, drop: 65 },
    day4: { coinIn: 6000, coinOut: 5000, drop: 60 },
    day5: { coinIn: 5500, coinOut: 4500, drop: 55 },
    day6: { coinIn: 5000, coinOut: 4000, drop: 50 },
    day7: { coinIn: 4500, coinOut: 3500, drop: 45 },
    day8: { coinIn: 4000, coinOut: 3000, drop: 40 },
    day9: { coinIn: 3500, coinOut: 2500, drop: 35 },
    day10: { coinIn: 3000, coinOut: 2000, drop: 30 },
    day15: { coinIn: 2500, coinOut: 1800, drop: 25 },
    day20: { coinIn: 2000, coinOut: 1500, drop: 20 },
    day25: { coinIn: 1500, coinOut: 1200, drop: 15 },
    day30: { coinIn: 1000, coinOut: 900, drop: 10 },
  },
  // CABANA-003 (Ocean Treasure) - Weekend spike pattern
  '691142e37f88af78f4193b70': {
    today: { coinIn: 3000, coinOut: 2800, drop: 30 },      // Sunday (if today is Sunday)
    yesterday: { coinIn: 12000, coinOut: 10000, drop: 120 }, // Saturday
    day2: { coinIn: 15000, coinOut: 12000, drop: 150 },     // Friday
    day3: { coinIn: 4000, coinOut: 3500, drop: 40 },        // Thursday
    day4: { coinIn: 3500, coinOut: 3000, drop: 35 },        // Wednesday
    day5: { coinIn: 3000, coinOut: 2500, drop: 30 },        // Tuesday
    day6: { coinIn: 2500, coinOut: 2000, drop: 25 },        // Monday
    day7: { coinIn: 11000, coinOut: 9000, drop: 110 },      // Sunday (last week)
    day8: { coinIn: 13000, coinOut: 10500, drop: 130 },     // Saturday (last week)
    day9: { coinIn: 3800, coinOut: 3300, drop: 38 },
    day10: { coinIn: 3200, coinOut: 2700, drop: 32 },
    day15: { coinIn: 3500, coinOut: 3000, drop: 35 },
    day20: { coinIn: 4000, coinOut: 3500, drop: 40 },
    day25: { coinIn: 3000, coinOut: 2500, drop: 30 },
    day30: { coinIn: 3500, coinOut: 3000, drop: 35 },
  },
  // CABANA-004 (Wild West) - Steady traffic
  '691142e37f88af78f4193b71': {
    today: { coinIn: 10000, coinOut: 9000, drop: 100 },
    yesterday: { coinIn: 10500, coinOut: 9500, drop: 105 },
    day2: { coinIn: 9800, coinOut: 8800, drop: 98 },
    day3: { coinIn: 10200, coinOut: 9200, drop: 102 },
    day4: { coinIn: 9900, coinOut: 8900, drop: 99 },
    day5: { coinIn: 10100, coinOut: 9100, drop: 101 },
    day6: { coinIn: 10300, coinOut: 9300, drop: 103 },
    day7: { coinIn: 9700, coinOut: 8700, drop: 97 },
    day8: { coinIn: 10400, coinOut: 9400, drop: 104 },
    day9: { coinIn: 9900, coinOut: 8900, drop: 99 },
    day10: { coinIn: 10100, coinOut: 9100, drop: 101 },
    day15: { coinIn: 10200, coinOut: 9200, drop: 102 },
    day20: { coinIn: 9800, coinOut: 8800, drop: 98 },
    day25: { coinIn: 10000, coinOut: 9000, drop: 100 },
    day30: { coinIn: 10300, coinOut: 9300, drop: 103 },
  },
  // CABANA-005 (Mystic Moon) - New machine, ramping up
  '691142e37f88af78f4193b72': {
    today: { coinIn: 12000, coinOut: 10000, drop: 120 },
    yesterday: { coinIn: 10000, coinOut: 8500, drop: 100 },
    day2: { coinIn: 8000, coinOut: 7000, drop: 80 },
    day3: { coinIn: 6000, coinOut: 5000, drop: 60 },
    day4: { coinIn: 4000, coinOut: 3500, drop: 40 },
    day5: { coinIn: 2000, coinOut: 1800, drop: 20 },
    day6: { coinIn: 1000, coinOut: 900, drop: 10 },
    day7: { coinIn: 500, coinOut: 450, drop: 5 },
    day8: { coinIn: 200, coinOut: 180, drop: 2 },
    day9: { coinIn: 100, coinOut: 90, drop: 1 },
    day10: { coinIn: 50, coinOut: 45, drop: 1 },
    day15: { coinIn: 0, coinOut: 0, drop: 0 },
    day20: { coinIn: 0, coinOut: 0, drop: 0 },
    day25: { coinIn: 0, coinOut: 0, drop: 0 },
    day30: { coinIn: 0, coinOut: 0, drop: 0 },
  },
};

async function generateCabanaMeters() {
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('\n=== GENERATING CABANA METERS FOR CURRENT DATE ===\n');
    console.log('Current time:', new Date().toISOString());
    console.log('Gaming day offset: 8:00 AM\n');
    
    // Delete existing meters for Cabana location
    console.log('Step 1: Clearing existing Cabana meters...');
    const deleteResult = await db.collection('meters').deleteMany({
      location: CABANA_LOCATION_ID
    });
    console.log(`✅ Deleted ${deleteResult.deletedCount} existing meters\n`);
    
    // Get all Cabana machines
    const machines = await db.collection('machines').find({
      gamingLocation: CABANA_LOCATION_ID
    }).toArray();
    
    console.log(`Found ${machines.length} machines:\n`);
    machines.forEach(m => {
      console.log(`  - ${m.serialNumber} (${m._id})`);
    });
    
    // Time periods to generate (in days ago)
    const periods = [
      { name: 'today', daysAgo: 0 },
      { name: 'yesterday', daysAgo: 1 },
      { name: 'day2', daysAgo: 2 },
      { name: 'day3', daysAgo: 3 },
      { name: 'day4', daysAgo: 4 },
      { name: 'day5', daysAgo: 5 },
      { name: 'day6', daysAgo: 6 },
      { name: 'day7', daysAgo: 7 },
      { name: 'day8', daysAgo: 8 },
      { name: 'day9', daysAgo: 9 },
      { name: 'day10', daysAgo: 10 },
      { name: 'day15', daysAgo: 15 },
      { name: 'day20', daysAgo: 20 },
      { name: 'day25', daysAgo: 25 },
      { name: 'day30', daysAgo: 30 },
    ];
    
    console.log('\nStep 2: Generating meters for 31 days...\n');
    
    let totalMetersCreated = 0;
    const metersByPeriod = {};
    
    for (const period of periods) {
      const { start, end } = getGamingDayBoundaries(period.daysAgo);
      
      console.log(`${period.name.toUpperCase()} (${start.toISOString().split('T')[0]}):`);
      
      let periodCount = 0;
      
      for (const machine of machines) {
        const pattern = METER_PATTERNS[machine._id]?.[period.name];
        
        if (!pattern || (pattern.coinIn === 0 && pattern.coinOut === 0 && pattern.drop === 0)) {
          // Skip if no pattern or all zeros
          continue;
        }
        
        // Generate 4-6 meter readings throughout the gaming day
        const numReadings = Math.floor(Math.random() * 3) + 4; // 4-6 readings
        
        for (let r = 0; r < numReadings; r++) {
          const meterId = generateId();
          
          // Distribute readings throughout the gaming day (8 AM to 8 AM next day)
          const hourOffset = Math.floor((r / numReadings) * 24);
          const readingTimestamp = new Date(start.getTime() + hourOffset * 60 * 60 * 1000);
          
          // Progressive meter values throughout the day
          const progress = (r + 1) / numReadings;
          const coinIn = Math.floor(pattern.coinIn * progress);
          const coinOut = Math.floor(pattern.coinOut * progress);
          const drop = Math.floor(pattern.drop * progress);
          
          const meter = {
            _id: meterId,
            machine: machine._id,
            location: CABANA_LOCATION_ID,
            timestamp: readingTimestamp,
            sasMeters: {
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
          periodCount++;
          totalMetersCreated++;
        }
      }
      
      metersByPeriod[period.name] = periodCount;
      console.log(`  ✅ ${periodCount} meters created`);
    }
    
    console.log('\n=== GENERATION COMPLETE ===');
    console.log(`Total meters created: ${totalMetersCreated}\n`);
    
    console.log('Meters by period:');
    Object.entries(metersByPeriod).forEach(([period, count]) => {
      console.log(`  ${period}: ${count} meters`);
    });
    
    console.log('\n=== EXPECTED TOTALS (BBD) ===\n');
    
    // Calculate expected totals
    const totals = {
      today: { moneyIn: 0, moneyOut: 0, gross: 0 },
      yesterday: { moneyIn: 0, moneyOut: 0, gross: 0 },
      last7Days: { moneyIn: 0, moneyOut: 0, gross: 0 },
      last30Days: { moneyIn: 0, moneyOut: 0, gross: 0 },
    };
    
    // Today
    Object.values(METER_PATTERNS).forEach(patterns => {
      if (patterns.today) {
        totals.today.moneyIn += patterns.today.coinIn;
        totals.today.moneyOut += patterns.today.coinOut;
      }
    });
    totals.today.gross = totals.today.moneyIn - totals.today.moneyOut;
    
    // Yesterday
    Object.values(METER_PATTERNS).forEach(patterns => {
      if (patterns.yesterday) {
        totals.yesterday.moneyIn += patterns.yesterday.coinIn;
        totals.yesterday.moneyOut += patterns.yesterday.coinOut;
      }
    });
    totals.yesterday.gross = totals.yesterday.moneyIn - totals.yesterday.moneyOut;
    
    // Last 7 days (today + 6 previous days)
    ['today', 'yesterday', 'day2', 'day3', 'day4', 'day5', 'day6'].forEach(day => {
      Object.values(METER_PATTERNS).forEach(patterns => {
        if (patterns[day]) {
          totals.last7Days.moneyIn += patterns[day].coinIn;
          totals.last7Days.moneyOut += patterns[day].coinOut;
        }
      });
    });
    totals.last7Days.gross = totals.last7Days.moneyIn - totals.last7Days.moneyOut;
    
    // Last 30 days (all periods)
    periods.forEach(period => {
      Object.values(METER_PATTERNS).forEach(patterns => {
        if (patterns[period.name]) {
          totals.last30Days.moneyIn += patterns[period.name].coinIn;
          totals.last30Days.moneyOut += patterns[period.name].coinOut;
        }
      });
    });
    totals.last30Days.gross = totals.last30Days.moneyIn - totals.last30Days.moneyOut;
    
    console.log('TODAY:');
    console.log(`  Money In: ${totals.today.moneyIn.toLocaleString()} BBD`);
    console.log(`  Money Out: ${totals.today.moneyOut.toLocaleString()} BBD`);
    console.log(`  Gross: ${totals.today.gross.toLocaleString()} BBD\n`);
    
    console.log('YESTERDAY:');
    console.log(`  Money In: ${totals.yesterday.moneyIn.toLocaleString()} BBD`);
    console.log(`  Money Out: ${totals.yesterday.moneyOut.toLocaleString()} BBD`);
    console.log(`  Gross: ${totals.yesterday.gross.toLocaleString()} BBD\n`);
    
    console.log('LAST 7 DAYS:');
    console.log(`  Money In: ${totals.last7Days.moneyIn.toLocaleString()} BBD`);
    console.log(`  Money Out: ${totals.last7Days.moneyOut.toLocaleString()} BBD`);
    console.log(`  Gross: ${totals.last7Days.gross.toLocaleString()} BBD\n`);
    
    console.log('LAST 30 DAYS:');
    console.log(`  Money In: ${totals.last30Days.moneyIn.toLocaleString()} BBD`);
    console.log(`  Money Out: ${totals.last30Days.moneyOut.toLocaleString()} BBD`);
    console.log(`  Gross: ${totals.last30Days.gross.toLocaleString()} BBD\n`);
    
    console.log('✅ All meters generated successfully!');
    console.log('Login as mkirton and test all time period filters.');
    
  } catch (error) {
    console.error('Error generating meters:', error);
  } finally {
    await client.close();
  }
}

generateCabanaMeters().catch(console.error);

