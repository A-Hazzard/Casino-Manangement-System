/**
 * Compare APIs - Production Database
 *
 * Compares the responses from:
 * - /api/locationAggregation (Dashboard)
 * - /api/reports/locations (Locations Page)
 * - /api/machines/aggregation (Cabinets Page)
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
  console.log('🔍 Comparing APIs for Production Database\n');
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

    // ============================================================================
    // STEP 1: Get locations and their gaming day ranges
    // ============================================================================
    console.log('📍 Fetching locations...');
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
            'rel.licencee': 1,
            country: 1,
          },
        }
      )
      .toArray();

    console.log(`   Found ${locations.length} locations\n`);

    // ============================================================================
    // STEP 2: Calculate gaming day ranges for each location
    // ============================================================================
    console.log('📅 Calculating gaming day ranges...');

    // Simple gaming day range calculation for "Yesterday"
    const nowUtc = new Date();
    const timezoneOffset = -4; // UTC-4 for Trinidad/Guyana/Barbados
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

    const locationRanges = locations.map(loc => {
      const gameDayOffset = loc.gameDayOffset ?? 8;
      const rangeStart = new Date(yesterdayBase);
      rangeStart.setUTCHours(gameDayOffset - timezoneOffset, 0, 0, 0);

      const rangeEnd = new Date(yesterdayBase);
      rangeEnd.setDate(rangeEnd.getDate() + 1);
      rangeEnd.setUTCHours(gameDayOffset - timezoneOffset, 0, 0, 0);
      rangeEnd.setMilliseconds(rangeEnd.getMilliseconds() - 1);

      return {
        locationId: loc._id.toString(),
        locationName: loc.name,
        gameDayOffset,
        rangeStart,
        rangeEnd,
        licensee: loc.rel?.licencee,
      };
    });

    console.log(
      `   Calculated ranges for ${locationRanges.length} locations\n`
    );

    // ============================================================================
    // STEP 3: Simulate locationAggregation API logic
    // ============================================================================
    console.log('🔍 Simulating /api/locationAggregation logic...');
    const locationAggregationResults = [];

    for (const locRange of locationRanges) {
      // Get machines for this location (as string)
      const machines = await db
        .collection('machines')
        .find(
          {
            gamingLocation: locRange.locationId,
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

      const machineIds = machines.map(m => m._id.toString());

      if (machineIds.length === 0) {
        locationAggregationResults.push({
          location: locRange.locationId,
          locationName: locRange.locationName,
          moneyIn: 0,
          machineCount: 0,
        });
        continue;
      }

      // Aggregate meters
      const metersAgg = await db
        .collection('meters')
        .aggregate([
          {
            $match: {
              machine: { $in: machineIds },
              readAt: {
                $gte: locRange.rangeStart,
                $lte: locRange.rangeEnd,
              },
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

      const result = metersAgg[0] || { moneyIn: 0, moneyOut: 0 };
      locationAggregationResults.push({
        location: locRange.locationId,
        locationName: locRange.locationName,
        moneyIn: result.moneyIn || 0,
        moneyOut: result.moneyOut || 0,
        gross: (result.moneyIn || 0) - (result.moneyOut || 0),
        machineCount: machineIds.length,
      });
    }

    const locationAggTotal = locationAggregationResults.reduce(
      (acc, loc) => ({
        moneyIn: acc.moneyIn + loc.moneyIn,
        moneyOut: acc.moneyOut + loc.moneyOut,
        gross: acc.gross + loc.gross,
      }),
      { moneyIn: 0, moneyOut: 0, gross: 0 }
    );

    console.log(
      `   Location Aggregation Total: Money In = ${locationAggTotal.moneyIn.toFixed(2)}`
    );
    console.log(
      `   Locations with data: ${locationAggregationResults.filter(l => l.moneyIn > 0).length}\n`
    );

    // ============================================================================
    // STEP 4: Simulate machines/aggregation API logic
    // ============================================================================
    console.log('🔍 Simulating /api/machines/aggregation logic...');

    // Get all machines
    const allMachines = await db
      .collection('machines')
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
            gamingLocation: 1,
            'rel.licencee': 1,
          },
        }
      )
      .toArray();

    console.log(`   Found ${allMachines.length} machines`);

    // Group machines by location
    const machinesByLocation = new Map();
    for (const machine of allMachines) {
      const locId = machine.gamingLocation?.toString();
      if (!locId) continue;

      if (!machinesByLocation.has(locId)) {
        machinesByLocation.set(locId, []);
      }
      machinesByLocation.get(locId).push(machine._id.toString());
    }

    const machinesAggregationResults = [];
    for (const locRange of locationRanges) {
      const machineIds = machinesByLocation.get(locRange.locationId) || [];

      if (machineIds.length === 0) {
        machinesAggregationResults.push({
          location: locRange.locationId,
          locationName: locRange.locationName,
          moneyIn: 0,
          machineCount: 0,
        });
        continue;
      }

      // Aggregate meters for this location's machines
      const metersAgg = await db
        .collection('meters')
        .aggregate([
          {
            $match: {
              machine: { $in: machineIds },
              readAt: {
                $gte: locRange.rangeStart,
                $lte: locRange.rangeEnd,
              },
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

      const result = metersAgg[0] || { moneyIn: 0, moneyOut: 0 };
      machinesAggregationResults.push({
        location: locRange.locationId,
        locationName: locRange.locationName,
        moneyIn: result.moneyIn || 0,
        moneyOut: result.moneyOut || 0,
        gross: (result.moneyIn || 0) - (result.moneyOut || 0),
        machineCount: machineIds.length,
      });
    }

    const machinesAggTotal = machinesAggregationResults.reduce(
      (acc, loc) => ({
        moneyIn: acc.moneyIn + loc.moneyIn,
        moneyOut: acc.moneyOut + loc.moneyOut,
        gross: acc.gross + loc.gross,
      }),
      { moneyIn: 0, moneyOut: 0, gross: 0 }
    );

    console.log(
      `   Machines Aggregation Total: Money In = ${machinesAggTotal.moneyIn.toFixed(2)}`
    );
    console.log(
      `   Locations with data: ${machinesAggregationResults.filter(l => l.moneyIn > 0).length}\n`
    );

    // ============================================================================
    // STEP 5: Compare results
    // ============================================================================
    console.log('📊 COMPARISON RESULTS:\n');
    console.log('='.repeat(80));
    console.log(
      `Location Aggregation API: Money In = ${locationAggTotal.moneyIn.toFixed(2)}`
    );
    console.log(
      `Machines Aggregation API: Money In = ${machinesAggTotal.moneyIn.toFixed(2)}`
    );
    console.log(
      `Difference: ${Math.abs(locationAggTotal.moneyIn - machinesAggTotal.moneyIn).toFixed(2)}`
    );
    console.log('='.repeat(80));
    console.log();

    // Show locations with differences
    console.log('📍 Locations with different values:');
    const differences = [];
    for (let i = 0; i < locationAggregationResults.length; i++) {
      const locAgg = locationAggregationResults[i];
      const machAgg = machinesAggregationResults.find(
        m => m.location === locAgg.location
      );

      if (machAgg && Math.abs(locAgg.moneyIn - machAgg.moneyIn) > 0.01) {
        differences.push({
          location: locAgg.locationName,
          locationAgg: locAgg.moneyIn,
          machinesAgg: machAgg.moneyIn,
          diff: locAgg.moneyIn - machAgg.moneyIn,
          locMachines: locAgg.machineCount,
          machMachines: machAgg.machineCount,
        });
      }
    }

    if (differences.length === 0) {
      console.log('   ✅ No differences found - APIs return the same values\n');
    } else {
      console.log(
        `   ⚠️  Found ${differences.length} locations with differences:\n`
      );
      differences.forEach(diff => {
        console.log(`   ${diff.location}:`);
        console.log(
          `      Location Agg: ${diff.locationAgg.toFixed(2)} (${diff.locMachines} machines)`
        );
        console.log(
          `      Machines Agg: ${diff.machinesAgg.toFixed(2)} (${diff.machMachines} machines)`
        );
        console.log(`      Difference: ${diff.diff.toFixed(2)}\n`);
      });
    }

    // Show locations with data
    console.log('📍 Locations with data (Location Aggregation):');
    locationAggregationResults
      .filter(l => l.moneyIn > 0)
      .forEach(loc => {
        console.log(
          `   ${loc.locationName}: ${loc.moneyIn.toFixed(2)} (${loc.machineCount} machines)`
        );
      });
    console.log();

    console.log('📍 Locations with data (Machines Aggregation):');
    machinesAggregationResults
      .filter(l => l.moneyIn > 0)
      .forEach(loc => {
        console.log(
          `   ${loc.locationName}: ${loc.moneyIn.toFixed(2)} (${loc.machineCount} machines)`
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
