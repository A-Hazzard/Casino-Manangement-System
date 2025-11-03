/**
 * Check Raw Meter Value from Database
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = 'evolution';

async function checkRawMeterValue() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(DB_NAME);

    // Find TEST machine
    const machine = await db.collection('machines').findOne({
      serialNumber: 'TEST',
    });

    console.log('\nTEST Machine:');
    console.log('  ID:', machine._id);
    console.log('  Location:', machine.gamingLocation);

    // Find meters for this machine on Oct 31, 2025
    const meters = await db
      .collection('meters')
      .find({
        machine: machine._id.toString(),
        readAt: {
          $gte: new Date('2025-10-31T12:00:00.000Z'), // 8 AM Trinidad = 12 PM UTC
          $lte: new Date('2025-11-01T12:00:00.000Z'),
        },
      })
      .toArray();

    console.log(`\nFound ${meters.length} meter readings for Oct 31, 2025:`);
    meters.forEach((meter, i) => {
      console.log(`\n  Reading ${i + 1}:`);
      console.log(`    readAt: ${meter.readAt}`);
      console.log(`    movement.drop: ${meter.movement?.drop || 0}`);
      console.log(`    movement.coinIn: ${meter.movement?.coinIn || 0}`);
      console.log(`    movement.jackpot: ${meter.movement?.jackpot || 0}`);
    });

    // Also check aggregated total
    const aggregation = await db
      .collection('meters')
      .aggregate([
        {
          $match: {
            machine: machine._id.toString(),
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
            totalCoinIn: { $sum: { $ifNull: ['$movement.coinIn', 0] } },
            totalJackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
          },
        },
      ])
      .toArray();

    console.log('\nAggregated Total:');
    if (aggregation.length > 0) {
      console.log(`  Total Drop: $${aggregation[0].totalDrop}`);
      console.log(`  Total Coin In: $${aggregation[0].totalCoinIn}`);
      console.log(`  Total Jackpot: $${aggregation[0].totalJackpot}`);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkRawMeterValue();
