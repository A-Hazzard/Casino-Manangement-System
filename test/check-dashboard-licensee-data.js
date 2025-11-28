/**
 * Check what data each licensee has for Yesterday
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found');
  process.exit(1);
}

async function check() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected\n');

    const db = client.db();

    // Gaming day range for Yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setUTCHours(12, 0, 0, 0); // 8 AM Trinidad = 12 PM UTC
    const today = new Date(yesterday);
    today.setUTCDate(today.getUTCDate() + 1);
    today.setUTCHours(11, 59, 59, 999);

    console.log(
      `📅 Gaming Day Range: ${yesterday.toISOString()} to ${today.toISOString()}\n`
    );

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

    console.log(`📊 Processing ${licensees.length} licensees + unassigned\n`);

    const allLicenseeIds = licensees.map(l => l._id);
    allLicenseeIds.push(null); // Add unassigned

    let totalMoneyIn = 0;

    for (const licenseeId of allLicenseeIds) {
      const licenseeName = licenseeId
        ? licensees.find(l => l._id.toString() === licenseeId.toString())
            ?.name || 'Unknown'
        : 'Unassigned';

      // Get locations for this licensee
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

      if (locations.length === 0) {
        console.log(`⚠️  ${licenseeName}: No locations`);
        continue;
      }

      const locationIds = locations.map(l => l._id);

      // Get machines
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

      if (machines.length === 0) {
        console.log(
          `⚠️  ${licenseeName}: ${locations.length} locations, 0 machines`
        );
        continue;
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

      console.log(`💰 ${licenseeName}:`);
      console.log(
        `   Locations: ${locations.length} (${locations.map(l => l.name).join(', ')})`
      );
      console.log(`   Machines: ${machines.length}`);
      console.log(`   Meters: ${result.meterCount || 0}`);
      console.log(`   Money In: $${moneyIn.toFixed(2)}`);
      console.log(`   Money Out: $${moneyOut.toFixed(2)}`);
      console.log(`   Gross: $${gross.toFixed(2)}\n`);

      totalMoneyIn += moneyIn;
    }

    console.log(`📊 TOTAL (sum of all licensees): $${totalMoneyIn.toFixed(2)}`);
    console.log(`📊 Dashboard shows: $104.82`);
    console.log(
      `📊 Difference: $${Math.abs(totalMoneyIn - 104.82).toFixed(2)}\n`
    );

    // Also check raw total (all locations, no licensee grouping)
    console.log(`🔍 Checking raw total (all locations, no licensee grouping):`);
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
          },
        },
      ])
      .toArray();

    const rawResult = rawAggregation[0] || { totalDrop: 0, totalCancelled: 0 };
    const rawMoneyIn = rawResult.totalDrop || 0;

    console.log(`   Raw Total Money In: $${rawMoneyIn.toFixed(2)}`);
    console.log(`   Licensee Method Total: $${totalMoneyIn.toFixed(2)}`);
    console.log(
      `   Difference: $${Math.abs(rawMoneyIn - totalMoneyIn).toFixed(2)}`
    );

    if (Math.abs(rawMoneyIn - totalMoneyIn) > 0.01) {
      console.log(
        `\n❌ MISMATCH! Some data is being lost in licensee grouping`
      );
    } else {
      console.log(`\n✅ Licensee grouping matches raw total`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

check().catch(console.error);
