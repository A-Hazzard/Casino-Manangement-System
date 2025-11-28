/**
 * Quick Verify Total - Production Database
 *
 * Quickly determines the correct total by sampling and comparing
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
  console.log('🔍 Quick Verify Total - Production Database\n');
  console.log('⚠️  READ-ONLY MODE - No data will be modified\n');

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();

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

    // ============================================================================
    // STEP 1: Get all locations with deletedAt filter
    // ============================================================================
    const locations = await db
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
          },
        }
      )
      .toArray();

    console.log(
      `📍 Found ${locations.length} locations (with deletedAt filter)\n`
    );

    // ============================================================================
    // STEP 2: Calculate total using same logic as APIs
    // ============================================================================
    console.log('🔍 Calculating total (same logic as APIs)...\n');
    let total = { moneyIn: 0, moneyOut: 0, gross: 0 };
    const locationTotals = [];

    // Process in batches to avoid timeout
    const batchSize = 50;
    for (let i = 0; i < locations.length; i += batchSize) {
      const batch = locations.slice(i, i + batchSize);
      console.log(
        `   Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(locations.length / batchSize)} (${batch.length} locations)...`
      );

      const batchResults = await Promise.all(
        batch.map(async location => {
          const locationId = location._id.toString();
          const gameDayOffset = location.gameDayOffset ?? 8;

          const rangeStart = new Date(yesterdayBase);
          rangeStart.setUTCHours(gameDayOffset - timezoneOffset, 0, 0, 0);

          const rangeEnd = new Date(yesterdayBase);
          rangeEnd.setDate(rangeEnd.getDate() + 1);
          rangeEnd.setUTCHours(gameDayOffset - timezoneOffset, 0, 0, 0);
          rangeEnd.setMilliseconds(rangeEnd.getMilliseconds() - 1);

          // Get machines with deletedAt filter
          const machines = await db
            .collection('machines')
            .find(
              {
                gamingLocation: locationId,
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

          if (machines.length === 0) {
            return {
              locationId,
              locationName: location.name,
              moneyIn: 0,
              machineCount: 0,
            };
          }

          const machineIds = machines.map(m => m._id.toString());

          // Aggregate meters
          const metrics = await db
            .collection('meters')
            .aggregate([
              {
                $match: {
                  machine: { $in: machineIds },
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

          const result = metrics[0] || { moneyIn: 0, moneyOut: 0 };
          const moneyIn = result.moneyIn || 0;
          const moneyOut = result.moneyOut || 0;
          const gross = moneyIn - moneyOut;

          return {
            locationId,
            locationName: location.name,
            moneyIn,
            moneyOut,
            gross,
            machineCount: machines.length,
          };
        })
      );

      batchResults.forEach(result => {
        if (result.moneyIn > 0) {
          locationTotals.push(result);
          total.moneyIn += result.moneyIn;
          total.moneyOut += result.moneyOut;
          total.gross += result.gross;
        }
      });
    }

    console.log(`\n✅ Calculation complete\n`);
    console.log('='.repeat(80));
    console.log(`CORRECT TOTAL (from database):`);
    console.log(`   Money In:  $${total.moneyIn.toFixed(2)}`);
    console.log(`   Money Out: $${total.moneyOut.toFixed(2)}`);
    console.log(`   Gross:     $${total.gross.toFixed(2)}`);
    console.log(`   Locations with data: ${locationTotals.length}`);
    console.log('='.repeat(80));
    console.log();

    // Show comparison
    console.log('📊 COMPARISON:\n');
    console.log(`   Locations Page:     $54,026.16`);
    console.log(`   Dashboard/Cabinets: $62,592.19`);
    console.log(`   Database Direct:    $${total.moneyIn.toFixed(2)}`);
    console.log();

    const locationsDiff = Math.abs(total.moneyIn - 54026.16);
    const dashboardDiff = Math.abs(total.moneyIn - 62592.19);

    if (locationsDiff < dashboardDiff) {
      console.log(
        `✅ Locations Page is CLOSER to database (difference: $${locationsDiff.toFixed(2)})`
      );
      console.log(
        `   Dashboard/Cabinets difference: $${dashboardDiff.toFixed(2)}`
      );
    } else {
      console.log(
        `✅ Dashboard/Cabinets is CLOSER to database (difference: $${dashboardDiff.toFixed(2)})`
      );
      console.log(`   Locations Page difference: $${locationsDiff.toFixed(2)}`);
    }
    console.log();

    // Show top locations
    console.log('📍 Top 15 locations by Money In:\n');
    locationTotals
      .sort((a, b) => b.moneyIn - a.moneyIn)
      .slice(0, 15)
      .forEach((loc, idx) => {
        console.log(
          `   ${(idx + 1).toString().padStart(2)}. ${loc.locationName.padEnd(40)} $${loc.moneyIn.toFixed(2).padStart(12)} (${loc.machineCount} machines)`
        );
      });
    console.log();
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('✅ Disconnected from MongoDB');
  }
}

main();
