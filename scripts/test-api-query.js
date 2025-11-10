require('dotenv').config();
const { MongoClient } = require('mongodb');

const CABANA_LOCATION_ID = '691142e37f88af78f4193b6d';

async function testAPIQuery() {
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('\n=== TESTING API QUERY LOGIC ===\n');
    
    // Simulate "Last 30 Days" (Oct 10 - Nov 9, 2025)
    // Gaming day offset is 8 hours
    const rangeStart = new Date('2025-10-10T12:00:00.000Z'); // Oct 10 at 8 AM local = 12 PM UTC
    const rangeEnd = new Date('2025-11-09T12:00:00.000Z');   // Nov 9 at 8 AM local = 12 PM UTC
    
    console.log('Query range:');
    console.log('  Start:', rangeStart.toISOString());
    console.log('  End:', rangeEnd.toISOString());
    
    // Get Cabana machines
    const machines = await db.collection('machines').find({
      gamingLocation: CABANA_LOCATION_ID
    }).toArray();
    
    console.log(`\nFound ${machines.length} machines`);
    
    const machineIds = machines.map(m => m._id);
    
    // Query meters like the API does
    const query = {
      machine: { $in: machineIds },
      readAt: {
        $gte: rangeStart,
        $lte: rangeEnd
      }
    };
    
    console.log('\nQuery:', JSON.stringify(query, null, 2));
    
    const metersCount = await db.collection('meters').countDocuments(query);
    console.log(`\nMeters found: ${metersCount}`);
    
    if (metersCount > 0) {
      // Get sample
      const samples = await db.collection('meters').find(query).limit(5).toArray();
      console.log('\nSample meters:');
      samples.forEach((m, idx) => {
        console.log(`  ${idx + 1}. readAt: ${m.readAt.toISOString()}, coinIn: ${m.sasMeters.coinIn}`);
      });
      
      // Aggregate
      const aggregation = await db.collection('meters').aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalCoinIn: { $sum: '$sasMeters.coinIn' },
            totalCoinOut: { $sum: '$sasMeters.coinOut' },
            count: { $sum: 1 }
          }
        }
      ]).toArray();
      
      console.log('\nAggregation result:');
      console.log(aggregation[0]);
    } else {
      console.log('\n❌ NO METERS FOUND - This is the problem!');
      
      // Check what date range the meters actually have
      const allMeters = await db.collection('meters').find({
        location: CABANA_LOCATION_ID
      }).sort({ readAt: 1 }).toArray();
      
      console.log(`\nAll ${allMeters.length} Cabana meters date range:`);
      console.log('  Oldest:', allMeters[0]?.readAt?.toISOString());
      console.log('  Newest:', allMeters[allMeters.length - 1]?.readAt?.toISOString());
      
      // Check how many fall within each day
      console.log('\nMeters by date:');
      const dateGroups = {};
      allMeters.forEach(m => {
        const date = m.readAt.toISOString().split('T')[0];
        dateGroups[date] = (dateGroups[date] || 0) + 1;
      });
      Object.entries(dateGroups).sort().forEach(([date, count]) => {
        console.log(`  ${date}: ${count} meters`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testAPIQuery().catch(console.error);

