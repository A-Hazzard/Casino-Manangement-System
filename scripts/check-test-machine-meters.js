/**
 * Check TEST Machine Meters
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGO_URI;
const DB_NAME = 'sas-dev';
const MACHINE_ID = '68f7ce36f5ea2df7999881aa'; // TEST machine

async function checkTestMachine() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB\n');

    const db = client.db(DB_NAME);

    // Find all meters for TEST machine
    const allMeters = await db
      .collection('meters')
      .find({ machine: MACHINE_ID })
      .sort({ readAt: -1 })
      .limit(10)
      .toArray();

    console.log(`Latest 10 meter readings for TEST machine:\n`);
    allMeters.forEach((meter, i) => {
      console.log(`Reading ${i + 1}:`);
      console.log(`  readAt: ${meter.readAt}`);
      console.log(`  movement.drop: ${meter.movement?.drop || 0}`);
      console.log(`  movement.coinIn: ${meter.movement?.coinIn || 0}`);
      console.log('');
    });

    // Check Nov 1, 2025 (Today filter)
    console.log('\n=== Nov 1, 2025 (Today) ===');
    const todayMeters = await db
      .collection('meters')
      .aggregate([
        {
          $match: {
            machine: MACHINE_ID,
            readAt: {
              $gte: new Date('2025-11-01T12:00:00.000Z'), // 8 AM Trinidad Nov 1
              $lte: new Date('2025-11-02T12:00:00.000Z'), // 8 AM Trinidad Nov 2
            },
          },
        },
        {
          $group: {
            _id: '$machine',
            totalDrop: { $sum: { $ifNull: ['$movement.drop', 0] } },
            totalCoinIn: { $sum: { $ifNull: ['$movement.coinIn', 0] } },
          },
        },
      ])
      .toArray();

    if (todayMeters.length > 0) {
      console.log(`Total Drop: $${todayMeters[0].totalDrop}`);
      console.log(`Total Coin In: $${todayMeters[0].totalCoinIn}`);
    } else {
      console.log('No data for Nov 1, 2025');
    }

    // Check Oct 31, 2025 (Yesterday/Custom)
    console.log('\n=== Oct 31, 2025 (Yesterday/Custom) ===');
    const yesterdayMeters = await db
      .collection('meters')
      .aggregate([
        {
          $match: {
            machine: MACHINE_ID,
            readAt: {
              $gte: new Date('2025-10-31T12:00:00.000Z'), // 8 AM Trinidad Oct 31
              $lte: new Date('2025-11-01T12:00:00.000Z'), // 8 AM Trinidad Nov 1
            },
          },
        },
        {
          $group: {
            _id: '$machine',
            totalDrop: { $sum: { $ifNull: ['$movement.drop', 0] } },
            totalCoinIn: { $sum: { $ifNull: ['$movement.coinIn', 0] } },
          },
        },
      ])
      .toArray();

    if (yesterdayMeters.length > 0) {
      console.log(`Total Drop: $${yesterdayMeters[0].totalDrop}`);
      console.log(`Total Coin In: $${yesterdayMeters[0].totalCoinIn}`);
    } else {
      console.log('No data for Oct 31, 2025');
    }

    // Get location details
    const machine = await db.collection('machines').findOne({ _id: MACHINE_ID });
    if (machine) {
      const location = await db
        .collection('gaminglocations')
        .findOne({ _id: machine.gamingLocation });
      
      console.log('\n=== Location Details ===');
      console.log(`Location: ${location?.name}`);
      console.log(`Licensee: ${location?.rel?.licencee || 'None'}`);
      console.log(`Country: ${location?.country || 'None'}`);
      console.log(`Gaming Day Offset: ${location?.gameDayOffset ?? 8} AM`);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkTestMachine();

