/**
 * Debug: why does report 21ef3cb6-3249-4203-889f-2e50790334d9 show a variation?
 *
 * Dumps every Meter document in the SAS window and shows what the aggregate
 * produces with and without the COLLECTION_REPORT filter.
 *
 * Usage:
 *   bun run scratch/debug-report-variation.ts
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI as string;
const REPORT_ID = '21ef3cb6-3249-4203-889f-2e50790334d9';

function fmt(n: number | null | undefined) {
  if (n == null) return 'null';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;

  // ── 1. Load the collection report ──────────────────────────────────────────
  const report = await db.collection('collectionreports').findOne({ _id: REPORT_ID });
  if (!report) {
    console.log('Report not found:', REPORT_ID);
    process.exit(1);
  }
  console.log('\n── Report ───────────────────────────────────────────────────────────────');
  console.log('  locationId :', report.locationId ?? report.location);
  console.log('  isEditing  :', report.isEditing);
  console.log('  createdAt  :', report.createdAt);

  // ── 2. Load collections for this report ────────────────────────────────────
  const collections = await db
    .collection('collections')
    .find({ locationReportId: REPORT_ID })
    .toArray();

  console.log(`\n── Collections (${collections.length}) ───────────────────────────────────────────────`);
  for (const col of collections) {
    const movGross = col.movement?.gross ?? col.movement?.drop;
    const sasStart = col.sasMeters?.sasStartTime;
    const sasEnd   = col.sasMeters?.sasEndTime;
    console.log(`\n  machineId   : ${col.machineId}`);
    console.log(`  metersIn    : ${col.metersIn}  prevIn: ${col.prevIn}`);
    console.log(`  metersOut   : ${col.metersOut}  prevOut: ${col.prevOut}`);
    console.log(`  movement    : drop=${col.movement?.drop}  cancelled=${col.movement?.totalCancelledCredits}  gross=${movGross}`);
    console.log(`  sasStartTime: ${sasStart}`);
    console.log(`  sasEndTime  : ${sasEnd}`);

    if (!sasStart || !sasEnd) {
      console.log('  ⚠  No SAS times — skipping meter query for this collection');
      continue;
    }

    const start = new Date(sasStart);
    const end   = new Date(sasEnd);

    // ── 3. All meters in window ──────────────────────────────────────────────
    const allMeters = await db
      .collection('meters')
      .find({
        machine: String(col.machineId),
        readAt: { $gte: start, $lte: end },
      })
      .toArray();

    console.log(`\n  ── All meters in window (${allMeters.length}) ────────────────────────`);
    for (const m of allMeters) {
      console.log(`    [${m._id}]`);
      console.log(`      meterSource : ${m.meterSource ?? '(SMIB — no source field)'}`);
      console.log(`      locationSession: ${m.locationSession ?? 'n/a'}`);
      console.log(`      isSupplemental : ${m.isSupplemental ?? false}`);
      console.log(`      readAt      : ${m.readAt}`);
      console.log(`      movement.drop      : ${m.movement?.drop}`);
      console.log(`      movement.cancelled : ${m.movement?.totalCancelledCredits}`);
      console.log(`      movement.gross(calc): ${fmt((m.movement?.drop ?? 0) - (m.movement?.totalCancelledCredits ?? 0))}`);
    }

    // ── 4. Aggregate — ALL sources ───────────────────────────────────────────
    const aggAll = await db.collection('meters').aggregate([
      { $match: { machine: String(col.machineId), readAt: { $gte: start, $lte: end } } },
      { $group: {
          _id: null,
          totalDrop:      { $sum: { $ifNull: ['$movement.drop', 0] } },
          totalCancelled: { $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] } },
      }},
    ]).toArray();

    const allDrop = aggAll[0]?.totalDrop ?? 0;
    const allCan  = aggAll[0]?.totalCancelled ?? 0;
    console.log(`\n  ── Aggregate (no filter):`);
    console.log(`       totalDrop      = ${fmt(allDrop)}`);
    console.log(`       totalCancelled = ${fmt(allCan)}`);
    console.log(`       sasGross       = ${fmt(allDrop - allCan)}`);
    console.log(`       variation vs machineGross(${fmt(movGross as number)}) = ${fmt((movGross as number) - (allDrop - allCan))}`);

    // ── 5. Aggregate — exclude COLLECTION_REPORT ─────────────────────────────
    const aggSmib = await db.collection('meters').aggregate([
      { $match: {
          machine: String(col.machineId),
          readAt: { $gte: start, $lte: end },
          meterSource: { $ne: 'COLLECTION_REPORT' },
      }},
      { $group: {
          _id: null,
          totalDrop:      { $sum: { $ifNull: ['$movement.drop', 0] } },
          totalCancelled: { $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] } },
      }},
    ]).toArray();

    const smibDrop = aggSmib[0]?.totalDrop ?? 0;
    const smibCan  = aggSmib[0]?.totalCancelled ?? 0;
    console.log(`\n  ── Aggregate (SMIB only — exclude COLLECTION_REPORT):`);
    console.log(`       totalDrop      = ${fmt(smibDrop)}`);
    console.log(`       totalCancelled = ${fmt(smibCan)}`);
    console.log(`       sasGross       = ${fmt(smibDrop - smibCan)}`);
    console.log(`       variation vs machineGross(${fmt(movGross as number)}) = ${fmt((movGross as number) - (smibDrop - smibCan))}`);
  }

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
