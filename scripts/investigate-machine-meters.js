/**
 * Machine Meters Investigation Script
 * 
 * Purpose: Investigate meter data (money in, money out, gross) for specific machines or all machines
 * 
 * Usage:
 *   node scripts/investigate-machine-meters.js [machineId]
 *   node scripts/investigate-machine-meters.js              // All machines
 *   node scripts/investigate-machine-meters.js 507f1f77     // Specific machine
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
const dbName = 'sas-prod';

async function investigateMachineMeters(machineId = null) {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(dbName);

    // Build query
    const query = machineId ? { _id: machineId } : {};

    // Get machines with their meters
    const machines = await db
      .collection('machines')
      .find(query, {
        projection: {
          _id: 1,
          serialNumber: 1,
          'custom.name': 1,
          collectionMeters: 1,
          collectionTime: 1,
          previousCollectionTime: 1,
          collectionMetersHistory: 1,
        },
      })
      .toArray();

    if (machines.length === 0) {
      console.log('❌ No machines found');
      return;
    }

    console.log(`📊 Found ${machines.length} machine(s)\n`);
    console.log('='.repeat(100));

    for (const machine of machines) {
      const machineName =
        machine.custom?.name || machine.serialNumber || machine._id;

      console.log(`\n🎰 Machine: ${machineName} (ID: ${machine._id})`);
      console.log('-'.repeat(100));

      // Current Collection Meters
      console.log('\n📍 Current Collection Meters:');
      if (machine.collectionMeters) {
        console.log(`   Meters In:  ${machine.collectionMeters.metersIn || 0}`);
        console.log(`   Meters Out: ${machine.collectionMeters.metersOut || 0}`);
        console.log(
          `   Gross:      ${(machine.collectionMeters.metersIn || 0) - (machine.collectionMeters.metersOut || 0)}`
        );
      } else {
        console.log('   ❌ No collection meters found');
      }

      // Collection Times
      console.log('\n🕐 Collection Times:');
      console.log(
        `   Current:  ${machine.collectionTime ? new Date(machine.collectionTime).toLocaleString() : 'N/A'}`
      );
      console.log(
        `   Previous: ${machine.previousCollectionTime ? new Date(machine.previousCollectionTime).toLocaleString() : 'N/A'}`
      );

      // Collection Meters History
      console.log('\n📜 Collection Meters History:');
      if (machine.collectionMetersHistory && machine.collectionMetersHistory.length > 0) {
        console.log(`   Total Entries: ${machine.collectionMetersHistory.length}`);
        console.log('\n   Recent Collections (Last 5):');
        console.log(
          '   ' +
            'Date'.padEnd(25) +
            'In'.padEnd(12) +
            'Out'.padEnd(12) +
            'Gross'.padEnd(12) +
            'Prev In'.padEnd(12) +
            'Prev Out'.padEnd(12) +
            'Report ID'
        );
        console.log('   ' + '-'.repeat(95));

        machine.collectionMetersHistory
          .slice(-5)
          .reverse()
          .forEach(entry => {
            const date = new Date(entry.timestamp).toLocaleString();
            const metersIn = (entry.metersIn || 0).toString();
            const metersOut = (entry.metersOut || 0).toString();
            const gross = ((entry.metersIn || 0) - (entry.metersOut || 0)).toString();
            const prevIn = (entry.prevMetersIn || 0).toString();
            const prevOut = (entry.prevMetersOut || 0).toString();
            const reportId = (entry.locationReportId || 'N/A').substring(0, 8);

            console.log(
              '   ' +
                date.padEnd(25) +
                metersIn.padEnd(12) +
                metersOut.padEnd(12) +
                gross.padEnd(12) +
                prevIn.padEnd(12) +
                prevOut.padEnd(12) +
                reportId
            );
          });
      } else {
        console.log('   ❌ No collection history found');
      }

      // Get actual collections from database
      console.log('\n📋 Actual Collections (Last 5):');
      const collections = await db
        .collection('collections')
        .find({ machineId: machine._id })
        .sort({ timestamp: -1 })
        .limit(5)
        .toArray();

      if (collections.length > 0) {
        console.log(
          '   ' +
            'Date'.padEnd(25) +
            'In'.padEnd(12) +
            'Out'.padEnd(12) +
            'Movement In'.padEnd(15) +
            'Movement Out'.padEnd(15) +
            'Prev In'.padEnd(12) +
            'Prev Out'
        );
        console.log('   ' + '-'.repeat(110));

        collections.forEach(coll => {
          const date = new Date(coll.timestamp).toLocaleString();
          const metersIn = (coll.metersIn || 0).toString();
          const metersOut = (coll.metersOut || 0).toString();
          const movementIn = (coll.movement?.metersIn || 0).toString();
          const movementOut = (coll.movement?.metersOut || 0).toString();
          const prevIn = (coll.prevIn || 0).toString();
          const prevOut = (coll.prevOut || 0).toString();

          console.log(
            '   ' +
              date.padEnd(25) +
              metersIn.padEnd(12) +
              metersOut.padEnd(12) +
              movementIn.padEnd(15) +
              movementOut.padEnd(15) +
              prevIn.padEnd(12) +
              prevOut
          );
        });
      } else {
        console.log('   ❌ No collections found');
      }

      console.log('\n' + '='.repeat(100));
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

// Get machine ID from command line argument
const machineId = process.argv[2] || null;

if (machineId) {
  console.log(`🔍 Investigating specific machine: ${machineId}\n`);
} else {
  console.log('🔍 Investigating ALL machines\n');
}

investigateMachineMeters(machineId);

