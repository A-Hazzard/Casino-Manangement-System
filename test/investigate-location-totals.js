/**
 * Investigation script to compare location totals between:
 * 1. Location Details API (/api/locations/[locationId])
 * 2. Location Aggregation API (/api/locationAggregation)
 *
 * For D'Fastlime location (b928b07b8164f0a4b22c70d5)
 */

require('dotenv').config({ path: '.env' });
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://sunny1:87ydaiuhdsia2e@147.182.210.65:32017/sas-prod?authSource=admin';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

async function investigate() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();
    const locationId = 'b928b07b8164f0a4b22c70d5'; // D'Fastlime

    // Get location details
    const location = await db
      .collection('gaminglocations')
      .findOne({ _id: locationId });
    if (!location) {
      console.error('❌ Location not found');
      return;
    }

    console.log(`\n📍 Location: ${location.name}`);
    console.log(`   Game Day Offset: ${location.gameDayOffset || 8}`);
    console.log(`   Licensee: ${location.rel?.licencee || 'None'}`);

    // Calculate gaming day range for "Yesterday" (November 24, 2025)
    const now = new Date('2025-11-25T12:00:00Z'); // November 25, 2025, 12:00 PM UTC
    const gameDayOffset = location.gameDayOffset || 8;
    const currentHour = now.getUTCHours();
    const currentDate = new Date(now);
    currentDate.setUTCHours(0, 0, 0, 0);

    let yesterdayStart, yesterdayEnd;
    if (currentHour < gameDayOffset) {
      // Before game day start, so "yesterday" is 2 days ago
      yesterdayStart = new Date(currentDate);
      yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 2);
      yesterdayStart.setUTCHours(gameDayOffset, 0, 0, 0);

      yesterdayEnd = new Date(currentDate);
      yesterdayEnd.setUTCDate(yesterdayEnd.getUTCDate() - 1);
      yesterdayEnd.setUTCHours(gameDayOffset - 1, 59, 59, 999);
    } else {
      // After game day start, so "yesterday" is 1 day ago
      yesterdayStart = new Date(currentDate);
      yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1);
      yesterdayStart.setUTCHours(gameDayOffset, 0, 0, 0);

      yesterdayEnd = new Date(currentDate);
      yesterdayEnd.setUTCHours(gameDayOffset - 1, 59, 59, 999);
    }

    console.log(`\n📅 Gaming Day Range for Yesterday:`);
    console.log(`   Start: ${yesterdayStart.toISOString()}`);
    console.log(`   End: ${yesterdayEnd.toISOString()}`);

    // Get all machines for this location
    const machines = await db
      .collection('machines')
      .find({
        gamingLocation: locationId,
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2020-01-01') } },
        ],
      })
      .toArray();

    console.log(`\n🎰 Total Machines: ${machines.length}`);

    // Get meters for all machines in this location
    const machineIds = machines.map(m => m._id.toString());

    const meters = await db
      .collection('meters')
      .find({
        machine: { $in: machineIds },
        readAt: {
          $gte: yesterdayStart,
          $lte: yesterdayEnd,
        },
      })
      .toArray();

    console.log(`\n📊 Total Meters: ${meters.length}`);

    // Calculate totals from meters (sum of movement.drop)
    const totalMoneyIn = meters.reduce(
      (sum, meter) => sum + (meter.movement?.drop || 0),
      0
    );
    const totalMoneyOut = meters.reduce(
      (sum, meter) => sum + (meter.movement?.totalCancelledCredits || 0),
      0
    );
    const totalGross = totalMoneyIn - totalMoneyOut;

    console.log(`\n💰 Direct Database Calculation:`);
    console.log(`   Money In: $${totalMoneyIn.toFixed(2)}`);
    console.log(`   Money Out: $${totalMoneyOut.toFixed(2)}`);
    console.log(`   Gross: $${totalGross.toFixed(2)}`);

    // Group meters by machine to see per-machine totals
    const machineTotals = new Map();
    for (const meter of meters) {
      const machineId = meter.machine;
      if (!machineTotals.has(machineId)) {
        machineTotals.set(machineId, {
          moneyIn: 0,
          moneyOut: 0,
          meterCount: 0,
        });
      }
      const totals = machineTotals.get(machineId);
      totals.moneyIn += meter.movement?.drop || 0;
      totals.moneyOut += meter.movement?.totalCancelledCredits || 0;
      totals.meterCount += 1;
    }

    console.log(`\n🎰 Per-Machine Totals (first 10):`);
    let count = 0;
    for (const [machineId, totals] of machineTotals.entries()) {
      if (count++ >= 10) break;
      const machine = machines.find(m => m._id.toString() === machineId);
      console.log(
        `   ${machine?.assetNumber || machineId}: Money In: $${totals.moneyIn.toFixed(2)}, Meters: ${totals.meterCount}`
      );
    }

    // Check if there are machines with no meters
    const machinesWithMeters = new Set(machineTotals.keys());
    const machinesWithoutMeters = machines.filter(
      m => !machinesWithMeters.has(m._id.toString())
    );
    if (machinesWithoutMeters.length > 0) {
      console.log(
        `\n⚠️  Machines without meters: ${machinesWithoutMeters.length}`
      );
      machinesWithoutMeters.slice(0, 5).forEach(m => {
        console.log(`   - ${m.assetNumber || m._id}`);
      });
    }

    console.log(`\n✅ Investigation complete`);
    console.log(`\nExpected values:`);
    console.log(
      `   Location Details API should show: $${totalMoneyIn.toFixed(2)}`
    );
    console.log(
      `   Location Aggregation API should show: $${totalMoneyIn.toFixed(2)}`
    );
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

investigate();
