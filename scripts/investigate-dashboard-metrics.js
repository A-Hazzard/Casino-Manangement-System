/**
 * Dashboard Metrics Investigation Script
 * 
 * Purpose: Investigate dashboard totals (money in, money out, gross) aggregated from all machines
 * 
 * Usage:
 *   node scripts/investigate-dashboard-metrics.js
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
const dbName = 'sas-prod';

async function investigateDashboardMetrics() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(dbName);

    console.log('📊 DASHBOARD METRICS INVESTIGATION');
    console.log('='.repeat(100));

    // Get all machines with collection meters
    const machines = await db
      .collection('machines')
      .find(
        {},
        {
          projection: {
            _id: 1,
            serialNumber: 1,
            'custom.name': 1,
            gamingLocation: 1,
            collectionMeters: 1,
            collectionTime: 1,
          },
        }
      )
      .toArray();

    console.log(`\n🎰 Total Machines: ${machines.length}`);

    // Calculate totals
    let totalMetersIn = 0;
    let totalMetersOut = 0;
    let machinesWithMeters = 0;
    let machinesWithoutMeters = 0;

    const locationTotals = {};

    for (const machine of machines) {
      if (machine.collectionMeters) {
        const metersIn = machine.collectionMeters.metersIn || 0;
        const metersOut = machine.collectionMeters.metersOut || 0;

        totalMetersIn += metersIn;
        totalMetersOut += metersOut;
        machinesWithMeters++;

        // Track by location
        const locationId = machine.gamingLocation?.toString() || 'Unassigned';
        if (!locationTotals[locationId]) {
          locationTotals[locationId] = {
            metersIn: 0,
            metersOut: 0,
            count: 0,
            machines: [],
          };
        }
        locationTotals[locationId].metersIn += metersIn;
        locationTotals[locationId].metersOut += metersOut;
        locationTotals[locationId].count++;
        locationTotals[locationId].machines.push({
          name: machine.custom?.name || machine.serialNumber,
          metersIn,
          metersOut,
        });
      } else {
        machinesWithoutMeters++;
      }
    }

    const gross = totalMetersIn - totalMetersOut;

    console.log('\n💰 AGGREGATED TOTALS:');
    console.log(`   Total Meters In:  ${totalMetersIn.toFixed(2)}`);
    console.log(`   Total Meters Out: ${totalMetersOut.toFixed(2)}`);
    console.log(`   Gross:            ${gross.toFixed(2)}`);

    console.log('\n📈 MACHINE STATUS:');
    console.log(`   Machines with meters:    ${machinesWithMeters}`);
    console.log(`   Machines without meters: ${machinesWithoutMeters}`);

    // Get location names
    const locationIds = Object.keys(locationTotals)
      .filter(id => id !== 'Unassigned')
      .map(id => new ObjectId(id));

    const locations = await db
      .collection('gaminglocations')
      .find({ _id: { $in: locationIds } }, { projection: { _id: 1, name: 1 } })
      .toArray();

    const locationNameMap = {};
    locations.forEach(loc => {
      locationNameMap[loc._id.toString()] = loc.name;
    });

    console.log('\n📍 BREAKDOWN BY LOCATION:');
    console.log(
      '   ' +
        'Location'.padEnd(30) +
        'Machines'.padEnd(12) +
        'In'.padEnd(15) +
        'Out'.padEnd(15) +
        'Gross'
    );
    console.log('   ' + '-'.repeat(95));

    Object.entries(locationTotals)
      .sort((a, b) => b[1].metersIn - a[1].metersIn)
      .forEach(([locationId, data]) => {
        const locationName =
          locationId === 'Unassigned'
            ? 'Unassigned'
            : (locationNameMap[locationId] || 'Unknown').substring(0, 28);
        const count = data.count.toString();
        const metersIn = data.metersIn.toFixed(2);
        const metersOut = data.metersOut.toFixed(2);
        const locationGross = (data.metersIn - data.metersOut).toFixed(2);

        console.log(
          '   ' +
            locationName.padEnd(30) +
            count.padEnd(12) +
            metersIn.padEnd(15) +
            metersOut.padEnd(15) +
            locationGross
        );
      });

    // Show top 10 machines by gross
    console.log('\n🏆 TOP 10 MACHINES BY GROSS:');
    const machinesWithGross = machines
      .filter(m => m.collectionMeters)
      .map(m => ({
        name: m.custom?.name || m.serialNumber || m._id,
        metersIn: m.collectionMeters.metersIn || 0,
        metersOut: m.collectionMeters.metersOut || 0,
        gross:
          (m.collectionMeters.metersIn || 0) -
          (m.collectionMeters.metersOut || 0),
        lastCollection: m.collectionTime,
      }))
      .sort((a, b) => b.gross - a.gross)
      .slice(0, 10);

    console.log(
      '   ' +
        'Machine Name'.padEnd(30) +
        'Meters In'.padEnd(15) +
        'Meters Out'.padEnd(15) +
        'Gross'.padEnd(15) +
        'Last Collection'
    );
    console.log('   ' + '-'.repeat(100));

    machinesWithGross.forEach((machine, index) => {
      const name = machine.name.substring(0, 28);
      const metersIn = machine.metersIn.toFixed(2);
      const metersOut = machine.metersOut.toFixed(2);
      const gross = machine.gross.toFixed(2);
      const lastCollection = machine.lastCollection
        ? new Date(machine.lastCollection).toLocaleDateString()
        : 'Never';

      console.log(
        `${(index + 1).toString().padStart(2)}. ` +
          name.padEnd(28) +
          metersIn.padEnd(15) +
          metersOut.padEnd(15) +
          gross.padEnd(15) +
          lastCollection
      );
    });

    console.log('\n' + '='.repeat(100));
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
  console.log('🔍 Investigating ALL locations (Dashboard view)\n');
}

investigateLocationMeters(locationId);

