/**
 * Generate Test Meters Script
 * Creates meter data for test machines across different time periods
 * Supports: Today, Yesterday, Last 7 Days, Last 30 Days testing
 * 
 * Run with: node scripts/generate-test-meters.js
 * Dry run: node scripts/generate-test-meters.js --dry-run
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');

// Generate proper MongoDB hex string ID (24 characters)
const generateMongoId = () => {
  return new mongoose.Types.ObjectId().toHexString();
};

const isDryRun = process.argv.includes('--dry-run');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;
    if (!mongoUri) throw new Error('MongoDB URI not found');
    
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

const MachineSchema = new mongoose.Schema({}, { strict: false });
const Machine = mongoose.model('Machine', MachineSchema, 'machines');

const MeterSchema = new mongoose.Schema({}, { strict: false });
const Meter = mongoose.model('Meter', MeterSchema, 'meters');

// Generate random meter data
const generateMeterData = (multiplier = 1) => {
  const coinIn = (Math.random() * 500 + 100) * multiplier; // $100-$600 * multiplier
  const rtp = 0.85 + Math.random() * 0.1; // 85-95% RTP
  const coinOut = coinIn * rtp;
  const jackpot = Math.random() > 0.95 ? Math.random() * 200 : 0;
  
  return {
    coinIn: parseFloat(coinIn.toFixed(2)),
    coinOut: parseFloat(coinOut.toFixed(2)),
    jackpot: parseFloat(jackpot.toFixed(2)),
    gross: parseFloat((coinIn - coinOut).toFixed(2)),
    gamesPlayed: Math.floor(Math.random() * 100 * multiplier) + 10,
    gamesWon: Math.floor(Math.random() * 50 * multiplier) + 5,
  };
};

// Create proper meter object matching meters.ts schema
const createMeterObject = (machine, meterData, timestamp) => {
  return {
    _id: generateMongoId(),
    machine: machine._id,
    location: machine.gamingLocation, // Required field
    locationSession: `session-${machine.gamingLocation}-${Date.now()}`, // Required field
    readAt: timestamp, // Use readAt for date filtering (NOT timestamp)
    // Top-level fields
    coinIn: meterData.coinIn,
    coinOut: meterData.coinOut,
    drop: meterData.coinIn, // Drop = money physically inserted
    totalCancelledCredits: meterData.coinOut, // Money out = cancelled credits
    jackpot: meterData.jackpot,
    gamesPlayed: meterData.gamesPlayed,
    gamesWon: meterData.gamesWon,
    currentCredits: 0,
    totalWonCredits: meterData.coinOut * 0.9,
    totalHandPaidCancelledCredits: 0,
    // Movement object (nested metrics - THIS IS WHAT UI USES!)
    movement: {
      coinIn: meterData.coinIn,
      coinOut: meterData.coinOut,
      drop: meterData.coinIn, // Money In = drop (per financial-metrics-guide.md)
      totalCancelledCredits: meterData.coinOut, // Money Out (per financial-metrics-guide.md)
      jackpot: meterData.jackpot,
      gamesPlayed: meterData.gamesPlayed,
      gamesWon: meterData.gamesWon,
      totalWonCredits: meterData.coinOut * 0.9,
      currentCredits: 0,
      totalHandPaidCancelledCredits: 0,
    },
    // Viewing account denomination
    viewingAccountDenomination: {
      drop: meterData.coinIn,
      totalCancelledCredits: meterData.coinOut,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

const generateMeters = async () => {
  try {
    await connectDB();
    
    // Get all test machines
    const testMachines = await Machine.find({
      serialNumber: /^TEST-/
    }).lean();
    
    console.log(`🎰 Found ${testMachines.length} test machines\n`);
    
    if (testMachines.length === 0) {
      console.log('❌ No test machines found. Run test-data:generate first.');
      process.exit(1);
    }
    
    // Use Trinidad local time (UTC-4) to match dashboard logic
    // The dashboard uses getGamingDayRangeForPeriod which calculates "Today" based on local time
    const timezoneOffset = -4; // Trinidad/Tobago = UTC-4
    const nowUtc = new Date();
    const nowLocal = new Date(nowUtc.getTime() + timezoneOffset * 60 * 60 * 1000);
    
    // Use the local date for "today" calculations
    const today = new Date(
      Date.UTC(
        nowLocal.getUTCFullYear(),
        nowLocal.getUTCMonth(),
        nowLocal.getUTCDate()
      )
    );
    
    console.log(`⏰ Current UTC time: ${nowUtc.toISOString()}`);
    console.log(`⏰ Current Local time (Trinidad): ${nowLocal.toISOString().replace('Z', ' UTC-4')}`);
    console.log(`📅 Today (Local date in UTC): ${today.toISOString()}`);
    console.log(`   This matches dashboard "Today" calculation\n`);
    
    // Define time periods based on local date
    const timePeriods = {
      today: today,
      yesterday: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
      day3: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000),
      day5: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
      day7: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
      day15: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000),
      day20: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000),
      day30: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
    };
    
    const metersToCreate = [];
    const expectedTotals = {
      today: { coinIn: 0, coinOut: 0, jackpot: 0, gross: 0, machines: 0 },
      yesterday: { coinIn: 0, coinOut: 0, jackpot: 0, gross: 0, machines: 0 },
      last7Days: { coinIn: 0, coinOut: 0, jackpot: 0, gross: 0, machines: 0 },
      last30Days: { coinIn: 0, coinOut: 0, jackpot: 0, gross: 0, machines: 0 },
    };
    
    const machineExpectedValues = [];
    
    console.log('📊 Generating meter data for each machine...\n');
    console.log('=' .repeat(80));
    
    for (const machine of testMachines) {
      const machineData = {
        machineId: machine._id,
        serialNumber: machine.serialNumber,
        location: machine.custom?.name || machine.serialNumber,
        meters: {},
      };
      
      // 70% of machines get TODAY meters
      if (Math.random() > 0.3) {
        const meterData = generateMeterData(1);
        // Gaming day offset is 8 hours (8 AM Trinidad = 12:00 UTC)
        // Generate meters between 12:00 UTC Nov 8 and 23:59 UTC Nov 8
        const gamingDayStart = 12 * 60 * 60 * 1000; // 12 hours in ms
        const timestamp = new Date(
          timePeriods.today.getTime() + gamingDayStart + Math.random() * 12 * 60 * 60 * 1000
        ); // Random time within gaming day (12:00-23:59 UTC)
        
        metersToCreate.push(createMeterObject(machine, meterData, timestamp));
        
        machineData.meters.today = meterData;
        expectedTotals.today.coinIn += meterData.coinIn;
        expectedTotals.today.coinOut += meterData.coinOut;
        expectedTotals.today.jackpot += meterData.jackpot;
        expectedTotals.today.gross += meterData.gross;
        expectedTotals.today.machines++;
      }
      
      // 60% of machines get YESTERDAY meters
      if (Math.random() > 0.4) {
        const meterData = generateMeterData(0.8);
        // Yesterday gaming day: 12:00 UTC Nov 7 to 11:59 UTC Nov 8
        const gamingDayStart = 12 * 60 * 60 * 1000;
        const timestamp = new Date(
          timePeriods.yesterday.getTime() + gamingDayStart + Math.random() * 12 * 60 * 60 * 1000
        );
        
        metersToCreate.push(createMeterObject(machine, meterData, timestamp));
        
        machineData.meters.yesterday = meterData;
        expectedTotals.yesterday.coinIn += meterData.coinIn;
        expectedTotals.yesterday.coinOut += meterData.coinOut;
        expectedTotals.yesterday.jackpot += meterData.jackpot;
        expectedTotals.yesterday.gross += meterData.gross;
        expectedTotals.yesterday.machines++;
      }
      
      // Add meters for days 3, 5, 7 (for 7-day testing)
      [timePeriods.day3, timePeriods.day5, timePeriods.day7].forEach((baseDate, idx) => {
        if (Math.random() > 0.3) { // 70% chance
          const meterData = generateMeterData(0.6);
          const timestamp = new Date(
            baseDate.getTime() + Math.random() * 12 * 60 * 60 * 1000
          );
          
          metersToCreate.push(createMeterObject(machine, meterData, timestamp));
          
          const dayKey = `day${[3, 5, 7][idx]}`;
          machineData.meters[dayKey] = meterData;
          expectedTotals.last7Days.coinIn += meterData.coinIn;
          expectedTotals.last7Days.coinOut += meterData.coinOut;
          expectedTotals.last7Days.jackpot += meterData.jackpot;
          expectedTotals.last7Days.gross += meterData.gross;
        }
      });
      
      // Add meters for days 15, 20, 30 (for 30-day testing)
      [timePeriods.day15, timePeriods.day20, timePeriods.day30].forEach((baseDate, idx) => {
        if (Math.random() > 0.5) { // 50% chance
          const meterData = generateMeterData(0.4);
          const timestamp = new Date(
            baseDate.getTime() + Math.random() * 12 * 60 * 60 * 1000
          );
          
          metersToCreate.push(createMeterObject(machine, meterData, timestamp));
          
          const dayKey = `day${[15, 20, 30][idx]}`;
          machineData.meters[dayKey] = meterData;
          expectedTotals.last30Days.coinIn += meterData.coinIn;
          expectedTotals.last30Days.coinOut += meterData.coinOut;
          expectedTotals.last30Days.jackpot += meterData.jackpot;
          expectedTotals.last30Days.gross += meterData.gross;
        }
      });
      
      machineExpectedValues.push(machineData);
    }
    
    // Add today/yesterday to 7-day and 30-day totals
    expectedTotals.last7Days.coinIn += expectedTotals.today.coinIn + expectedTotals.yesterday.coinIn;
    expectedTotals.last7Days.coinOut += expectedTotals.today.coinOut + expectedTotals.yesterday.coinOut;
    expectedTotals.last7Days.jackpot += expectedTotals.today.jackpot + expectedTotals.yesterday.jackpot;
    expectedTotals.last7Days.gross += expectedTotals.today.gross + expectedTotals.yesterday.gross;
    expectedTotals.last7Days.machines = expectedTotals.today.machines + expectedTotals.yesterday.machines;
    
    expectedTotals.last30Days.coinIn += expectedTotals.last7Days.coinIn;
    expectedTotals.last30Days.coinOut += expectedTotals.last7Days.coinOut;
    expectedTotals.last30Days.jackpot += expectedTotals.last7Days.jackpot;
    expectedTotals.last30Days.gross += expectedTotals.last7Days.gross;
    expectedTotals.last30Days.machines = expectedTotals.last7Days.machines;
    
    console.log('\n📈 EXPECTED TOTALS (ALL LICENSEES):');
    console.log('━'.repeat(80));
    console.log(`TODAY:         $${expectedTotals.today.coinIn.toFixed(2)} in | $${expectedTotals.today.coinOut.toFixed(2)} out | $${expectedTotals.today.gross.toFixed(2)} gross | ${expectedTotals.today.machines} machines`);
    console.log(`YESTERDAY:     $${expectedTotals.yesterday.coinIn.toFixed(2)} in | $${expectedTotals.yesterday.coinOut.toFixed(2)} out | $${expectedTotals.yesterday.gross.toFixed(2)} gross | ${expectedTotals.yesterday.machines} machines`);
    console.log(`LAST 7 DAYS:   $${expectedTotals.last7Days.coinIn.toFixed(2)} in | $${expectedTotals.last7Days.coinOut.toFixed(2)} out | $${expectedTotals.last7Days.gross.toFixed(2)} gross`);
    console.log(`LAST 30 DAYS:  $${expectedTotals.last30Days.coinIn.toFixed(2)} in | $${expectedTotals.last30Days.coinOut.toFixed(2)} out | $${expectedTotals.last30Days.gross.toFixed(2)} gross`);
    console.log('━'.repeat(80));
    
    if (!isDryRun) {
      // Delete existing meters for test machines
      const testMachineIds = testMachines.map(m => m._id);
      const deleteResult = await Meter.deleteMany({
        machine: { $in: testMachineIds }
      });
      console.log(`\n🗑️  Deleted ${deleteResult.deletedCount} existing test meters`);
      
      // Insert new meters using raw MongoDB driver
      console.log(`\n💾 Inserting ${metersToCreate.length} new meters...`);
      await Meter.collection.insertMany(metersToCreate);
      console.log(`✅ Created ${metersToCreate.length} meters\n`);
      
      // Generate expected values document
      const expectedDoc = {
        generatedAt: new Date().toISOString(),
        totalMachines: testMachines.length,
        totalMeters: metersToCreate.length,
        expectedTotals: {
          today: {
            moneyIn: `$${expectedTotals.today.coinIn.toFixed(2)}`,
            moneyOut: `$${expectedTotals.today.coinOut.toFixed(2)}`,
            jackpot: `$${expectedTotals.today.jackpot.toFixed(2)}`,
            gross: `$${expectedTotals.today.gross.toFixed(2)}`,
            machinesWithActivity: expectedTotals.today.machines,
          },
          yesterday: {
            moneyIn: `$${expectedTotals.yesterday.coinIn.toFixed(2)}`,
            moneyOut: `$${expectedTotals.yesterday.coinOut.toFixed(2)}`,
            jackpot: `$${expectedTotals.yesterday.jackpot.toFixed(2)}`,
            gross: `$${expectedTotals.yesterday.gross.toFixed(2)}`,
            machinesWithActivity: expectedTotals.yesterday.machines,
          },
          last7Days: {
            moneyIn: `$${expectedTotals.last7Days.coinIn.toFixed(2)}`,
            moneyOut: `$${expectedTotals.last7Days.coinOut.toFixed(2)}`,
            jackpot: `$${expectedTotals.last7Days.jackpot.toFixed(2)}`,
            gross: `$${expectedTotals.last7Days.gross.toFixed(2)}`,
            note: 'Includes today + yesterday + days 3, 5, 7',
          },
          last30Days: {
            moneyIn: `$${expectedTotals.last30Days.coinIn.toFixed(2)}`,
            moneyOut: `$${expectedTotals.last30Days.coinOut.toFixed(2)}`,
            jackpot: `$${expectedTotals.last30Days.jackpot.toFixed(2)}`,
            gross: `$${expectedTotals.last30Days.gross.toFixed(2)}`,
            note: 'Includes all meters from last 30 days',
          },
        },
        machineBreakdown: machineExpectedValues.slice(0, 20).map(m => ({
          machine: m.serialNumber,
          location: m.location,
          meters: m.meters,
        })),
        note: 'First 20 machines shown. See full data in database.',
      };
      
      // Write expected values to docs
      const docContent = `# 📊 Test Meters - Expected Values

**Generated**: ${new Date().toLocaleString()}  
**Total Machines**: ${testMachines.length}  
**Total Meters Created**: ${metersToCreate.length}

---

## 🎯 **Expected Totals (ALL Licensees)**

### **TODAY**
- **Money In**: ${expectedDoc.expectedTotals.today.moneyIn}
- **Money Out**: ${expectedDoc.expectedTotals.today.moneyOut}
- **Jackpot**: ${expectedDoc.expectedTotals.today.jackpot}
- **Gross**: ${expectedDoc.expectedTotals.today.gross}
- **Machines with Activity**: ${expectedDoc.expectedTotals.today.machinesWithActivity}

### **YESTERDAY**
- **Money In**: ${expectedDoc.expectedTotals.yesterday.moneyIn}
- **Money Out**: ${expectedDoc.expectedTotals.yesterday.moneyOut}
- **Jackpot**: ${expectedDoc.expectedTotals.yesterday.jackpot}
- **Gross**: ${expectedDoc.expectedTotals.yesterday.gross}
- **Machines with Activity**: ${expectedDoc.expectedTotals.yesterday.machinesWithActivity}

### **LAST 7 DAYS**
- **Money In**: ${expectedDoc.expectedTotals.last7Days.moneyIn}
- **Money Out**: ${expectedDoc.expectedTotals.last7Days.moneyOut}
- **Jackpot**: ${expectedDoc.expectedTotals.last7Days.jackpot}
- **Gross**: ${expectedDoc.expectedTotals.last7Days.gross}
- **Note**: ${expectedDoc.expectedTotals.last7Days.note}

### **LAST 30 DAYS**
- **Money In**: ${expectedDoc.expectedTotals.last30Days.moneyIn}
- **Money Out**: ${expectedDoc.expectedTotals.last30Days.moneyOut}
- **Jackpot**: ${expectedDoc.expectedTotals.last30Days.jackpot}
- **Gross**: ${expectedDoc.expectedTotals.last30Days.gross}
- **Note**: ${expectedDoc.expectedTotals.last30Days.note}

---

## 📋 **Machine-Level Breakdown (Sample - First 20 Machines)**

${machineExpectedValues.slice(0, 20).map(m => `
### **${m.serialNumber}** (${m.location})

${Object.keys(m.meters).length > 0 ? Object.entries(m.meters).map(([period, data]) => `
- **${period}**: $${data.coinIn.toFixed(2)} in | $${data.coinOut.toFixed(2)} out | $${data.gross.toFixed(2)} gross | ${data.gamesPlayed} games
`).join('') : '- No meters generated for this machine'}
`).join('\n')}

---

## 🧪 **Testing Instructions**

1. **Today Filter**: Verify totals match "${expectedDoc.expectedTotals.today.gross}" gross
2. **Yesterday Filter**: Verify totals match "${expectedDoc.expectedTotals.yesterday.gross}" gross
3. **Last 7 Days Filter**: Verify totals match "${expectedDoc.expectedTotals.last7Days.gross}" gross
4. **Last 30 Days Filter**: Verify totals match "${expectedDoc.expectedTotals.last30Days.gross}" gross

### **Per-Licensee Testing:**

For each licensee (Cabana, TTG, Barbados):
- Select licensee from dropdown
- Test each time period
- Verify data shows ONLY that licensee's machines
- Verify totals are subset of "All Licensees" totals

### **Per-Location Testing:**

For users with specific location permissions:
- Should see data ONLY from assigned locations
- Totals should be subset of licensee totals
- No data from other locations should appear

---

## ✅ **Verification Checklist**

- [ ] Dashboard - Today
- [ ] Dashboard - Yesterday  
- [ ] Dashboard - Last 7 Days
- [ ] Dashboard - Last 30 Days
- [ ] Locations - All time periods
- [ ] Cabinets - All time periods
- [ ] Collection Reports - All time periods
- [ ] Licensee filtering works for each period
- [ ] Location filtering works for each period
- [ ] Data isolation (no cross-licensee leakage)
`;
      
      fs.writeFileSync('docs/TEST_METERS_EXPECTED_VALUES.md', docContent);
      console.log('📄 Expected values document created: docs/TEST_METERS_EXPECTED_VALUES.md\n');
      
      // Also save JSON for programmatic verification
      fs.writeFileSync(
        'docs/test-meters-expected.json',
        JSON.stringify(expectedDoc, null, 2)
      );
      console.log('📄 JSON data saved: docs/test-meters-expected.json\n');
      
    } else {
      console.log(`\n🔍 DRY RUN - Would create ${metersToCreate.length} meters`);
    }
    
    console.log('✅ Meter generation complete!\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB\n');
  }
};

if (require.main === module) {
  if (isDryRun) {
    console.log('🔸 DRY RUN MODE - No changes will be made\n');
  }
  
  generateMeters()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { generateMeters };

