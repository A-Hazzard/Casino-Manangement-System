/**
 * Debug Dashboard API - Check what each licensee returns
 */

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found');
  process.exit(1);
}

async function debug() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected\n');

    const db = client.db();

    // Get all licensees
    const licensees = await db
      .collection('licencees')
      .find({
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2020-01-01') } },
        ],
      })
      .toArray();

    const allLicenseeIds = licensees.map(l => l._id);
    allLicenseeIds.push(null); // Add unassigned

    console.log(`📊 Processing ${allLicenseeIds.length} licensees\n`);

    // Gaming day range for Yesterday (8 AM default)
    const now = new Date();
    const nowLocal = new Date(now.getTime() + -4 * 60 * 60 * 1000);
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

    const rangeStart = new Date(yesterdayBase);
    rangeStart.setUTCHours(8 - -4, 0, 0, 0); // 8 AM Trinidad = 12 PM UTC
    const rangeEnd = new Date(yesterdayBase);
    rangeEnd.setDate(rangeEnd.getDate() + 1);
    rangeEnd.setUTCHours(8 - -4, 0, 0, 0);
    rangeEnd.setMilliseconds(rangeEnd.getMilliseconds() - 1);

    console.log(
      `📅 Gaming Day Range: ${rangeStart.toISOString()} to ${rangeEnd.toISOString()}\n`
    );

    let totalMoneyIn = 0;

    for (const licenseeId of allLicenseeIds) {
      const licenseeName = licenseeId
        ? licensees.find(l => l._id.toString() === licenseeId.toString())
            ?.name || 'Unknown'
        : 'Unassigned';

      // Get locations for this licensee (matching Dashboard API logic)
      const locationFilter = licenseeId
        ? { 'rel.licencee': licenseeId }
        : {
            $or: [
              { 'rel.licencee': null },
              { 'rel.licencee': { $exists: false } },
            ],
          };

      const locations = await db
        .collection('gaminglocations')
        .find(
          {
            $or: [
              { deletedAt: null },
              { deletedAt: { $lt: new Date('2020-01-01') } },
            ],
            ...locationFilter,
          },
          { projection: { _id: 1, name: 1 } }
        )
        .toArray();

      console.log(`\n🔍 ${licenseeName}:`);
      console.log(`   Locations: ${locations.length}`);

      if (locations.length === 0) {
        console.log(`   ⚠️  No locations`);
        continue;
      }

      const locationIds = locations.map(l => l._id.toString());
      console.log(
        `   Location IDs (strings): ${locationIds.slice(0, 3).join(', ')}${locationIds.length > 3 ? '...' : ''}`
      );

      // Get machines using string IDs (like Dashboard API does)
      const machines = await db
        .collection('machines')
        .find(
          {
            gamingLocation: { $in: locationIds },
            $or: [
              { deletedAt: null },
              { deletedAt: { $lt: new Date('2020-01-01') } },
            ],
          },
          { projection: { _id: 1, gamingLocation: 1 } }
        )
        .toArray();

      console.log(`   Machines found: ${machines.length}`);

      if (machines.length === 0) {
        console.log(`   ⚠️  No machines`);
        continue;
      }

      // Also try with ObjectIds to see if there's a difference
      const locationIdsAsObjectIds = locations.map(l => l._id);
      const machinesWithObjectIds = await db
        .collection('machines')
        .find(
          {
            gamingLocation: { $in: locationIdsAsObjectIds },
            $or: [
              { deletedAt: null },
              { deletedAt: { $lt: new Date('2020-01-01') } },
            ],
          },
          { projection: { _id: 1 } }
        )
        .toArray();

      if (machines.length !== machinesWithObjectIds.length) {
        console.log(
          `   ⚠️  TYPE MISMATCH! String query: ${machines.length}, ObjectId query: ${machinesWithObjectIds.length}`
        );
      }

      const machineIds = machines.map(m => m._id);

      // Aggregate meters
      const aggregation = await db
        .collection('meters')
        .aggregate([
          {
            $match: {
              machine: { $in: machineIds },
              readAt: {
                $gte: rangeStart,
                $lte: rangeEnd,
              },
            },
          },
          {
            $group: {
              _id: null,
              totalDrop: { $sum: '$movement.drop' },
              totalCancelled: { $sum: '$movement.totalCancelledCredits' },
              meterCount: { $sum: 1 },
            },
          },
        ])
        .toArray();

      const result = aggregation[0] || {
        totalDrop: 0,
        totalCancelled: 0,
        meterCount: 0,
      };

      const moneyIn = result.totalDrop || 0;
      const moneyOut = result.totalCancelled || 0;
      const gross = moneyIn - moneyOut;

      console.log(`   Meters: ${result.meterCount || 0}`);
      console.log(`   Money In: $${moneyIn.toFixed(2)}`);
      console.log(`   Money Out: $${moneyOut.toFixed(2)}`);
      console.log(`   Gross: $${gross.toFixed(2)}`);

      totalMoneyIn += moneyIn;
    }

    console.log(
      `\n📊 TOTAL (sum of all licensees): $${totalMoneyIn.toFixed(2)}`
    );
    console.log(`📊 Dashboard shows: $104.82`);
    console.log(
      `📊 Difference: $${Math.abs(totalMoneyIn - 104.82).toFixed(2)}\n`
    );

    // Also check raw total
    const allLocations = await db
      .collection('gaminglocations')
      .find(
        {
          $or: [
            { deletedAt: null },
            { deletedAt: { $lt: new Date('2020-01-01') } },
          ],
        },
        { projection: { _id: 1 } }
      )
      .toArray();

    const allLocationIds = allLocations.map(l => l._id);
    const allMachines = await db
      .collection('machines')
      .find(
        {
          gamingLocation: { $in: allLocationIds },
          $or: [
            { deletedAt: null },
            { deletedAt: { $lt: new Date('2020-01-01') } },
          ],
        },
        { projection: { _id: 1 } }
      )
      .toArray();

    const allMachineIds = allMachines.map(m => m._id);
    const rawAggregation = await db
      .collection('meters')
      .aggregate([
        {
          $match: {
            machine: { $in: allMachineIds },
            readAt: {
              $gte: rangeStart,
              $lte: rangeEnd,
            },
          },
        },
        {
          $group: {
            _id: null,
            totalDrop: { $sum: '$movement.drop' },
          },
        },
      ])
      .toArray();

    const rawMoneyIn = rawAggregation[0]?.totalDrop || 0;
    console.log(
      `📊 Raw Total (all locations, no licensee grouping): $${rawMoneyIn.toFixed(2)}`
    );
    console.log(`📊 Licensee Method Total: $${totalMoneyIn.toFixed(2)}`);
    console.log(
      `📊 Difference: $${Math.abs(rawMoneyIn - totalMoneyIn).toFixed(2)}`
    );
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

debug().catch(console.error);
