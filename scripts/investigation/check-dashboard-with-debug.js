require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { MongoClient } = require('mongodb');

/**
 * Investigation Script: Check Dashboard Data with Debug Logging
 * 
 * This directly queries the database using the same logic as the Dashboard API
 * to see what's happening.
 */

async function investigateDashboardLogic() {
  console.log('\n🔍 INVESTIGATING DASHBOARD LOGIC\n');
  console.log('=' .repeat(80));
  
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    const timePeriod = 'Today';
    const gameDayOffset = 8; // 8 AM Trinidad
    const timezoneOffset = -4; // UTC-4 for Trinidad
    
    // Step 1: Calculate gaming day range manually
    console.log('\n📅 STEP 1: Calculate Gaming Day Range\n');
    
    const nowUtc = new Date();
    const nowLocal = new Date(nowUtc.getTime() + timezoneOffset * 60 * 60 * 1000);
    
    console.log(`Current UTC: ${nowUtc.toISOString()}`);
    console.log(`Current Trinidad: ${nowLocal.toISOString()}`);
    
    const today = new Date(
      Date.UTC(
        nowLocal.getUTCFullYear(),
        nowLocal.getUTCMonth(),
        nowLocal.getUTCDate()
      )
    );
    
    console.log(`Today (base date): ${today.toISOString()}`);
    
    // Calculate range start
    const rangeStart = new Date(today);
    rangeStart.setUTCHours(gameDayOffset - timezoneOffset, 0, 0, 0);
    
    console.log(`Gaming day offset: ${gameDayOffset}`);
    console.log(`Timezone offset: ${timezoneOffset}`);
    console.log(`setUTCHours(${gameDayOffset} - (${timezoneOffset})) = setUTCHours(${gameDayOffset - timezoneOffset})`);
    
    // Calculate range end
    const rangeEnd = new Date(today);
    rangeEnd.setDate(rangeEnd.getDate() + 1);
    rangeEnd.setUTCHours(gameDayOffset - timezoneOffset, 0, 0, 0);
    rangeEnd.setMilliseconds(rangeEnd.getMilliseconds() - 1);
    
    console.log(`\nCalculated Gaming Day Range (UTC):`);
    console.log(`  Start: ${rangeStart.toISOString()}`);
    console.log(`  End:   ${rangeEnd.toISOString()}`);
    
    // Step 2: Get gaming locations
    console.log('\n\n📍 STEP 2: Get Gaming Locations\n');
    
    const locations = await db.collection('gaminglocations')
      .find({
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2020-01-01') } },
        ],
      })
      .toArray();
    
    console.log(`Total locations found: ${locations.length}`);
    
    if (locations.length === 0) {
      console.log('❌ NO LOCATIONS FOUND! This is why dashboard returns 0.');
      return;
    }
    
    console.log(`Sample locations:`);
    locations.slice(0, 3).forEach((loc, i) => {
      console.log(`  ${i + 1}. ${loc.name} (ID: ${loc._id}) - gameDayOffset: ${loc.gameDayOffset || 'undefined'}`);
    });
    
    // Step 3: Get machines for a sample location
    console.log('\n\n🎰 STEP 3: Get Machines for First Location\n');
    
    const sampleLocation = locations[0];
    const machines = await db.collection('machines')
      .find({
        gamingLocation: sampleLocation._id.toString(),
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2020-01-01') } },
        ],
      })
      .toArray();
    
    console.log(`Machines for "${sampleLocation.name}": ${machines.length}`);
    
    if (machines.length === 0) {
      console.log('⚠️  No machines found for this location.');
    } else {
      console.log(`Sample machines:`);
      machines.slice(0, 3).forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.serialNumber} (ID: ${m._id})`);
      });
      
      // Step 4: Get meters for these machines
      console.log('\n\n📊 STEP 4: Get Meters for These Machines\n');
      
      const machineIds = machines.map(m => m._id);
      const meters = await db.collection('meters')
        .find({
          machine: { $in: machineIds.map(id => id.toString()) },
          readAt: {
            $gte: rangeStart,
            $lte: rangeEnd,
          },
        })
        .toArray();
      
      console.log(`Meters found: ${meters.length}`);
      
      if (meters.length === 0) {
        console.log('❌ NO METERS FOUND in the gaming day range!');
        console.log('\nLet\'s check what dates DO have meters for these machines:');
        
        const anyMeters = await db.collection('meters')
          .find({ machine: { $in: machineIds.map(id => id.toString()) } })
          .sort({ readAt: -1 })
          .limit(5)
          .toArray();
        
        console.log(`Latest meters for these machines:`);
        anyMeters.forEach((m, i) => {
          console.log(`  ${i + 1}. ${m.readAt.toISOString()} - Machine: ${m.machine} - Drop: ${m.movement?.drop || 0}`);
        });
      } else {
        console.log(`Sample meters:`);
        meters.slice(0, 5).forEach((m, i) => {
          console.log(`  ${i + 1}. ${m.readAt.toISOString()} - Drop: ${m.movement?.drop || 0}`);
        });
        
        // Calculate totals
        const totals = meters.reduce((acc, m) => ({
          drop: acc.drop + (m.movement?.drop || 0),
          cancelled: acc.cancelled + (m.movement?.totalCancelledCredits || 0),
        }), { drop: 0, cancelled: 0 });
        
        console.log(`\nTotals for "${sampleLocation.name}":`);
        console.log(`  Money In: ${totals.drop}`);
        console.log(`  Money Out: ${totals.cancelled}`);
        console.log(`  Gross: ${totals.drop - totals.cancelled}`);
      }
    }
    
    // Step 5: Check ALL meters in gaming day range
    console.log('\n\n🔍 STEP 5: Check ALL Meters in Gaming Day Range\n');
    
    const allMetersInRange = await db.collection('meters')
      .find({
        readAt: {
          $gte: rangeStart,
          $lte: rangeEnd,
        },
      })
      .toArray();
    
    console.log(`Total meters in gaming day range: ${allMetersInRange.length}`);
    
    if (allMetersInRange.length > 0) {
      const allTotals = allMetersInRange.reduce((acc, m) => ({
        drop: acc.drop + (m.movement?.drop || 0),
        cancelled: acc.cancelled + (m.movement?.totalCancelledCredits || 0),
      }), { drop: 0, cancelled: 0 });
      
      console.log(`\nALL Meters Totals:`);
      console.log(`  Money In: ${allTotals.drop}`);
      console.log(`  Money Out: ${allTotals.cancelled}`);
      console.log(`  Gross: ${allTotals.drop - allTotals.cancelled}`);
    }
    
    // Step 6: Summary
    console.log('\n\n📋 SUMMARY\n');
    console.log('=' .repeat(80));
    console.log(`Gaming Day Range: ${rangeStart.toISOString()} → ${rangeEnd.toISOString()}`);
    console.log(`Locations: ${locations.length}`);
    console.log(`Meters in range: ${allMetersInRange.length}`);
    
    if (allMetersInRange.length > 0 && machines.length === 0) {
      console.log('\n❌ ISSUE: Meters exist but machines not found for location!');
      console.log('   This could be a machine linkage issue.');
    } else if (allMetersInRange.length > 0 && meters.length === 0) {
      console.log('\n❌ ISSUE: Meters exist but query doesn\'t find them!');
      console.log('   This is a query logic error.');
    } else if (allMetersInRange.length === 0) {
      console.log('\n⚠️  No meter data exists for today\'s gaming day.');
      console.log('   This is expected if no data has been collected today.');
    } else {
      console.log('\n✅ Data exists and query should work!');
      console.log('   If dashboard still shows 0, check API auth/filtering logic.');
    }
    
  } catch (error) {
    console.error('❌ Investigation failed:', error);
  } finally {
    await client.close();
  }
}

// Run investigation
investigateDashboardLogic().then(() => {
  console.log('\n✅ Investigation complete!\n');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

