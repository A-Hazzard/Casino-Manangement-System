/**
 * Quick API Comparison - Production Database
 *
 * Quickly compares a few sample locations to identify differences
 * READ-ONLY - Does not modify any data
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGODB_URI ||
  process.env.MONGODB_URL ||
  process.env.DATABASE_URL;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

async function main() {
  console.log('🔍 Quick API Comparison - Production Database\n');
  console.log('⚠️  READ-ONLY MODE - No data will be modified\n');

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();

    // Get a few sample locations
    const sampleLocations = await db
      .collection('gaminglocations')
      .find(
        {
          $or: [
            { deletedAt: null },
            { deletedAt: { $lt: new Date('2020-01-01') } },
          ],
        },
        {
          projection: {
            _id: 1,
            name: 1,
            gameDayOffset: 1,
            'rel.licencee': 1,
          },
        }
      )
      .limit(5)
      .toArray();

    console.log(`📊 Testing ${sampleLocations.length} sample locations:\n`);
    sampleLocations.forEach(loc => {
      console.log(`   - ${loc.name} (${loc._id.toString()})`);
    });
    console.log();

    // Calculate gaming day range for "Yesterday"
    const nowUtc = new Date();
    const timezoneOffset = -4;
    const nowLocal = new Date(
      nowUtc.getTime() + timezoneOffset * 60 * 60 * 1000
    );
    const today = new Date(
      Date.UTC(
        nowLocal.getUTCFullYear(),
        nowLocal.getUTCMonth(),
        nowLocal.getUTCDate()
      )
    );
    const currentHour = nowLocal.getUTCHours();
    const yesterdayBase =
      currentHour < 8
        ? new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
        : new Date(today.getTime() - 24 * 60 * 60 * 1000);

    for (const location of sampleLocations) {
      const locationId = location._id.toString();
      const gameDayOffset = location.gameDayOffset ?? 8;

      const rangeStart = new Date(yesterdayBase);
      rangeStart.setUTCHours(gameDayOffset - timezoneOffset, 0, 0, 0);

      const rangeEnd = new Date(yesterdayBase);
      rangeEnd.setDate(rangeEnd.getDate() + 1);
      rangeEnd.setUTCHours(gameDayOffset - timezoneOffset, 0, 0, 0);
      rangeEnd.setMilliseconds(rangeEnd.getMilliseconds() - 1);

      console.log(`\n📍 ${location.name} (${locationId}):`);
      console.log(
        `   Gaming Day Range: ${rangeStart.toISOString()} to ${rangeEnd.toISOString()}`
      );

      // Method 1: Query machines by string locationId (locationAggregation style)
      const machines1 = await db
        .collection('machines')
        .find(
          {
            gamingLocation: locationId, // String
            $or: [
              { deletedAt: null },
              { deletedAt: { $lt: new Date('2020-01-01') } },
            ],
          },
          {
            projection: { _id: 1 },
          }
        )
        .toArray();

      const machineIds1 = machines1.map(m => m._id.toString());
      console.log(`   Machines found (string query): ${machineIds1.length}`);

      if (machineIds1.length > 0) {
        const meters1 = await db
          .collection('meters')
          .aggregate([
            {
              $match: {
                machine: { $in: machineIds1 },
                readAt: { $gte: rangeStart, $lte: rangeEnd },
              },
            },
            {
              $group: {
                _id: null,
                moneyIn: { $sum: { $ifNull: ['$movement.drop', 0] } },
                moneyOut: {
                  $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
                },
              },
            },
          ])
          .toArray();

        const result1 = meters1[0] || { moneyIn: 0, moneyOut: 0 };
        console.log(
          `   Money In (string query): ${(result1.moneyIn || 0).toFixed(2)}`
        );
      }

      // Method 2: Check if ObjectId query would find different machines
      try {
        const ObjectId = require('mongodb').ObjectId;
        const machines2 = await db
          .collection('machines')
          .find(
            {
              gamingLocation: new ObjectId(locationId), // ObjectId
              $or: [
                { deletedAt: null },
                { deletedAt: { $lt: new Date('2020-01-01') } },
              ],
            },
            {
              projection: { _id: 1 },
            }
          )
          .toArray();

        if (machines2.length !== machines1.length) {
          console.log(
            `   ⚠️  WARNING: ObjectId query found ${machines2.length} machines (different from string query!)`
          );
        }
      } catch (e) {
        // ObjectId query failed, which is expected if locationId is not a valid ObjectId
      }

      // Check machine gamingLocation field types
      if (machineIds1.length > 0) {
        const sampleMachine = await db
          .collection('machines')
          .findOne(
            { _id: machineIds1[0] },
            { projection: { gamingLocation: 1 } }
          );

        if (sampleMachine) {
          console.log(
            `   Machine gamingLocation type: ${typeof sampleMachine.gamingLocation}`
          );
          console.log(
            `   Machine gamingLocation value: ${sampleMachine.gamingLocation}`
          );
          console.log(
            `   Location ID matches: ${sampleMachine.gamingLocation === locationId}`
          );
        }
      }
    }

    console.log('\n✅ Comparison complete\n');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('✅ Disconnected from MongoDB');
  }
}

main();
