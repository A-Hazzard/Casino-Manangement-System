/**
 * Comprehensive Test Suite for Meter Data
 * 
 * This script:
 * 1. Queries existing activity logs as examples
 * 2. Verifies meter data against expected values
 * 3. Checks gaming day offset accuracy
 * 4. Modifies test locations to have varied offsets
 * 5. Generates additional meters for complete chart data
 * 6. Creates fake activity logs based on real examples
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');

// Generate MongoDB hex string ID
const generateMongoId = () => {
  return new mongoose.Types.ObjectId().toHexString();
};

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
  } catch (error) {
    console.error('❌ Connection error:', error.message);
    process.exit(1);
  }
};

// ============================================================================
// PART 1: Query Existing Activity Logs
// ============================================================================

async function queryExistingActivityLogs() {
  console.log('📋 ===== PART 1: QUERYING EXISTING ACTIVITY LOGS =====\n');
  
  const logs = await mongoose.connection.db.collection('activityLogs')
    .find({})
    .sort({ timestamp: -1 })
    .limit(10)
    .toArray();
  
  console.log(`Found ${logs.length} activity logs\n`);
  
  if (logs.length > 0) {
    console.log('Sample activity log:');
    console.log(JSON.stringify(logs[0], null, 2));
    console.log('\n');
  }
  
  // Save examples for reference
  fs.writeFileSync(
    'docs/activity-log-examples.json',
    JSON.stringify(logs, null, 2)
  );
  console.log('💾 Saved examples to docs/activity-log-examples.json\n');
  
  return logs;
}

// ============================================================================
// PART 2: Verify Meter Data Accuracy
// ============================================================================

async function verifyMeterDataAccuracy() {
  console.log('🔍 ===== PART 2: VERIFYING METER DATA ACCURACY =====\n');
  
  // Load expected values
  const expected = JSON.parse(fs.readFileSync('docs/test-meters-expected.json', 'utf8'));
  
  console.log('Expected Totals (from generation):');
  console.log(`  Today: ${expected.expectedTotals.today.moneyIn} in, ${expected.expectedTotals.today.moneyOut} out, ${expected.expectedTotals.today.gross} gross`);
  console.log(`  Yesterday: ${expected.expectedTotals.yesterday.moneyIn} in, ${expected.expectedTotals.yesterday.moneyOut} out, ${expected.expectedTotals.yesterday.gross} gross\n`);
  
  // Query actual meter data with gaming day offset
  const timezoneOffset = -4; // Trinidad
  const nowUtc = new Date();
  const nowLocal = new Date(nowUtc.getTime() + timezoneOffset * 60 * 60 * 1000);
  const today = new Date(Date.UTC(nowLocal.getUTCFullYear(), nowLocal.getUTCMonth(), nowLocal.getUTCDate()));
  
  // Gaming day offset 8 hours (8 AM Trinidad = 12:00 UTC)
  const gamingDayStart = 12; // 12:00 UTC
  const todayStart = new Date(today.getTime() + gamingDayStart * 60 * 60 * 1000);
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
  
  console.log('Query date range for TODAY:');
  console.log(`  Start: ${todayStart.toISOString()}`);
  console.log(`  End: ${todayEnd.toISOString()}\n`);
  
  const todayMeters = await mongoose.connection.db.collection('meters')
    .find({
      readAt: { $gte: todayStart, $lte: todayEnd }
    })
    .toArray();
  
  let actualToday = {
    coinIn: 0,
    coinOut: 0,
    count: 0
  };
  
  todayMeters.forEach(meter => {
    actualToday.coinIn += meter.movement?.drop || 0;
    actualToday.coinOut += meter.movement?.totalCancelledCredits || 0;
    actualToday.count++;
  });
  
  console.log('Actual Totals (from DB with gaming day offset):');
  console.log(`  Today: $${actualToday.coinIn.toFixed(2)} in, $${actualToday.coinOut.toFixed(2)} out (${actualToday.count} meters)`);
  console.log(`  Gross: $${(actualToday.coinIn - actualToday.coinOut).toFixed(2)}\n`);
  
  return { expected, actual: actualToday };
}

// ============================================================================
// PART 3: Check Gaming Day Offset Distribution
// ============================================================================

async function checkGamingDayOffsets() {
  console.log('⏰ ===== PART 3: CHECKING GAMING DAY OFFSETS =====\n');
  
  const locations = await mongoose.connection.db.collection('gaminglocations')
    .find({ name: /^Test-/ })
    .project({ _id: 1, name: 1, gameDayOffset: 1 })
    .toArray();
  
  console.log(`Found ${locations.length} test locations:\n`);
  
  const offsetCounts = {};
  locations.forEach(loc => {
    const offset = loc.gameDayOffset !== undefined ? loc.gameDayOffset : 0;
    offsetCounts[offset] = (offsetCounts[offset] || 0) + 1;
    console.log(`  ${loc.name}: gameDayOffset = ${offset}`);
  });
  
  console.log('\nOffset distribution:');
  Object.entries(offsetCounts).forEach(([offset, count]) => {
    console.log(`  ${offset} hours: ${count} locations`);
  });
  console.log('\n');
  
  return locations;
}

// ============================================================================
// PART 4: Modify Locations to Have Varied Offsets
// ============================================================================

async function modifyLocationsWithVariedOffsets() {
  console.log('🔧 ===== PART 4: MODIFYING LOCATIONS WITH VARIED OFFSETS =====\n');
  
  const offsets = [0, 6, 8, 9, 12]; // Varied offsets
  
  const locations = await mongoose.connection.db.collection('gaminglocations')
    .find({ name: /^Test-/ })
    .toArray();
  
  console.log(`Updating ${locations.length} test locations with varied offsets...\n`);
  
  const updates = [];
  locations.forEach((loc, index) => {
    const newOffset = offsets[index % offsets.length];
    updates.push({
      _id: loc._id,
      name: loc.name,
      oldOffset: loc.gameDayOffset,
      newOffset: newOffset
    });
  });
  
  // Apply updates
  for (const update of updates) {
    await mongoose.connection.db.collection('gaminglocations').updateOne(
      { _id: update._id },
      { $set: { gameDayOffset: update.newOffset } }
    );
    console.log(`  ✓ ${update.name}: ${update.oldOffset || 0} → ${update.newOffset}`);
  }
  
  console.log(`\n✅ Updated ${updates.length} locations\n`);
  
  return updates;
}

// ============================================================================
// PART 5: Fill Meter Gaps for Complete Charts
// ============================================================================

async function fillMeterGapsForCharts() {
  console.log('📊 ===== PART 5: FILLING METER GAPS FOR COMPLETE CHARTS =====\n');
  
  // Get one test machine
  const machine = await mongoose.connection.db.collection('machines')
    .findOne({ serialNumber: /^TEST-/ });
  
  if (!machine) {
    console.log('No test machines found\n');
    return;
  }
  
  console.log(`Using machine: ${machine.serialNumber}\n`);
  
  // Generate meters for every hour today
  const timezoneOffset = -4;
  const nowUtc = new Date();
  const nowLocal = new Date(nowUtc.getTime() + timezoneOffset * 60 * 60 * 1000);
  const today = new Date(Date.UTC(nowLocal.getUTCFullYear(), nowLocal.getUTCMonth(), nowLocal.getUTCDate()));
  
  const gamingDayStart = 12; // 12:00 UTC
  const startTime = new Date(today.getTime() + gamingDayStart * 60 * 60 * 1000);
  
  const metersToCreate = [];
  
  // Create meter for every hour (24 hours)
  for (let hour = 0; hour < 24; hour++) {
    const timestamp = new Date(startTime.getTime() + hour * 60 * 60 * 1000);
    
    const coinIn = Math.random() * 500 + 100;
    const coinOut = coinIn * (0.85 + Math.random() * 0.1);
    
    metersToCreate.push({
      _id: generateMongoId(),
      machine: machine._id,
      location: machine.gamingLocation,
      locationSession: `session-${machine.gamingLocation}-${Date.now()}-${hour}`,
      readAt: timestamp,
      coinIn: parseFloat(coinIn.toFixed(2)),
      coinOut: parseFloat(coinOut.toFixed(2)),
      drop: parseFloat(coinIn.toFixed(2)),
      totalCancelledCredits: parseFloat(coinOut.toFixed(2)),
      jackpot: 0,
      gamesPlayed: Math.floor(Math.random() * 100) + 10,
      gamesWon: Math.floor(Math.random() * 50) + 5,
      currentCredits: 0,
      totalWonCredits: parseFloat((coinOut * 0.9).toFixed(2)),
      totalHandPaidCancelledCredits: 0,
      movement: {
        coinIn: parseFloat(coinIn.toFixed(2)),
        coinOut: parseFloat(coinOut.toFixed(2)),
        drop: parseFloat(coinIn.toFixed(2)),
        totalCancelledCredits: parseFloat(coinOut.toFixed(2)),
        jackpot: 0,
        gamesPlayed: Math.floor(Math.random() * 100) + 10,
        gamesWon: Math.floor(Math.random() * 50) + 5,
        totalWonCredits: parseFloat((coinOut * 0.9).toFixed(2)),
        currentCredits: 0,
        totalHandPaidCancelledCredits: 0,
      },
      viewingAccountDenomination: {
        drop: parseFloat(coinIn.toFixed(2)),
        totalCancelledCredits: parseFloat(coinOut.toFixed(2)),
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }
  
  console.log(`Creating ${metersToCreate.length} hourly meters for complete chart...\n`);
  
  await mongoose.connection.db.collection('meters').insertMany(metersToCreate);
  
  console.log(`✅ Created ${metersToCreate.length} meters for ${machine.serialNumber}\n`);
  
  return metersToCreate.length;
}

// ============================================================================
// PART 6: Generate Fake Activity Logs
// ============================================================================

async function generateFakeActivityLogs(exampleLogs) {
  console.log('📝 ===== PART 6: GENERATING FAKE ACTIVITY LOGS =====\n');
  
  const actions = ['create', 'update', 'delete', 'view', 'login_success', 'logout'];
  const resources = ['user', 'licensee', 'location', 'machine', 'collection'];
  
  const users = [
    { id: '6ec719ad799fef764d0222f0', username: 'admin', email: 'admin@dynamic1group.com' },
    { id: '68a6195a0c156b25a3cedd84', username: 'mkirton', email: 'mkirton@dynamic1group.com' },
    { id: '690ffb8f456158a3d2ef50a1', username: 'testuser', email: 'testuser@test.com' },
  ];
  
  const logsToCreate = [];
  
  // Generate 50 fake logs
  for (let i = 0; i < 50; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const resource = resources[Math.floor(Math.random() * resources.length)];
    
    const hoursAgo = Math.floor(Math.random() * 72); // Last 3 days
    const timestamp = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    
    const log = {
      _id: generateMongoId(),
      timestamp: timestamp,
      userId: user.id,
      username: user.username,
      action: action,
      resource: resource,
      resourceId: generateMongoId(),
      resourceName: `Test ${resource} ${i + 1}`,
      details: `${user.username} performed ${action} on ${resource}`,
      ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      actor: {
        id: user.id,
        email: user.email,
        role: user.username === 'admin' ? 'admin' : 'user',
      },
      actionType: action.toUpperCase(),
      entityType: resource.charAt(0).toUpperCase() + resource.slice(1),
      entity: {
        id: generateMongoId(),
        name: `Test ${resource} ${i + 1}`,
      },
      changes: [],
      description: `${action} ${resource}`,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    
    logsToCreate.push(log);
  }
  
  console.log(`Creating ${logsToCreate.length} fake activity logs...\n`);
  
  await mongoose.connection.db.collection('activityLogs').insertMany(logsToCreate);
  
  console.log(`✅ Created ${logsToCreate.length} activity logs\n`);
  
  // Show sample
  console.log('Sample generated log:');
  console.log(JSON.stringify(logsToCreate[0], null, 2));
  console.log('\n');
  
  return logsToCreate.length;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function runComprehensiveTestSuite() {
  try {
    await connectDB();
    
    console.log('🚀 STARTING COMPREHENSIVE TEST SUITE\n');
    console.log('='.repeat(80));
    console.log('\n');
    
    // Part 1: Query existing activity logs
    const exampleLogs = await queryExistingActivityLogs();
    
    // Part 2: Verify meter data accuracy
    const verification = await verifyMeterDataAccuracy();
    
    // Part 3: Check gaming day offsets
    const locations = await checkGamingDayOffsets();
    
    // Part 4: Modify locations with varied offsets
    const updates = await modifyLocationsWithVariedOffsets();
    
    // Part 5: Fill meter gaps
    const meterCount = await fillMeterGapsForCharts();
    
    // Part 6: Generate fake activity logs
    const logCount = await generateFakeActivityLogs(exampleLogs);
    
    console.log('='.repeat(80));
    console.log('\n✅ COMPREHENSIVE TEST SUITE COMPLETE!\n');
    console.log('Summary:');
    console.log(`  - Activity log examples: ${exampleLogs.length}`);
    console.log(`  - Meter verification: ${verification.actual.count} meters checked`);
    console.log(`  - Locations checked: ${locations.length}`);
    console.log(`  - Location offsets updated: ${updates.length}`);
    console.log(`  - Hourly meters added: ${meterCount}`);
    console.log(`  - Activity logs generated: ${logCount}`);
    console.log('\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB\n');
  }
}

// Run if called directly
if (require.main === module) {
  runComprehensiveTestSuite()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { runComprehensiveTestSuite };

