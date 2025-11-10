require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const CABANA_LOCATION_ID = '691142e37f88af78f4193b6d';
const GAMING_DAY_OFFSET_HOURS = 8; // 8 AM

function generateId() {
  return new ObjectId().toHexString();
}

// Get gaming day boundaries - FIXED to use calendar date, not offset
function getGamingDayBoundaries(daysAgo = 0) {
  const now = new Date();
  
  // Get the calendar date (not gaming day)
  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() - daysAgo);
  
  // Gaming day for this calendar date starts at 8 AM
  const gamingDayStart = new Date(targetDate);
  gamingDayStart.setHours(GAMING_DAY_OFFSET_HOURS, 0, 0, 0);
  
  // And ends at 8 AM the next calendar day
  const gamingDayEnd = new Date(gamingDayStart);
  gamingDayEnd.setDate(gamingDayEnd.getDate() + 1);
  
  return { start: gamingDayStart, end: gamingDayEnd };
}

// Machine meter patterns
const METER_PATTERNS = {
  '691142e37f88af78f4193b6e': { // CABANA-001
    today: { coinIn: 15000, coinOut: 12000, drop: 150 },
    yesterday: { coinIn: 18000, coinOut: 14000, drop: 180 },
  },
  '691142e37f88af78f4193b6f': { // CABANA-002
    today: { coinIn: 8000, coinOut: 7000, drop: 80 },
    yesterday: { coinIn: 7500, coinOut: 6500, drop: 75 },
  },
  '691142e37f88af78f4193b70': { // CABANA-003
    today: { coinIn: 3000, coinOut: 2800, drop: 30 },
    yesterday: { coinIn: 12000, coinOut: 10000, drop: 120 },
  },
  '691142e37f88af78f4193b71': { // CABANA-004
    today: { coinIn: 10000, coinOut: 9000, drop: 100 },
    yesterday: { coinIn: 10500, coinOut: 9500, drop: 105 },
  },
  '691142e37f88af78f4193b72': { // CABANA-005
    today: { coinIn: 12000, coinOut: 10000, drop: 120 },
    yesterday: { coinIn: 10000, coinOut: 8500, drop: 100 },
  },
};

async function fixCabanaMeters() {
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('\n=== FIXING CABANA METERS FOR TODAY ===\n');
    const now = new Date();
    console.log('Current time:', now.toISOString());
    console.log('Current hour:', now.getHours());
    
    // Delete only today's and yesterday's meters
    const todayBoundaries = getGamingDayBoundaries(0);
    const yesterdayBoundaries = getGamingDayBoundaries(1);
    
    console.log('\nToday gaming day:');
    console.log('  Start:', todayBoundaries.start.toISOString());
    console.log('  End:', todayBoundaries.end.toISOString());
    
    console.log('\nYesterday gaming day:');
    console.log('  Start:', yesterdayBoundaries.start.toISOString());
    console.log('  End:', yesterdayBoundaries.end.toISOString());
    
    // Delete meters for today and yesterday only
    const deleteResult = await db.collection('meters').deleteMany({
      location: CABANA_LOCATION_ID,
      timestamp: { 
        $gte: yesterdayBoundaries.start,
        $lt: todayBoundaries.end
      }
    });
    console.log(`\n✅ Deleted ${deleteResult.deletedCount} existing meters for today/yesterday\n`);
    
    // Get machines
    const machines = await db.collection('machines').find({
      gamingLocation: CABANA_LOCATION_ID
    }).toArray();
    
    let totalCreated = 0;
    
    // Generate TODAY's meters (from 8 AM today to now, or 8 AM tomorrow if past 8 AM)
    console.log('Generating TODAY meters...');
    for (const machine of machines) {
      const pattern = METER_PATTERNS[machine._id]?.today;
      if (!pattern) continue;
      
      const numReadings = 5;
      for (let r = 0; r < numReadings; r++) {
        const hourOffset = Math.floor((r / numReadings) * 24);
        const readingTimestamp = new Date(todayBoundaries.start.getTime() + hourOffset * 60 * 60 * 1000);
        
        const progress = (r + 1) / numReadings;
        const meter = {
          _id: generateId(),
          machine: machine._id,
          location: CABANA_LOCATION_ID,
          timestamp: readingTimestamp,
          sasMeters: {
            coinIn: Math.floor(pattern.coinIn * progress),
            coinOut: Math.floor(pattern.coinOut * progress),
            jackpot: 0,
            totalHandPaidCancelledCredits: 0,
            totalCancelledCredits: 0,
            gamesPlayed: Math.floor((pattern.coinIn * progress) / 10),
            gamesWon: Math.floor((pattern.coinOut * progress) / 15),
            currentCredits: 0,
            totalWonCredits: Math.floor(pattern.coinOut * progress),
            drop: Math.floor(pattern.drop * progress)
          },
          billMeters: {
            dollar1: 0,
            dollar2: Math.floor(pattern.drop * progress * 0.1),
            dollar5: Math.floor(pattern.drop * progress * 0.2),
            dollar10: Math.floor(pattern.drop * progress * 0.3),
            dollar20: Math.floor(pattern.drop * progress * 0.25),
            dollar50: Math.floor(pattern.drop * progress * 0.1),
            dollar100: Math.floor(pattern.drop * progress * 0.05),
            dollar500: 0,
            dollar1000: 0,
            dollar2000: 0,
            dollar5000: 0,
            dollar10000: 0,
            dollarTotal: Math.floor(pattern.drop * progress),
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
    console.log(`✅ Created ${totalCreated} meters for today`);
    
    // Generate YESTERDAY's meters
    console.log('\nGenerating YESTERDAY meters...');
    let yesterdayCreated = 0;
    for (const machine of machines) {
      const pattern = METER_PATTERNS[machine._id]?.yesterday;
      if (!pattern) continue;
      
      const numReadings = 5;
      for (let r = 0; r < numReadings; r++) {
        const hourOffset = Math.floor((r / numReadings) * 24);
        const readingTimestamp = new Date(yesterdayBoundaries.start.getTime() + hourOffset * 60 * 60 * 1000);
        
        const progress = (r + 1) / numReadings;
        const meter = {
          _id: generateId(),
          machine: machine._id,
          location: CABANA_LOCATION_ID,
          timestamp: readingTimestamp,
          sasMeters: {
            coinIn: Math.floor(pattern.coinIn * progress),
            coinOut: Math.floor(pattern.coinOut * progress),
            jackpot: 0,
            totalHandPaidCancelledCredits: 0,
            totalCancelledCredits: 0,
            gamesPlayed: Math.floor((pattern.coinIn * progress) / 10),
            gamesWon: Math.floor((pattern.coinOut * progress) / 15),
            currentCredits: 0,
            totalWonCredits: Math.floor(pattern.coinOut * progress),
            drop: Math.floor(pattern.drop * progress)
          },
          billMeters: {
            dollar1: 0,
            dollar2: Math.floor(pattern.drop * progress * 0.1),
            dollar5: Math.floor(pattern.drop * progress * 0.2),
            dollar10: Math.floor(pattern.drop * progress * 0.3),
            dollar20: Math.floor(pattern.drop * progress * 0.25),
            dollar50: Math.floor(pattern.drop * progress * 0.1),
            dollar100: Math.floor(pattern.drop * progress * 0.05),
            dollar500: 0,
            dollar1000: 0,
            dollar2000: 0,
            dollar5000: 0,
            dollar10000: 0,
            dollarTotal: Math.floor(pattern.drop * progress),
            dollarTotalUnknown: 0
          },
          createdAt: readingTimestamp,
          updatedAt: readingTimestamp,
          __v: 0
        };
        
        await db.collection('meters').insertOne(meter);
        yesterdayCreated++;
      }
    }
    console.log(`✅ Created ${yesterdayCreated} meters for yesterday`);
    
    console.log('\n=== EXPECTED RESULTS ===');
    console.log('TODAY: Money In = $48,000, Gross = $7,200');
    console.log('YESTERDAY: Money In = $58,000, Gross = $9,500');
    console.log('\n✅ Refresh the browser and test Today/Yesterday filters!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixCabanaMeters().catch(console.error);

