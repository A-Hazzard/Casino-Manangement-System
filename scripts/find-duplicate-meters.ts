/**
 * Find duplicate Meter documents (same machine + locationSession + isRamClear slot)
 * and dump recent COLLECTION_REPORT meters.
 *
 * Usage: bunx tsx scripts/find-duplicate-meters.ts [hoursBack]
 *   hoursBack defaults to 48
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI as string;

function fmt(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (v instanceof Date) {
    return v.toLocaleString('en-US', {
      timeZone: 'America/Port_of_Spain',
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }
  return String(v);
}

async function main() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;
  const metersCol = db.collection('meters');
  const hoursBack = parseInt(process.argv[2] ?? '48', 10);
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

  console.log(`\nLooking for duplicate meter slots created since ${fmt(since)}...`);

  const dupPipeline = [
    {
      $match: {
        locationSession: { $exists: true, $ne: null },
        meterSource: 'COLLECTION_REPORT',
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
        createdAt: { $gte: since },
      },
    },
    {
      $group: {
        _id: {
          machine: '$machine',
          session: '$locationSession',
          isRamClear: { $ifNull: ['$isRamClear', '$$REMOVE'] },
        },
        count: { $sum: 1 },
        ids: { $push: '$_id' },
        drops: { $push: '$movement.drop' },
        absDrops: { $push: '$drop' },
        createds: { $push: '$createdAt' },
        ramClears: { $push: '$isRamClear' },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
  ];

  const dups = await metersCol.aggregate(dupPipeline).toArray();
  console.log(`\nDuplicate slots found: ${dups.length}`);

  for (const dup of dups) {
    console.log('\n─────────────────────────────────────────────────────────────');
    console.log(`  machine:     ${dup._id.machine}`);
    console.log(`  session:     ${dup._id.session}`);
    console.log(`  isRamClear:  ${fmt(dup._id.isRamClear)}`);
    console.log(`  count:       ${dup.count} docs (${dup.count - 1} extra)`);

    for (let index = 0; index < dup.ids.length; index++) {
      const createdAt = dup.createds[index];
      console.log(
        `    [${index + 1}] _id=${dup.ids[index]} | mov.drop=${fmt(dup.drops[index])} | abso.drop=${fmt(dup.absDrops[index])} | isRamClear=${fmt(dup.ramClears[index])} | created=${fmt(createdAt instanceof Date ? createdAt : new Date(createdAt))}`
      );
    }

    // Look up machine name
    const machine = await db.collection('machines').findOne({ _id: dup._id.machine }, { projection: { 'custom.name': 1, game: 1, serialNumber: 1 } });
    const name = machine?.custom?.name || machine?.game || machine?.serialNumber || dup._id.machine;
    console.log(`  machine name: ${name}`);

    // Look up session details
    const rm = await db.collection('reportedmachines').findOne(
      { machineId: dup._id.machine, sessionId: dup._id.session },
      { projection: { manualMetersIn: 1, prevSasMetersIn: 1, sessionStatus: 1 } }
    );
    if (rm) {
      const prevIn = rm.prevSasMetersIn ?? 0;
      const manualIn = rm.manualMetersIn ?? 0;
      const expectedDrop = manualIn - prevIn;
      console.log(`  prevSasMetersIn:  ${fmt(prevIn)}`);
      console.log(`  manualMetersIn:   ${fmt(manualIn)}`);
      console.log(`  expectedDrop:     ${fmt(expectedDrop)}`);
      console.log(`  sessionStatus:    ${rm.sessionStatus}`);
    }
  }

  // Show latest 10 COLLECTION_REPORT meters regardless
  const latest = await metersCol
    .find({
      meterSource: 'COLLECTION_REPORT',
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
      createdAt: { $gte: since },
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();

  console.log(`\n\nLatest COLLECTION_REPORT meters in last ${hoursBack}h (${latest.length}):`);
  for (const meter of latest) {
    const createdAt = meter.createdAt instanceof Date ? meter.createdAt : new Date(meter.createdAt);
    console.log(
      `  ${fmt(createdAt)} | _id=${meter._id} | session=${String(meter.locationSession ?? '').slice(0, 12)}... | isRamClear=${fmt(meter.isRamClear)} | mov.drop=${fmt(meter.movement?.drop)} | abs.drop=${fmt(meter.drop)}`
    );
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
