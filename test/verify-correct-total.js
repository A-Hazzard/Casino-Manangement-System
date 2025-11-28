/**
 * Verify Correct Total - Production Database
 *
 * Queries the database directly to determine the "true" total
 * and compares it with what each API should return
 *
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
  console.log('🔍 Verifying Correct Total - Production Database\n');
  console.log('⚠️  READ-ONLY MODE - No data will be modified\n');

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();

    // Test parameters
    const timePeriod = 'Yesterday';
    console.log(`📊 Test Parameters: Time Period = ${timePeriod}\n`);

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
    // STEP 1: Get ALL locations (with deletedAt filtering)
    // ============================================================================
    console.log('📍 Fetching ALL locations (with deletedAt filter)...');
    const allLocations = await db
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
            deletedAt: 1,
          },
        }
      )
      .toArray();

    console.log(
      `   Found ${allLocations.length} locations (after deletedAt filter)\n`
    );

    // ============================================================================
    // STEP 2: Get ALL locations WITHOUT deletedAt filtering
    // ============================================================================
    console.log('📍 Fetching ALL locations (WITHOUT deletedAt filter)...');
    const allLocationsIncludingDeleted = await db
      .collection('gaminglocations')
      .find(
        {},
        {
          projection: {
            _id: 1,
            name: 1,
            gameDayOffset: 1,
            'rel.licencee': 1,
            deletedAt: 1,
          },
        }
      )
      .toArray();

    const deletedCount =
      allLocationsIncludingDeleted.length - allLocations.length;
    console.log(
      `   Found ${allLocationsIncludingDeleted.length} total locations (${deletedCount} deleted)\n`
    );

    // ============================================================================
    // STEP 3: Calculate totals with deletedAt filtering (like APIs should)
    // ============================================================================
    console.log('🔍 Calculating totals WITH deletedAt filtering...');
    let totalWithDeletedAtFilter = { moneyIn: 0, moneyOut: 0, gross: 0 };
    const locationTotals = [];

    for (const location of allLocations) {
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

      if (machines.length === 0) continue;

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

      if (moneyIn > 0) {
        locationTotals.push({
          locationId,
          locationName: location.name,
          moneyIn,
          deletedAt: location.deletedAt,
        });
        totalWithDeletedAtFilter.moneyIn += moneyIn;
        totalWithDeletedAtFilter.moneyOut += moneyOut;
        totalWithDeletedAtFilter.gross += gross;
      }
    }

    console.log(
      `   Total WITH deletedAt filter: Money In = ${totalWithDeletedAtFilter.moneyIn.toFixed(2)}`
    );
    console.log(`   Locations with data: ${locationTotals.length}\n`);

    // ============================================================================
    // STEP 4: Calculate totals WITHOUT deletedAt filtering
    // ============================================================================
    console.log('🔍 Calculating totals WITHOUT deletedAt filtering...');
    let totalWithoutDeletedAtFilter = { moneyIn: 0, moneyOut: 0, gross: 0 };

    for (const location of allLocationsIncludingDeleted) {
      const locationId = location._id.toString();
      const gameDayOffset = location.gameDayOffset ?? 8;

      const rangeStart = new Date(yesterdayBase);
      rangeStart.setUTCHours(gameDayOffset - timezoneOffset, 0, 0, 0);

      const rangeEnd = new Date(yesterdayBase);
      rangeEnd.setDate(rangeEnd.getDate() + 1);
      rangeEnd.setUTCHours(gameDayOffset - timezoneOffset, 0, 0, 0);
      rangeEnd.setMilliseconds(rangeEnd.getMilliseconds() - 1);

      // Get machines WITHOUT deletedAt filter
      const machines = await db
        .collection('machines')
        .find(
          {
            gamingLocation: locationId,
            // NO deletedAt filter
          },
          {
            projection: { _id: 1 },
          }
        )
        .toArray();

      if (machines.length === 0) continue;

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

      totalWithoutDeletedAtFilter.moneyIn += moneyIn;
      totalWithoutDeletedAtFilter.moneyOut += moneyOut;
      totalWithoutDeletedAtFilter.gross += gross;
    }

    console.log(
      `   Total WITHOUT deletedAt filter: Money In = ${totalWithoutDeletedAtFilter.moneyIn.toFixed(2)}\n`
    );

    // ============================================================================
    // STEP 5: Compare and report
    // ============================================================================
    console.log('📊 COMPARISON RESULTS:\n');
    console.log('='.repeat(80));
    console.log(
      `WITH deletedAt filter (correct):    Money In = ${totalWithDeletedAtFilter.moneyIn.toFixed(2)}`
    );
    console.log(
      `WITHOUT deletedAt filter (wrong):   Money In = ${totalWithoutDeletedAtFilter.moneyIn.toFixed(2)}`
    );
    console.log(
      `Difference: ${(totalWithoutDeletedAtFilter.moneyIn - totalWithDeletedAtFilter.moneyIn).toFixed(2)}`
    );
    console.log('='.repeat(80));
    console.log();

    // Show locations with deletedAt
    const locationsWithDeletedAt = locationTotals.filter(loc => loc.deletedAt);
    if (locationsWithDeletedAt.length > 0) {
      console.log(
        `⚠️  Found ${locationsWithDeletedAt.length} locations with deletedAt that have data:\n`
      );
      locationsWithDeletedAt.slice(0, 5).forEach(loc => {
        console.log(
          `   ${loc.locationName}: ${loc.moneyIn.toFixed(2)} (deletedAt: ${loc.deletedAt})`
        );
      });
      if (locationsWithDeletedAt.length > 5) {
        console.log(`   ... and ${locationsWithDeletedAt.length - 5} more\n`);
      }
    }

    // Show top locations by money in
    console.log('📍 Top 10 locations by Money In:\n');
    locationTotals
      .sort((a, b) => b.moneyIn - a.moneyIn)
      .slice(0, 10)
      .forEach((loc, idx) => {
        console.log(
          `   ${idx + 1}. ${loc.locationName}: ${loc.moneyIn.toFixed(2)}`
        );
      });
    console.log();

    console.log('✅ Verification complete\n');
    console.log('💡 The correct total should be WITH deletedAt filtering');
    console.log(
      `   Expected: $${totalWithDeletedAtFilter.moneyIn.toFixed(2)}\n`
    );
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('✅ Disconnected from MongoDB');
  }
}

main();
