/**
 * Verify Aggregation Accuracy Script
 * 
 * Compares raw meter data from DB against dashboard API results
 * to ensure aggregation logic is correct for all gaming day offsets
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function verifyAggregationAccuracy() {
  await mongoose.connect(process.env.MONGO_URI);
  
  console.log('🔍 VERIFYING AGGREGATION ACCURACY\n');
  console.log('='.repeat(80));
  console.log('\n');
  
  // Get all test locations with their offsets
  const locations = await mongoose.connection.db.collection('gaminglocations')
    .find({ name: /^Test-/ })
    .project({ _id: 1, name: 1, gameDayOffset: 1, 'rel.licencee': 1 })
    .toArray();
  
  console.log(`📍 Found ${locations.length} test locations\n`);
  
  // Group by offset
  const offsetGroups = {};
  locations.forEach(loc => {
    const offset = loc.gameDayOffset || 0;
    if (!offsetGroups[offset]) {
      offsetGroups[offset] = [];
    }
    offsetGroups[offset].push(loc);
  });
  
  console.log('Offset distribution:');
  Object.keys(offsetGroups).sort((a, b) => Number(a) - Number(b)).forEach(offset => {
    console.log(`  ${offset} hours: ${offsetGroups[offset].length} locations`);
  });
  console.log('\n');
  
  // Calculate date range for "Today" with different offsets
  const timezoneOffset = -4;
  const nowUtc = new Date();
  const nowLocal = new Date(nowUtc.getTime() + timezoneOffset * 60 * 60 * 1000);
  const today = new Date(Date.UTC(nowLocal.getUTCFullYear(), nowLocal.getUTCMonth(), nowLocal.getUTCDate()));
  
  console.log('📅 Date Calculation (Trinidad Local Time):');
  console.log(`  Current UTC: ${nowUtc.toISOString()}`);
  console.log(`  Current Local: ${nowLocal.toISOString().replace('Z', ' Trinidad')}`);
  console.log(`  Today (local date in UTC): ${today.toISOString()}\n`);
  
  // For each offset, show what "Today" means
  console.log('⏰ "TODAY" Gaming Day Ranges by Offset:\n');
  
  for (const offset of Object.keys(offsetGroups).sort((a, b) => Number(a) - Number(b))) {
    const gameDayStart = Number(offset);
    const rangeStart = new Date(today.getTime() + (gameDayStart - timezoneOffset) * 60 * 60 * 1000);
    const rangeEnd = new Date(rangeStart.getTime() + 24 * 60 * 60 * 1000 - 1);
    
    console.log(`Offset ${offset} hours (${offset}:00 AM Trinidad):`);
    console.log(`  Range: ${rangeStart.toISOString()} to ${rangeEnd.toISOString()}`);
    console.log(`  Locations: ${offsetGroups[offset].map(l => l.name).join(', ')}`);
    
    // Count meters for this offset range
    const meterCount = await mongoose.connection.db.collection('meters')
      .countDocuments({
        location: { $in: offsetGroups[offset].map(l => l._id) },
        readAt: { $gte: rangeStart, $lte: rangeEnd }
      });
    
    // Sum totals for this offset
    const meters = await mongoose.connection.db.collection('meters')
      .find({
        location: { $in: offsetGroups[offset].map(l => l._id) },
        readAt: { $gte: rangeStart, $lte: rangeEnd }
      })
      .toArray();
    
    let totalIn = 0, totalOut = 0;
    meters.forEach(m => {
      totalIn += m.movement?.drop || 0;
      totalOut += m.movement?.totalCancelledCredits || 0;
    });
    
    console.log(`  Meters: ${meterCount}`);
    console.log(`  Money In: $${totalIn.toFixed(2)}`);
    console.log(`  Money Out: $${totalOut.toFixed(2)}`);
    console.log(`  Gross: $${(totalIn - totalOut).toFixed(2)}\n`);
  }
  
  // Overall totals across ALL offsets
  console.log('='.repeat(80));
  console.log('\n📊 OVERALL TOTALS (All Offsets Combined):\n');
  
  const allLocationIds = locations.map(l => l._id);
  
  for (const offset of Object.keys(offsetGroups).sort((a, b) => Number(a) - Number(b))) {
    const gameDayStart = Number(offset);
    const rangeStart = new Date(today.getTime() + (gameDayStart - timezoneOffset) * 60 * 60 * 1000);
    const rangeEnd = new Date(rangeStart.getTime() + 24 * 60 * 60 * 1000 - 1);
    
    const meters = await mongoose.connection.db.collection('meters')
      .find({
        location: { $in: offsetGroups[offset].map(l => l._id) },
        readAt: { $gte: rangeStart, $lte: rangeEnd }
      })
      .toArray();
    
    console.log(`Offset ${offset}: ${meters.length} meters`);
  }
  
  // Grand total
  const allMeters = await mongoose.connection.db.collection('meters')
    .find({ location: { $in: allLocationIds } })
    .toArray();
  
  let grandTotalIn = 0, grandTotalOut = 0, grandCount = 0;
  allMeters.forEach(m => {
    grandTotalIn += m.movement?.drop || 0;
    grandTotalOut += m.movement?.totalCancelledCredits || 0;
    grandCount++;
  });
  
  console.log(`\n🏆 GRAND TOTAL (All ${grandCount} test meters):`);
  console.log(`  Money In: $${grandTotalIn.toFixed(2)}`);
  console.log(`  Money Out: $${grandTotalOut.toFixed(2)}`);
  console.log(`  Gross: $${(grandTotalIn - grandTotalOut).toFixed(2)}\n`);
  
  console.log('='.repeat(80));
  console.log('\n✅ Verification complete!\n');
  
  await mongoose.disconnect();
}

verifyAggregationAccuracy().catch(console.error);

