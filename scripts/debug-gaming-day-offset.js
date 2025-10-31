require('dotenv').config({ path: '.env' });
const { MongoClient } = require('mongodb');

/**
 * Debug gaming day offset issue
 * Compare what data exists vs what the gaming day ranges are calculating
 */

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI not found in environment variables');
    console.error('Make sure scripts/.env file exists with MONGO_URI');
    return;
  }

  // Extract database name from URI
  const dbName = process.env.MONGO_URI.split('/').pop().split('?')[0];
  
  const client = await MongoClient.connect(process.env.MONGO_URI);
  const db = client.db(dbName);

  try {
    console.log('\n=== GAMING DAY OFFSET DEBUG ===\n');

    // Get the DevLabTuna location
    const location = await db.collection('gaminglocations').findOne({
      name: 'DevLabTuna'
    });

    console.log('📍 Location: DevLabTuna');
    console.log('  _id:', location._id.toString());
    console.log('  gameDayOffset:', location.gameDayOffset);
    console.log('  licensee (rel.licencee):', location.rel?.licencee);
    
    // Check if this location has a licensee assigned
    if (location.rel?.licencee) {
      const licensee = await db.collection('licencees').findOne({
        _id: location.rel.licencee
      });
      console.log('\n📋 Licensee Info:');
      console.log('  Name:', licensee?.name);
      console.log('  _id:', licensee?._id.toString());
    } else {
      console.log('\n⚠️  No licensee assigned to this location!');
      console.log('  This is why "All Licensee" mode returns 0!');
    }

    // Get all machines for this location
    const machines = await db.collection('machines').find({
      gamingLocation: location._id.toString()
    }).toArray();

    console.log(`\n🎰 Found ${machines.length} machines`);

    // Get all meter readings for today
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    console.log('\n📅 Date Range (no gaming day offset):');
    console.log('  Start:', startOfDay.toISOString());
    console.log('  End:', endOfDay.toISOString());

    const machineIds = machines.map(m => m._id);

    const meters = await db.collection('meters').find({
      machine: { $in: machineIds },
      readAt: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).toArray();

    console.log(`\n📊 Meters found (no gaming day offset): ${meters.length}`);
    
    if (meters.length > 0) {
      const totalDrop = meters.reduce((sum, m) => sum + (m.movement?.drop || 0), 0);
      const totalCancelled = meters.reduce((sum, m) => sum + (m.movement?.totalCancelledCredits || 0), 0);
      console.log('  Total Drop:', totalDrop);
      console.log('  Total Cancelled:', totalCancelled);
      console.log('  Total Gross:', totalDrop - totalCancelled);
      console.log('\n  First meter:');
      console.log('    readAt:', meters[0].readAt);
      console.log('    drop:', meters[0].movement?.drop);
      console.log('    cancelled:', meters[0].movement?.totalCancelledCredits);
    }

    // Now calculate with gaming day offset
    const offset = location.gameDayOffset || 0;
    const offsetStartOfDay = new Date(now);
    offsetStartOfDay.setHours(offset, 0, 0, 0);
    const offsetEndOfDay = new Date(offsetStartOfDay);
    offsetEndOfDay.setHours(offsetStartOfDay.getHours() + 24);

    console.log('\n\n📅 Date Range (WITH gaming day offset = ' + offset + '):');
    console.log('  Start:', offsetStartOfDay.toISOString());
    console.log('  End:', offsetEndOfDay.toISOString());

    const offsetMeters = await db.collection('meters').find({
      machine: { $in: machineIds },
      readAt: {
        $gte: offsetStartOfDay,
        $lte: offsetEndOfDay
      }
    }).toArray();

    console.log(`\n📊 Meters found (WITH gaming day offset): ${offsetMeters.length}`);
    
    if (offsetMeters.length > 0) {
      const totalDrop = offsetMeters.reduce((sum, m) => sum + (m.movement?.drop || 0), 0);
      const totalCancelled = offsetMeters.reduce((sum, m) => sum + (m.movement?.totalCancelledCredits || 0), 0);
      console.log('  Total Drop:', totalDrop);
      console.log('  Total Cancelled:', totalCancelled);
      console.log('  Total Gross:', totalDrop - totalCancelled);
    }

    console.log('\n\n=== CONCLUSION ===');
    if (meters.length > 0 && offsetMeters.length === 0) {
      console.log('❌ ISSUE FOUND: Gaming day offset is excluding the data!');
      console.log(`  The data exists at ${meters[0].readAt}`);
      console.log(`  But the gaming day offset (${offset} hours) moves the range to:`);
      console.log(`    ${offsetStartOfDay.toISOString()} - ${offsetEndOfDay.toISOString()}`);
      console.log('  which misses the actual meter reading time.');
    } else if (meters.length > 0 && offsetMeters.length > 0) {
      console.log('✅ Both queries find data - gaming day offset is working correctly.');
    } else {
      console.log('❌ No data found in either query.');
    }

  } finally {
    await client.close();
  }
}

main().catch(console.error);

