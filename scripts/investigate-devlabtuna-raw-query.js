require('dotenv').config();
const { MongoClient } = require('mongodb');

async function investigateRaw() {
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('\n=== DEVLABTUNA RAW INVESTIGATION ===\n');
    
    // Find DevLabTuna location
    const location = await db.collection('gamingLocations').findOne({ name: /DevLabTuna/i });
    
    if (!location) {
      console.log('❌ DevLabTuna location not found!');
      
      // Try exact match
      const locationExact = await db.collection('gamingLocations').findOne({ name: 'DevLabTuna' });
      if (!locationExact) {
        console.log('❌ Exact match also not found!');
        
        // Show all locations
        const allLocs = await db.collection('gamingLocations').find({}).limit(10).toArray();
        console.log('\nAll locations:');
        allLocs.forEach(l => console.log(`  ${l._id} - ${l.name}`));
      }
      
      await client.close();
      return;
    }
    
    console.log('✅ Location found:');
    console.log('  _id:', location._id);
    console.log('  Name:', location.name);
    console.log('  Licensee:', location.rel?.licencee);
    console.log('  Gaming Day Offset:', location.gameDayOffset);
    
    // Find all machines at this location
    const machines = await db.collection('machines').find({ 
      gamingLocation: location._id
    }).toArray();
    
    console.log(`\n🎰 Machines at DevLabTuna: ${machines.length}`);
    machines.forEach(m => {
      console.log(`  - ${m.serialNumber} (${m._id})`);
    });
    
    // Calculate gaming day range for TODAY (8 AM offset)
    const now = new Date();
    const trinidad8AM_UTC = new Date(now);
    const gameDayOffset = location.gameDayOffset ?? 8;
    trinidad8AM_UTC.setUTCHours(gameDayOffset + 4, 0, 0, 0); // 8 AM Trinidad = 12 PM UTC
    
    if (trinidad8AM_UTC > now) {
      trinidad8AM_UTC.setDate(trinidad8AM_UTC.getDate() - 1);
    }
    
    const nextDay8AM = new Date(trinidad8AM_UTC);
    nextDay8AM.setDate(nextDay8AM.getDate() + 1);
    
    console.log(`\n📅 Gaming Day Range (Today, ${gameDayOffset} AM offset):`);
    console.log(`  Start: ${trinidad8AM_UTC.toISOString()}`);
    console.log(`  End: ${nextDay8AM.toISOString()}`);
    
    // Query meters for TODAY
    const machineIds = machines.map(m => m._id);
    
    const todayMeters = await db.collection('meters').aggregate([
      {
        $match: {
          machine: { $in: machineIds },
          readAt: { $gte: trinidad8AM_UTC, $lte: nextDay8AM }
        }
      },
      {
        $group: {
          _id: null,
          totalMoneyIn: { $sum: '$movement.drop' },
          totalMoneyOut: { $sum: '$movement.totalCancelledCredits' },
          totalJackpot: { $sum: '$movement.jackpot' },
          meterCount: { $sum: 1 }
        }
      }
    ]).toArray();
    
    const totals = todayMeters[0] || { totalMoneyIn: 0, totalMoneyOut: 0, totalJackpot: 0, meterCount: 0 };
    const gross = totals.totalMoneyIn - totals.totalMoneyOut;
    
    console.log(`\n💰 DevLabTuna Totals (TODAY, native TTD):`);
    console.log(`  Money In: ${totals.totalMoneyIn} TTD`);
    console.log(`  Money Out: ${totals.totalMoneyOut} TTD`);
    console.log(`  Gross: ${gross} TTD`);
    console.log(`  Meters counted: ${totals.meterCount}`);
    
    // Break down by machine
    console.log(`\n🔍 Per-Machine Breakdown:`);
    for (const machine of machines) {
      const machineMeters = await db.collection('meters').aggregate([
        {
          $match: {
            machine: machine._id,
            readAt: { $gte: trinidad8AM_UTC, $lte: nextDay8AM }
          }
        },
        {
          $group: {
            _id: null,
            moneyIn: { $sum: '$movement.drop' },
            moneyOut: { $sum: '$movement.totalCancelledCredits' },
            meterCount: { $sum: 1 }
          }
        }
      ]).toArray();
      
      const machineTotals = machineMeters[0] || { moneyIn: 0, moneyOut: 0, meterCount: 0 };
      if (machineTotals.meterCount > 0) {
        console.log(`  ${machine.serialNumber}: Money In = ${machineTotals.moneyIn} TTD, Money Out = ${machineTotals.moneyOut} TTD (${machineTotals.meterCount} meters)`);
      }
    }
    
    console.log(`\n✅ CORRECT VALUES (What manager should see):`);
    console.log(`  DevLabTuna Money In: ${totals.totalMoneyIn} TTD`);
    console.log(`  DevLabTuna Money Out: ${totals.totalMoneyOut} TTD`);
    console.log(`  DevLabTuna Gross: ${gross} TTD`);
    
    console.log(`\n❌ WRONG VALUES (If seeing):`);
    console.log(`  127.87 - This is some incorrect calculation`);
    console.log(`  140 / 6.75 = 20.74 - This would be if converting TTD to USD`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

investigateRaw().catch(console.error);

