/**
 * For a specific WOW report, traces EXACTLY what the detail page would show:
 * per-machine SAS window, WOW_SYNC meters found, and resulting variation.
 * Uses the same meter query logic as accountingDetails.ts.
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

const fmt = (n: unknown) => n == null ? 'null' : Number(n).toLocaleString();
const ts = (d: unknown) => d ? new Date(d as string).toISOString().slice(0, 19).replace('T',' ') + ' UTC' : 'null';

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;
  const reportId = 'cb52018d-2698-4b8a-aed2-76a297dbe5b5';

  // Get report
  const report = await db.collection('collectionreports').findOne({ locationReportId: reportId });
  console.log('REPORT:');
  console.log('  totalGross:', report?.totalGross);
  console.log('  totalSasGross:', report?.totalSasGross);
  console.log('  totalVariation:', report?.totalVariation, '\n');

  // Get collections
  const cols = await db.collection('collections').find(
    { locationReportId: reportId }
  ).sort({ timestamp: 1 }).toArray();

  // Fetch machines
  const machineIds = [...new Set(cols.map((c: any) => String(c.machineId)))];
  const machines = await db.collection('machines').find(
    { _id: { $in: machineIds } },
    { projection: { _id: 1, serialNumber: 1, 'meta.dataSync.source': 1 } }
  ).toArray();
  const machineMap = new Map(machines.map((m: any) => [String(m._id), m]));

  let totalDetailVariation = 0;
  let hasSasDataCount = 0;
  let noSasDataCount = 0;

  for (const col of cols) {
    const mg = col.movement?.gross ?? 0;
    const sasStart = col.sasMeters?.sasStartTime ? new Date(col.sasMeters.sasStartTime) : null;
    const sasEnd = col.sasMeters?.sasEndTime ? new Date(col.sasMeters.sasEndTime) : null;
    const machine = machineMap.get(String(col.machineId)) as any;
    const serial = machine?.serialNumber || col.machineId;

    if (mg === 0) continue; // Skip zero-gross machines

    console.log('='.repeat(100));
    console.log(`${serial.padEnd(22)} machineGross=${fmt(mg)}`);
    console.log(`  SAS window: ${ts(sasStart)} → ${ts(sasEnd)}`);

    if (!sasStart || !sasEnd) {
      console.log('  ⚠  No SAS window — variation = machineGross');
      totalDetailVariation += mg;
      noSasDataCount++;
      continue;
    }

    // Query meters exactly like aggregateMeterDataForWindows does
    const windowStart = sasStart.getTime();
    const windowEnd = sasEnd.getTime();

    const meters = await db.collection('meters').find({
      machine: String(col.machineId),
      readAt: { $gte: sasStart, $lte: sasEnd },
    }).sort({ readAt: 1 }).toArray();

    // Filter exactly like the $or in the aggregation
    const included = meters.filter((m: any) => {
      const readAt = new Date(m.readAt).getTime();
      const isCR = m.meterSource === 'COLLECTION_REPORT';
      const atEnd = readAt === windowEnd;

      // $or: [{ meterSource: { $ne: 'COLLECTION_REPORT' } }, { meterSource: 'COLLECTION_REPORT', isSupplemental: true, readAt: endTime }]
      if (!isCR) return true;
      if (isCR && m.isSupplemental === true && atEnd) return true;
      return false;
    }).filter((m: any) => {
      // readAt > startTime (exclusive lower bound)
      return new Date(m.readAt).getTime() > windowStart;
    });

    const sasDrop = included.reduce((s: number, m: any) => s + (m.movement?.drop ?? 0), 0);
    const sasCanc = included.reduce((s: number, m: any) => s + (m.movement?.totalCancelledCredits ?? 0), 0);
    const sasGross = sasDrop - sasCanc;

    console.log(`  All meters in window: ${meters.length}`);
    console.log(`  Included (after $or filter + exclusive lower bound): ${included.length}`);

    for (const m of included) {
      const isWow = m.meterSource === 'WOW_SYNC' ? '*** WOW_SYNC ***' : '';
      const isCR = m.meterSource === 'COLLECTION_REPORT' ? '← CR' : '';
      console.log(`    ${ts(m.readAt)} drop=${fmt(m.movement?.drop)} cancelled=${fmt(m.movement?.totalCancelledCredits)} src=${m.meterSource?.padEnd(15)} ${isWow}${isCR}`);
    }

    if (included.length === 0) {
      console.log(`  ⚠  NO meters found in SAS window — variation = machineGross = ${fmt(mg)} (full amount!)`);
      totalDetailVariation += mg;
      noSasDataCount++;
      continue;
    }

    const variation = mg - sasGross;
    console.log(`  Σ sasDrop=${fmt(sasDrop)}  Σ sasCancelled=${fmt(sasCanc)}  sasGross=${fmt(sasGross)}`);
    console.log(`  variation = ${fmt(mg)} - ${fmt(sasGross)} = ${fmt(variation)}`);
    if (Math.abs(variation) < 0.01) {
      console.log('  ✅ ZERO VARIATION');
    } else {
      console.log(`  ❌ NON-ZERO VARIATION: ${fmt(variation)}`);
    }
    totalDetailVariation += variation;
    hasSasDataCount++;
  }

  console.log('\n' + '='.repeat(100));
  console.log('SUMMARY:');
  console.log(`  Machines with non-zero gross: ${hasSasDataCount + noSasDataCount}`);
  console.log(`  Has SAS data: ${hasSasDataCount}`);
  console.log(`  No SAS data: ${noSasDataCount}`);
  console.log(`  Total variation (detail page style): ${fmt(totalDetailVariation)}`);
  console.log(`  Stored totalVariation: ${report?.totalVariation}`);
  console.log(`  Stored totalSasGross: ${report?.totalSasGross}`);

  await mongoose.disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
