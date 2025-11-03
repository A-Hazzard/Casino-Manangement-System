/**
 * Check DevLabTuna Machines
 */

const { MongoClient } = require('mongodb');

require('dotenv').config();
const MONGODB_URI = process.env.MONGO_URI;
const DB_NAME = 'sas-dev';
const LOCATION_ID = '2691c7cb97750118b3ec290e';

async function checkMachines() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(DB_NAME);

    // Find all machines at DevLabTuna
    const machines = await db
      .collection('machines')
      .find({
        gamingLocation: LOCATION_ID,
      })
      .toArray();

    console.log(`\nFound ${machines.length} machines at DevLabTuna:`);
    machines.forEach((machine, i) => {
      console.log(`\n  Machine ${i + 1}:`);
      console.log(`    ID: ${machine._id}`);
      console.log(`    Serial Number: ${machine.serialNumber || 'N/A'}`);
      console.log(`    Custom Name: ${machine.Custom?.name || 'N/A'}`);
    });

    // Now check meters for the first machine on Oct 31
    if (machines.length > 0) {
      const firstMachine = machines[0];
      console.log(`\n\nChecking meters for machine: ${firstMachine.serialNumber || firstMachine.Custom?.name || firstMachine._id}`);

      const meters = await db
        .collection('meters')
        .find({
          machine: firstMachine._id.toString(),
          readAt: {
            $gte: new Date('2025-10-31T12:00:00.000Z'), // 8 AM Trinidad
            $lte: new Date('2025-11-01T12:00:00.000Z'),
          },
        })
        .toArray();

      console.log(`\nFound ${meters.length} meter readings for Oct 31:`);
      meters.forEach((meter, i) => {
        console.log(`\n  Reading ${i + 1}:`);
        console.log(`    readAt: ${meter.readAt}`);
        console.log(`    movement.drop: ${meter.movement?.drop || 0}`);
        console.log(`    movement.coinIn: ${meter.movement?.coinIn || 0}`);
      });

      // Aggregated total
      const agg = await db
        .collection('meters')
        .aggregate([
          {
            $match: {
              machine: firstMachine._id.toString(),
              readAt: {
                $gte: new Date('2025-10-31T12:00:00.000Z'),
                $lte: new Date('2025-11-01T12:00:00.000Z'),
              },
            },
          },
          {
            $group: {
              _id: '$machine',
              totalDrop: { $sum: { $ifNull: ['$movement.drop', 0] } },
            },
          },
        ])
        .toArray();

      console.log('\nAggregated Total Drop:');
      if (agg.length > 0) {
        console.log(`  $${agg[0].totalDrop}`);
      } else {
        console.log('  No data');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkMachines();

