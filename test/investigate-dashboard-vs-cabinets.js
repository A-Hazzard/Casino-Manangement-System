/**
 * Investigation Script: Dashboard vs Cabinets API Discrepancy
 *
 * This script compares the Dashboard totals API and Machines Aggregation API
 * to identify why they return different values for the same time period.
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not found in environment variables');
  console.error('   Make sure .env.local exists with MONGO_URI set');
  process.exit(1);
}

async function investigate() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db();
    const timePeriod = 'Yesterday';

    // Get gaming day ranges for Yesterday
    const locations = await db
      .collection('gaminglocations')
      .find({
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2020-01-01') } },
        ],
      })
      .toArray();

    console.log(`📊 Found ${locations.length} locations\n`);

    // Calculate gaming day ranges (simplified - using 8 AM default)
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setUTCHours(12, 0, 0, 0); // 8 AM Trinidad = 12 PM UTC
    const today = new Date(yesterday);
    today.setUTCDate(today.getUTCDate() + 1);

    console.log(`📅 Gaming Day Range for Yesterday:`);
    console.log(`   Start: ${yesterday.toISOString()}`);
    console.log(`   End: ${today.toISOString()}\n`);

    // Method 1: Dashboard-style aggregation (by location)
    console.log('🔍 METHOD 1: Dashboard-style (aggregate by location)');
    const dashboardResults = [];

    for (const location of locations) {
      const locationId = location._id;
      const gameDayOffset = location.gameDayOffset ?? 8;

      // Get machines for this location
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
          { projection: { _id: 1 } }
        )
        .toArray();

      const machineIds = machines.map(m => m._id);

      if (machineIds.length === 0) {
        continue;
      }

      // Aggregate meters for all machines in this location
      const locationAggregation = await db
        .collection('meters')
        .aggregate([
          {
            $match: {
              machine: { $in: machineIds },
              readAt: {
                $gte: yesterday,
                $lte: today,
              },
            },
          },
          {
            $group: {
              _id: null,
              totalDrop: { $sum: '$movement.drop' },
              totalCancelled: { $sum: '$movement.totalCancelledCredits' },
              machineCount: { $addToSet: '$machine' },
            },
          },
        ])
        .toArray();

      const result = locationAggregation[0] || {
        totalDrop: 0,
        totalCancelled: 0,
        machineCount: [],
      };

      dashboardResults.push({
        locationId: locationId.toString(),
        locationName: location.name || 'Unknown',
        machineCount: result.machineCount?.length || 0,
        moneyIn: result.totalDrop || 0,
        moneyOut: result.totalCancelled || 0,
        gross: (result.totalDrop || 0) - (result.totalCancelled || 0),
      });
    }

    const dashboardTotal = dashboardResults.reduce(
      (sum, loc) => ({
        moneyIn: sum.moneyIn + loc.moneyIn,
        moneyOut: sum.moneyOut + loc.moneyOut,
        gross: sum.gross + loc.gross,
      }),
      { moneyIn: 0, moneyOut: 0, gross: 0 }
    );

    console.log(`   Total Money In: $${dashboardTotal.moneyIn.toFixed(2)}`);
    console.log(`   Total Money Out: $${dashboardTotal.moneyOut.toFixed(2)}`);
    console.log(`   Total Gross: $${dashboardTotal.gross.toFixed(2)}`);
    console.log(
      `   Locations with data: ${dashboardResults.filter(l => l.moneyIn > 0).length}\n`
    );

    // Method 2: Machines Aggregation-style (by machine, then sum)
    console.log(
      '🔍 METHOD 2: Machines Aggregation-style (aggregate by machine)'
    );
    const machineResults = [];

    for (const location of locations) {
      const locationId = location._id;

      // Get machines for this location
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
          { projection: { _id: 1 } }
        )
        .toArray();

      const machineIds = machines.map(m => m._id);

      if (machineIds.length === 0) {
        continue;
      }

      // Aggregate meters per machine
      const machineAggregation = await db
        .collection('meters')
        .aggregate([
          {
            $match: {
              machine: { $in: machineIds },
              readAt: {
                $gte: yesterday,
                $lte: today,
              },
            },
          },
          {
            $group: {
              _id: '$machine',
              moneyIn: { $sum: '$movement.drop' },
              moneyOut: { $sum: '$movement.totalCancelledCredits' },
            },
          },
        ])
        .toArray();

      const locationTotal = machineAggregation.reduce(
        (sum, m) => ({
          moneyIn: sum.moneyIn + (m.moneyIn || 0),
          moneyOut: sum.moneyOut + (m.moneyOut || 0),
          gross: sum.gross + ((m.moneyIn || 0) - (m.moneyOut || 0)),
        }),
        { moneyIn: 0, moneyOut: 0, gross: 0 }
      );

      machineResults.push({
        locationId: locationId.toString(),
        locationName: location.name || 'Unknown',
        machineCount: machineAggregation.length,
        moneyIn: locationTotal.moneyIn,
        moneyOut: locationTotal.moneyOut,
        gross: locationTotal.gross,
      });
    }

    const machinesTotal = machineResults.reduce(
      (sum, loc) => ({
        moneyIn: sum.moneyIn + loc.moneyIn,
        moneyOut: sum.moneyOut + loc.moneyOut,
        gross: sum.gross + loc.gross,
      }),
      { moneyIn: 0, moneyOut: 0, gross: 0 }
    );

    console.log(`   Total Money In: $${machinesTotal.moneyIn.toFixed(2)}`);
    console.log(`   Total Money Out: $${machinesTotal.moneyOut.toFixed(2)}`);
    console.log(`   Total Gross: $${machinesTotal.gross.toFixed(2)}`);
    console.log(
      `   Locations with data: ${machineResults.filter(l => l.moneyIn > 0).length}\n`
    );

    // Compare results
    console.log('📊 COMPARISON:');
    console.log(`   Dashboard Method: $${dashboardTotal.moneyIn.toFixed(2)}`);
    console.log(`   Machines Method:  $${machinesTotal.moneyIn.toFixed(2)}`);
    console.log(
      `   Difference:       $${Math.abs(dashboardTotal.moneyIn - machinesTotal.moneyIn).toFixed(2)}`
    );

    if (Math.abs(dashboardTotal.moneyIn - machinesTotal.moneyIn) > 0.01) {
      console.log('\n❌ MISMATCH DETECTED!');
      console.log('\n🔍 Location-by-location comparison:');

      const locationMap = new Map();
      dashboardResults.forEach(loc => {
        locationMap.set(loc.locationId, { dashboard: loc });
      });
      machineResults.forEach(loc => {
        const existing = locationMap.get(loc.locationId);
        if (existing) {
          existing.machines = loc;
        } else {
          locationMap.set(loc.locationId, { machines: loc });
        }
      });

      locationMap.forEach((data, locationId) => {
        const dash = data.dashboard || { moneyIn: 0, moneyOut: 0 };
        const mach = data.machines || { moneyIn: 0, moneyOut: 0 };

        if (Math.abs(dash.moneyIn - mach.moneyIn) > 0.01) {
          console.log(
            `\n   ${data.dashboard?.locationName || data.machines?.locationName || 'Unknown'}:`
          );
          console.log(`     Dashboard: $${dash.moneyIn.toFixed(2)}`);
          console.log(`     Machines:  $${mach.moneyIn.toFixed(2)}`);
          console.log(
            `     Diff:      $${Math.abs(dash.moneyIn - mach.moneyIn).toFixed(2)}`
          );
        }
      });
    } else {
      console.log('\n✅ Both methods return the same totals!');
    }

    // Check for machines with no meters
    console.log('\n🔍 Checking for machines with no meter data:');
    const allMachines = await db
      .collection('machines')
      .find(
        {
          $or: [
            { deletedAt: null },
            { deletedAt: { $lt: new Date('2020-01-01') } },
          ],
        },
        { projection: { _id: 1, gamingLocation: 1 } }
      )
      .toArray();

    const machinesWithMeters = await db
      .collection('meters')
      .distinct('machine', {
        readAt: {
          $gte: yesterday,
          $lte: today,
        },
      });

    const machinesWithoutMeters = allMachines.filter(
      m => !machinesWithMeters.some(wm => wm.toString() === m._id.toString())
    );

    console.log(`   Total machines: ${allMachines.length}`);
    console.log(`   Machines with meters: ${machinesWithMeters.length}`);
    console.log(`   Machines without meters: ${machinesWithoutMeters.length}`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

investigate().catch(console.error);
