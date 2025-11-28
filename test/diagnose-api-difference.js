/**
 * Diagnose API Difference - Production Database
 *
 * Compares what locations/machines are included in each API
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
  console.log('🔍 Diagnosing API Difference - Production Database\n');
  console.log('⚠️  READ-ONLY MODE - No data will be modified\n');

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();

    // Test parameters
    const timePeriod = 'Yesterday';
    const licensee = undefined; // All licensees

    console.log(`📊 Test Parameters:`);
    console.log(`   Time Period: ${timePeriod}`);
    console.log(`   Licensee: ${licensee || 'All'}\n`);

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
    // STEP 1: Get all locations (simulating reports/locations API)
    // ============================================================================
    console.log('📍 Fetching locations (reports/locations style)...');
    const locations1 = await db
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
      .toArray();

    console.log(`   Found ${locations1.length} locations\n`);

    // ============================================================================
    // STEP 2: Calculate totals using reports/locations logic
    // ============================================================================
    console.log('🔍 Calculating totals (reports/locations logic)...');
    const locationTotals1 = [];
    let total1 = { moneyIn: 0, moneyOut: 0, gross: 0 };

    for (const location of locations1) {
      const locationId = location._id.toString();
      const gameDayOffset = location.gameDayOffset ?? 8;

      const rangeStart = new Date(yesterdayBase);
      rangeStart.setUTCHours(gameDayOffset - timezoneOffset, 0, 0, 0);

      const rangeEnd = new Date(yesterdayBase);
      rangeEnd.setDate(rangeEnd.getDate() + 1);
      rangeEnd.setUTCHours(gameDayOffset - timezoneOffset, 0, 0, 0);
      rangeEnd.setMilliseconds(rangeEnd.getMilliseconds() - 1);

      // Get machines (string query - reports/locations style)
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

      // Aggregate meters (reports/locations style - with $project)
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
            $project: {
              drop: '$movement.drop',
              totalCancelledCredits: '$movement.totalCancelledCredits',
            },
          },
          {
            $group: {
              _id: null,
              moneyIn: { $sum: '$drop' },
              moneyOut: { $sum: '$totalCancelledCredits' },
            },
          },
        ])
        .toArray();

      const result = metrics[0] || { moneyIn: 0, moneyOut: 0 };
      const moneyIn = result.moneyIn || 0;
      const moneyOut = result.moneyOut || 0;
      const gross = moneyIn - moneyOut;

      if (moneyIn > 0) {
        locationTotals1.push({
          locationId,
          locationName: location.name,
          moneyIn,
          moneyOut,
          gross,
          machineCount: machines.length,
        });
        total1.moneyIn += moneyIn;
        total1.moneyOut += moneyOut;
        total1.gross += gross;
      }
    }

    console.log(
      `   Total (reports/locations style): Money In = ${total1.moneyIn.toFixed(2)}`
    );
    console.log(`   Locations with data: ${locationTotals1.length}\n`);

    // ============================================================================
    // STEP 3: Calculate totals using locationAggregation logic
    // ============================================================================
    console.log('🔍 Calculating totals (locationAggregation logic)...');
    const locationTotals2 = [];
    let total2 = { moneyIn: 0, moneyOut: 0, gross: 0 };

    for (const location of locations1) {
      const locationId = location._id.toString();
      const gameDayOffset = location.gameDayOffset ?? 8;

      const rangeStart = new Date(yesterdayBase);
      rangeStart.setUTCHours(gameDayOffset - timezoneOffset, 0, 0, 0);

      const rangeEnd = new Date(yesterdayBase);
      rangeEnd.setDate(rangeEnd.getDate() + 1);
      rangeEnd.setUTCHours(gameDayOffset - timezoneOffset, 0, 0, 0);
      rangeEnd.setMilliseconds(rangeEnd.getMilliseconds() - 1);

      // Get machines (string query - locationAggregation style)
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

      // Aggregate meters (locationAggregation style - direct $group with $ifNull)
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
              totalDrop: { $sum: { $ifNull: ['$movement.drop', 0] } },
              totalMoneyOut: {
                $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
              },
            },
          },
        ])
        .toArray();

      const result = metrics[0] || { totalDrop: 0, totalMoneyOut: 0 };
      const moneyIn = result.totalDrop || 0;
      const moneyOut = result.totalMoneyOut || 0;
      const gross = moneyIn - moneyOut;

      if (moneyIn > 0) {
        locationTotals2.push({
          locationId,
          locationName: location.name,
          moneyIn,
          moneyOut,
          gross,
          machineCount: machines.length,
        });
        total2.moneyIn += moneyIn;
        total2.moneyOut += moneyOut;
        total2.gross += gross;
      }
    }

    console.log(
      `   Total (locationAggregation style): Money In = ${total2.moneyIn.toFixed(2)}`
    );
    console.log(`   Locations with data: ${locationTotals2.length}\n`);

    // ============================================================================
    // STEP 4: Compare results
    // ============================================================================
    console.log('📊 COMPARISON RESULTS:\n');
    console.log('='.repeat(80));
    console.log(
      `Reports/Locations API Style: Money In = ${total1.moneyIn.toFixed(2)}`
    );
    console.log(
      `LocationAggregation API Style: Money In = ${total2.moneyIn.toFixed(2)}`
    );
    console.log(`Difference: ${(total2.moneyIn - total1.moneyIn).toFixed(2)}`);
    console.log('='.repeat(80));
    console.log();

    // Find locations with differences
    const locationMap1 = new Map(locationTotals1.map(l => [l.locationId, l]));
    const locationMap2 = new Map(locationTotals2.map(l => [l.locationId, l]));

    const differences = [];
    const onlyIn1 = [];
    const onlyIn2 = [];

    // Check locations in both
    for (const [locationId, loc1] of locationMap1.entries()) {
      const loc2 = locationMap2.get(locationId);
      if (loc2) {
        const diff = Math.abs(loc1.moneyIn - loc2.moneyIn);
        if (diff > 0.01) {
          differences.push({
            locationId,
            locationName: loc1.locationName,
            reportsLocations: loc1.moneyIn,
            locationAggregation: loc2.moneyIn,
            difference: loc2.moneyIn - loc1.moneyIn,
          });
        }
      } else {
        onlyIn1.push(loc1);
      }
    }

    // Check locations only in locationAggregation
    for (const [locationId, loc2] of locationMap2.entries()) {
      if (!locationMap1.has(locationId)) {
        onlyIn2.push(loc2);
      }
    }

    if (differences.length > 0) {
      console.log(
        `⚠️  Found ${differences.length} locations with value differences:\n`
      );
      differences.slice(0, 10).forEach(diff => {
        console.log(`   ${diff.locationName}:`);
        console.log(
          `      Reports/Locations: ${diff.reportsLocations.toFixed(2)}`
        );
        console.log(
          `      LocationAggregation: ${diff.locationAggregation.toFixed(2)}`
        );
        console.log(`      Difference: ${diff.difference.toFixed(2)}\n`);
      });
      if (differences.length > 10) {
        console.log(`   ... and ${differences.length - 10} more locations\n`);
      }
    }

    if (onlyIn1.length > 0) {
      console.log(
        `⚠️  Found ${onlyIn1.length} locations only in Reports/Locations API:\n`
      );
      onlyIn1.slice(0, 5).forEach(loc => {
        console.log(`   ${loc.locationName}: ${loc.moneyIn.toFixed(2)}`);
      });
      if (onlyIn1.length > 5) {
        console.log(`   ... and ${onlyIn1.length - 5} more locations\n`);
      }
    }

    if (onlyIn2.length > 0) {
      console.log(
        `⚠️  Found ${onlyIn2.length} locations only in LocationAggregation API:\n`
      );
      onlyIn2.slice(0, 5).forEach(loc => {
        console.log(`   ${loc.locationName}: ${loc.moneyIn.toFixed(2)}`);
      });
      if (onlyIn2.length > 5) {
        console.log(`   ... and ${onlyIn2.length - 5} more locations\n`);
      }
    }

    if (
      differences.length === 0 &&
      onlyIn1.length === 0 &&
      onlyIn2.length === 0
    ) {
      console.log('✅ No differences found in location-level aggregation\n');
      console.log(
        '🔍 The difference might be in licensee filtering or location access control\n'
      );
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('✅ Disconnected from MongoDB');
  }
}

main();
