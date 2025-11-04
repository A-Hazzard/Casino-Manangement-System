/**
 * Location Meters Investigation Script
 * 
 * Purpose: Investigate aggregated meter data for specific location or all locations
 * 
 * Usage:
 *   node scripts/investigate-location-meters.js [locationId]
 *   node scripts/investigate-location-meters.js                    // All locations
 *   node scripts/investigate-location-meters.js 507f1f77bcf86cd799  // Specific location
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGO_URI;
const dbName = 'sas-prod';

async function investigateLocationMeters(locationId = null) {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(dbName);

    // Build match stage
    const matchStage = locationId
      ? { gamingLocation: new ObjectId(locationId) }
      : {};

    // Aggregate machine data by location
    const locationMetrics = await db
      .collection('machines')
      .aggregate([
        { $match: matchStage },
        {
          $lookup: {
            from: 'gaminglocations',
            localField: 'gamingLocation',
            foreignField: '_id',
            as: 'location',
          },
        },
        { $unwind: { path: '$location', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$gamingLocation',
            locationName: { $first: '$location.name' },
            machineCount: { $sum: 1 },
            totalMetersIn: { $sum: { $ifNull: ['$collectionMeters.metersIn', 0] } },
            totalMetersOut: {
              $sum: { $ifNull: ['$collectionMeters.metersOut', 0] },
            },
            machines: {
              $push: {
                id: '$_id',
                name: {
                  $ifNull: ['$custom.name', '$serialNumber'],
                },
                metersIn: { $ifNull: ['$collectionMeters.metersIn', 0] },
                metersOut: { $ifNull: ['$collectionMeters.metersOut', 0] },
                collectionTime: '$collectionTime',
              },
            },
          },
        },
        { $sort: { locationName: 1 } },
      ])
      .toArray();

    if (locationMetrics.length === 0) {
      console.log('❌ No locations found');
      return;
    }

    console.log(`📊 Found ${locationMetrics.length} location(s)\n`);
    console.log('='.repeat(100));

    for (const loc of locationMetrics) {
      const locationName = loc.locationName || 'Unassigned';
      const gross = loc.totalMetersIn - loc.totalMetersOut;

      console.log(`\n📍 Location: ${locationName}`);
      console.log(`   Location ID: ${loc._id}`);
      console.log('-'.repeat(100));

      console.log('\n💰 Aggregated Totals:');
      console.log(`   Total Meters In:  ${loc.totalMetersIn.toFixed(2)}`);
      console.log(`   Total Meters Out: ${loc.totalMetersOut.toFixed(2)}`);
      console.log(`   Gross:            ${gross.toFixed(2)}`);
      console.log(`   Machine Count:    ${loc.machineCount}`);

      console.log('\n🎰 Machines:');
      console.log(
        '   ' +
          'Machine Name'.padEnd(30) +
          'Meters In'.padEnd(15) +
          'Meters Out'.padEnd(15) +
          'Gross'.padEnd(15) +
          'Last Collection'
      );
      console.log('   ' + '-'.repeat(100));

      loc.machines.forEach(machine => {
        const name = (machine.name || 'Unknown').substring(0, 28);
        const metersIn = machine.metersIn.toFixed(2);
        const metersOut = machine.metersOut.toFixed(2);
        const machineGross = (machine.metersIn - machine.metersOut).toFixed(2);
        const lastCollection = machine.collectionTime
          ? new Date(machine.collectionTime).toLocaleDateString()
          : 'Never';

        console.log(
          '   ' +
            name.padEnd(30) +
            metersIn.padEnd(15) +
            metersOut.padEnd(15) +
            machineGross.padEnd(15) +
            lastCollection
        );
      });

      console.log('\n' + '='.repeat(100));
    }

    // Summary
    console.log('\n📊 SUMMARY:');
    const grandTotalIn = locationMetrics.reduce(
      (sum, loc) => sum + loc.totalMetersIn,
      0
    );
    const grandTotalOut = locationMetrics.reduce(
      (sum, loc) => sum + loc.totalMetersOut,
      0
    );
    const grandGross = grandTotalIn - grandTotalOut;
    const totalMachines = locationMetrics.reduce(
      (sum, loc) => sum + loc.machineCount,
      0
    );

    console.log(`   Total Locations: ${locationMetrics.length}`);
    console.log(`   Total Machines:  ${totalMachines}`);
    console.log(`   Grand Total In:  ${grandTotalIn.toFixed(2)}`);
    console.log(`   Grand Total Out: ${grandTotalOut.toFixed(2)}`);
    console.log(`   Grand Gross:     ${grandGross.toFixed(2)}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await client.close();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Get location ID from command line argument
const locationId = process.argv[2] || null;

if (locationId) {
  console.log(`🔍 Investigating specific location: ${locationId}\n`);
} else {
  console.log('🔍 Investigating ALL locations\n');
}

investigateLocationMeters(locationId);

