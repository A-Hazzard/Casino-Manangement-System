/**
 * Investigation Script: Why Dashboard Shows $104.82 vs $2,375.58
 * 
 * This script investigates what the Dashboard API is filtering or excluding
 * that causes it to return $104.82 instead of the full $2,375.58.
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not found in environment variables');
  process.exit(1);
}

async function investigate() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db();
    const timePeriod = 'Yesterday';
    
    // Calculate gaming day range (8 AM default)
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setUTCHours(12, 0, 0, 0); // 8 AM Trinidad = 12 PM UTC
    const today = new Date(yesterday);
    today.setUTCDate(today.getUTCDate() + 1);
    today.setUTCHours(11, 59, 59, 999); // End of gaming day
    
    console.log(`📅 Gaming Day Range for Yesterday:`);
    console.log(`   Start: ${yesterday.toISOString()}`);
    console.log(`   End: ${today.toISOString()}\n`);
    
    // Get all licensees
    const licensees = await db.collection('licencees').find({
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    }).toArray();
    
    console.log(`📊 Found ${licensees.length} licensees\n`);
    
    // Process each licensee like the Dashboard API does
    const licenseeResults = [];
    
    for (const licensee of licensees) {
      const licenseeId = licensee._id;
      const licenseeName = licensee.name || 'Unknown';
      
      console.log(`\n🔍 Processing Licensee: ${licenseeName} (${licenseeId})`);
      
      // Get locations for this licensee
      const locations = await db.collection('gaminglocations').find({
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2020-01-01') } },
        ],
        'rel.licencee': licenseeId,
      }, { projection: { _id: 1, name: 1, gameDayOffset: 1 } }).toArray();
      
      console.log(`   Locations: ${locations.length}`);
      
      if (locations.length === 0) {
        console.log(`   ⚠️  No locations for this licensee`);
        licenseeResults.push({
          licenseeName,
          licenseeId: licenseeId.toString(),
          moneyIn: 0,
          moneyOut: 0,
          gross: 0,
          locationCount: 0,
        });
        continue;
      }
      
      // Get machines for these locations
      const locationIds = locations.map(l => l._id);
      const machines = await db.collection('machines').find({
        gamingLocation: { $in: locationIds },
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2020-01-01') } },
        ],
      }, { projection: { _id: 1, gamingLocation: 1 } }).toArray();
      
      console.log(`   Machines: ${machines.length}`);
      
      if (machines.length === 0) {
        console.log(`   ⚠️  No machines for this licensee's locations`);
        licenseeResults.push({
          licenseeName,
          licenseeId: licenseeId.toString(),
          moneyIn: 0,
          moneyOut: 0,
          gross: 0,
          locationCount: locations.length,
          machineCount: 0,
        });
        continue;
      }
      
      // Aggregate meters for all machines in this licensee's locations
      const machineIds = machines.map(m => m._id);
      const aggregation = await db.collection('meters').aggregate([
        {
          $match: {
            machine: { $in: machineIds },
            readAt: {
              $gte: yesterday,
              $lte: today,
            },
          },
        },
        {
          $group: {
            _id: null,
            totalDrop: { $sum: '$movement.drop' },
            totalCancelled: { $sum: '$movement.totalCancelledCredits' },
          },
        },
      ]).toArray();
      
      const result = aggregation[0] || {
        totalDrop: 0,
        totalCancelled: 0,
      };
      
      const moneyIn = result.totalDrop || 0;
      const moneyOut = result.totalCancelled || 0;
      const gross = moneyIn - moneyOut;
      
      console.log(`   Money In: $${moneyIn.toFixed(2)}`);
      console.log(`   Money Out: $${moneyOut.toFixed(2)}`);
      console.log(`   Gross: $${gross.toFixed(2)}`);
      
      licenseeResults.push({
        licenseeName,
        licenseeId: licenseeId.toString(),
        moneyIn,
        moneyOut,
        gross,
        locationCount: locations.length,
        machineCount: machines.length,
      });
    }
    
    // Also check for unassigned locations (null licensee)
    console.log(`\n🔍 Processing Unassigned Locations (null licensee)`);
    const unassignedLocations = await db.collection('gaminglocations').find({
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
      $or: [
        { 'rel.licencee': null },
        { 'rel.licencee': { $exists: false } },
      ],
    }, { projection: { _id: 1, name: 1 } }).toArray();
    
    console.log(`   Locations: ${unassignedLocations.length}`);
    
    if (unassignedLocations.length > 0) {
      const unassignedLocationIds = unassignedLocations.map(l => l._id);
      const unassignedMachines = await db.collection('machines').find({
        gamingLocation: { $in: unassignedLocationIds },
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2020-01-01') } },
        ],
      }, { projection: { _id: 1 } }).toArray();
      
      console.log(`   Machines: ${unassignedMachines.length}`);
      
      if (unassignedMachines.length > 0) {
        const unassignedMachineIds = unassignedMachines.map(m => m._id);
        const unassignedAggregation = await db.collection('meters').aggregate([
          {
            $match: {
              machine: { $in: unassignedMachineIds },
              readAt: {
                $gte: yesterday,
                $lte: today,
              },
            },
          },
          {
            $group: {
              _id: null,
              totalDrop: { $sum: '$movement.drop' },
              totalCancelled: { $sum: '$movement.totalCancelledCredits' },
            },
          },
        ]).toArray();
        
        const unassignedResult = unassignedAggregation[0] || {
          totalDrop: 0,
          totalCancelled: 0,
        };
        
        const unassignedMoneyIn = unassignedResult.totalDrop || 0;
        const unassignedMoneyOut = unassignedResult.totalCancelled || 0;
        const unassignedGross = unassignedMoneyIn - unassignedMoneyOut;
        
        console.log(`   Money In: $${unassignedMoneyIn.toFixed(2)}`);
        console.log(`   Money Out: $${unassignedMoneyOut.toFixed(2)}`);
        console.log(`   Gross: $${unassignedGross.toFixed(2)}`);
        
        licenseeResults.push({
          licenseeName: 'Unassigned',
          licenseeId: null,
          moneyIn: unassignedMoneyIn,
          moneyOut: unassignedMoneyOut,
          gross: unassignedGross,
          locationCount: unassignedLocations.length,
          machineCount: unassignedMachines.length,
        });
      }
    }
    
    // Sum all licensee results
    const total = licenseeResults.reduce((sum, lic) => ({
      moneyIn: sum.moneyIn + lic.moneyIn,
      moneyOut: sum.moneyOut + lic.moneyOut,
      gross: sum.gross + lic.gross,
    }), { moneyIn: 0, moneyOut: 0, gross: 0 });
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total Money In: $${total.moneyIn.toFixed(2)}`);
    console.log(`   Total Money Out: $${total.moneyOut.toFixed(2)}`);
    console.log(`   Total Gross: $${total.gross.toFixed(2)}`);
    console.log(`   Licensees with data: ${licenseeResults.filter(l => l.moneyIn > 0).length}`);
    
    console.log(`\n📋 Breakdown by Licensee:`);
    licenseeResults.forEach(lic => {
      if (lic.moneyIn > 0) {
        console.log(`   ${lic.licenseeName}: $${lic.moneyIn.toFixed(2)} (${lic.locationCount} locations, ${lic.machineCount} machines)`);
      }
    });
    
    // Compare with raw total (all locations, no licensee grouping)
    console.log(`\n🔍 Comparing with Raw Total (all locations, no licensee grouping):`);
    const allLocations = await db.collection('gaminglocations').find({
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    }, { projection: { _id: 1 } }).toArray();
    
    const allLocationIds = allLocations.map(l => l._id);
    const allMachines = await db.collection('machines').find({
      gamingLocation: { $in: allLocationIds },
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    }, { projection: { _id: 1 } }).toArray();
    
    const allMachineIds = allMachines.map(m => m._id);
    const rawAggregation = await db.collection('meters').aggregate([
      {
        $match: {
          machine: { $in: allMachineIds },
          readAt: {
            $gte: yesterday,
            $lte: today,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalDrop: { $sum: '$movement.drop' },
          totalCancelled: { $sum: '$movement.totalCancelledCredits' },
        },
      },
    ]).toArray();
    
    const rawResult = rawAggregation[0] || {
      totalDrop: 0,
      totalCancelled: 0,
    };
    
    const rawMoneyIn = rawResult.totalDrop || 0;
    const rawMoneyOut = rawResult.totalCancelled || 0;
    const rawGross = rawMoneyIn - rawMoneyOut;
    
    console.log(`   Raw Total Money In: $${rawMoneyIn.toFixed(2)}`);
    console.log(`   Dashboard Method Total: $${total.moneyIn.toFixed(2)}`);
    console.log(`   Difference: $${Math.abs(rawMoneyIn - total.moneyIn).toFixed(2)}`);
    
    if (Math.abs(rawMoneyIn - total.moneyIn) > 0.01) {
      console.log(`\n❌ MISMATCH! Dashboard method is missing $${Math.abs(rawMoneyIn - total.moneyIn).toFixed(2)}`);
      console.log(`\n🔍 Checking for locations without licensee assignment...`);
      
      // Check if there are locations that don't match any licensee
      const allLocationIdsSet = new Set(allLocationIds.map(id => id.toString()));
      const licenseeLocationIds = new Set();
      licenseeResults.forEach(lic => {
        // This would need to be tracked during processing
      });
    } else {
      console.log(`\n✅ Both methods return the same total!`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

investigate().catch(console.error);

