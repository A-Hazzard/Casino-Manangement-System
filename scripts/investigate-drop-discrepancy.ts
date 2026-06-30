/**
 * Investigate Drop Discrepancy
 *
 * Machine shows drop=919 in collection history for Jun 27, 2026,
 * but querying meters between that time and now yields drop=900.
 * This script traces all data sources to find where the 19-point gap comes from.
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const MACHINE_ID = '6a0b3e15ad874aa2e816fbc5';
const TARGET_DATE = new Date('2026-06-27T00:00:00.000Z');
const TARGET_DATE_END = new Date('2026-06-28T00:00:00.000Z');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const db = mongoose.connection.db!;

  console.log('============================================================');
  console.log('  DROP DISCREPANCY INVESTIGATION');
  console.log('============================================================');
  console.log(`Machine: ${MACHINE_ID}`);
  console.log(`Target date: Jun 27, 2026`);
  console.log('');

  // ============================================================================
  // 1. Machine document — collection history, collectionMeters, sasMeters
  // ============================================================================
  const machine = await db.collection('machines').findOne({ _id: MACHINE_ID });
  if (!machine) {
    console.log('Machine not found!');
    await mongoose.disconnect();
    return;
  }

  console.log('=== 1. MACHINE DOCUMENT ===');
  console.log('Name:', machine.customName || machine.name);
  console.log('Serial:', machine.serialNumber);
  console.log('Relay ID:', machine.relayId || 'None');
  console.log('Collection Meters:', JSON.stringify(machine.collectionMeters));
  console.log('SAS Meters:', JSON.stringify(machine.sasMeters));
  console.log('');

  // Collection history entries around Jun 27
  const historyEntries = (machine.collectionMetersHistory || [])
    .filter((entry: { locationReportId?: string; timestamp?: Date }) => {
      const ts = new Date(entry.timestamp);
      return ts >= TARGET_DATE && ts < TARGET_DATE_END;
    })
    .sort((a: { timestamp?: Date }, b: { timestamp?: Date }) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

  console.log(`Collection History Entries on Jun 27: ${historyEntries.length}`);
  for (const entry of historyEntries) {
    console.log(JSON.stringify({
      locationReportId: entry.locationReportId,
      metersIn: entry.metersIn,
      metersOut: entry.metersOut,
      prevMetersIn: entry.prevMetersIn,
      prevMetersOut: entry.prevMetersOut,
      timestamp: entry.timestamp,
      reportVersion: entry.reportVersion,
      _id: entry._id,
    }, null, 2));
  }
  console.log('');

  // All history entries (sorted by timestamp)
  const allHistory = (machine.collectionMetersHistory || [])
    .sort((a: { timestamp?: Date }, b: { timestamp?: Date }) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

  console.log(`ALL Collection History Entries: ${allHistory.length}`);
  for (const entry of allHistory) {
    const drop = entry.metersIn - entry.prevMetersIn;
    const cancelled = entry.metersOut - entry.prevMetersOut;
    console.log(`  ${new Date(entry.timestamp).toLocaleString()} | Report: ${entry.locationReportId} | In: ${entry.metersIn} (prev: ${entry.prevMetersIn}) | Out: ${entry.metersOut} (prev: ${entry.prevMetersOut}) | Drop: ${drop} | Cancelled: ${cancelled} | v${entry.reportVersion}`);
  }
  console.log('');

  // ============================================================================
  // 2. ALL Meters for this machine (all time, sorted by readAt)
  // ============================================================================
  const allMeters = await db.collection('meters')
    .find({ machine: MACHINE_ID })
    .sort({ readAt: 1 })
    .toArray();

  console.log('=== 2. ALL METERS (all time) ===');
  console.log(`Total meters: ${allMeters.length}`);
  let runningDrop = 0;
  let runningCancelled = 0;
  for (const m of allMeters) {
    const prevRunningDrop = runningDrop;
    const prevRunningCancelled = runningCancelled;
    runningDrop += m.movement?.drop ?? 0;
    runningCancelled += m.movement?.totalCancelledCredits ?? 0;
    const isTarget = new Date(m.readAt) >= TARGET_DATE && new Date(m.readAt) < TARGET_DATE_END;
    console.log(`  ${isTarget ? '>>> ' : '    '} ${new Date(m.readAt).toLocaleString()} | _id: ${m._id} (${typeof m._id}) | isRamClear: ${m.isRamClear} | isSupplemental: ${m.isSupplemental} | meterSource: ${m.meterSource}`);
    console.log(`       movement.drop: ${m.movement?.drop} | movement.cancelled: ${m.movement?.totalCancelledCredits} | drop(top): ${m.drop} | cancelled(top): ${m.totalCancelledCredits}`);
    console.log(`       running drop: ${prevRunningDrop} → ${runningDrop} | running cancelled: ${prevRunningCancelled} → ${runningCancelled}`);
    console.log('');
  }

  // ============================================================================
  // 3. Meters specifically on Jun 27
  // ============================================================================
  const jun27Meters = allMeters.filter(m => {
    const readAt = new Date(m.readAt);
    return readAt >= TARGET_DATE && readAt < TARGET_DATE_END;
  });

  console.log('=== 3. METERS ON JUN 27 ===');
  console.log(`Count: ${jun27Meters.length}`);
  let jun27Drop = 0;
  let jun27Cancelled = 0;
  for (const m of jun27Meters) {
    jun27Drop += m.movement?.drop ?? 0;
    jun27Cancelled += m.movement?.totalCancelledCredits ?? 0;
    console.log(`  _id: ${m._id}`);
    console.log(`  readAt: ${m.readAt}`);
    console.log(`  createdAt: ${m.createdAt}`);
    console.log(`  isRamClear: ${m.isRamClear} (type: ${typeof m.isRamClear})`);
    console.log(`  isSupplemental: ${m.isSupplemental}`);
    console.log(`  meterSource: ${m.meterSource}`);
    console.log(`  movement.drop: ${m.movement?.drop}`);
    console.log(`  movement.totalCancelledCredits: ${m.movement?.totalCancelledCredits}`);
    console.log(`  movement.coinIn: ${m.movement?.coinIn}`);
    console.log(`  movement.coinOut: ${m.movement?.coinOut}`);
    console.log(`  drop (top-level): ${m.drop}`);
    console.log(`  totalCancelledCredits (top-level): ${m.totalCancelledCredits}`);
    console.log(`  locationSession: ${m.locationSession}`);
    console.log(`  location: ${m.location}`);
    console.log('');
  }
  console.log(`Jun 27 total drop: ${jun27Drop}`);
  console.log(`Jun 27 total cancelled: ${jun27Cancelled}`);
  console.log('');

  // ============================================================================
  // 4. Meters from Jun 27 to now — sum of deltas
  // ============================================================================
  const now = new Date();
  const jun27ToNow = allMeters.filter(m => {
    const readAt = new Date(m.readAt);
    return readAt >= TARGET_DATE && readAt <= now;
  });

  console.log('=== 4. METERS: JUN 27 TO NOW ===');
  console.log(`Count: ${jun27ToNow.length}`);
  let sumDrop = 0;
  let sumCancelled = 0;
  for (const m of jun27ToNow) {
    sumDrop += m.movement?.drop ?? 0;
    sumCancelled += m.movement?.totalCancelledCredits ?? 0;
  }
  console.log(`Sum of movement.drop: ${sumDrop}`);
  console.log(`Sum of movement.totalCancelledCredits: ${sumCancelled}`);
  console.log('');

  // ============================================================================
  // 5. What the collection history says (drop = metersIn - prevMetersIn)
  // ============================================================================
  console.log('=== 5. COLLECTION HISTORY DELTAS ===');
  for (const entry of historyEntries) {
    const histDrop = (entry.metersIn ?? 0) - (entry.prevMetersIn ?? 0);
    const histCancelled = (entry.metersOut ?? 0) - (entry.prevMetersOut ?? 0);
    console.log(`  Report: ${entry.locationReportId}`);
    console.log(`  metersIn: ${entry.metersIn} - prevMetersIn: ${entry.prevMetersIn} = drop: ${histDrop}`);
    console.log(`  metersOut: ${entry.metersOut} - prevMetersOut: ${entry.prevMetersOut} = cancelled: ${histCancelled}`);
    console.log('');
  }

  // ============================================================================
  // 6. ReportedMachines (V2 sessions) for this machine
  // ============================================================================
  const reportedMachines = await db.collection('reportedmachines')
    .find({ machineId: MACHINE_ID })
    .sort({ createdAt: 1 })
    .toArray();

  console.log('=== 6. REPORTED MACHINES (V2 Sessions) ===');
  console.log(`Count: ${reportedMachines.length}`);
  for (const rm of reportedMachines) {
    const isTarget = new Date(rm.createdAt) >= TARGET_DATE && new Date(rm.createdAt) < TARGET_DATE_END;
    console.log(`  ${isTarget ? '>>> ' : '    '} Session: ${rm.sessionId} | Status: ${rm.status} | SessionStatus: ${rm.sessionStatus}`);
    console.log(`       manualMetersIn: ${rm.manualMetersIn} | manualMetersOut: ${rm.manualMetersOut}`);
    console.log(`       sasMetersIn: ${rm.sasMetersIn} | sasMetersOut: ${rm.sasMetersOut}`);
    console.log(`       prevSasMetersIn: ${rm.prevSasMetersIn} | prevSasMetersOut: ${rm.prevSasMetersOut}`);
    console.log(`       sasGross: ${rm.sasGross} | metersMatch: ${rm.metersMatch}`);
    console.log(`       hasRelay: ${rm.hasRelay} | isSupplemental: ${rm.isSupplemental}`);
    console.log(`       ramClear: ${rm.ramClear} | ramClearMetersIn: ${rm.ramClearMetersIn}`);
    console.log(`       createdAt: ${rm.createdAt}`);
    console.log('');
  }

  // ============================================================================
  // 7. V1 Collection Reports for this machine
  // ============================================================================
  const collections = await db.collection('collections')
    .find({ machineId: MACHINE_ID })
    .sort({ timestamp: 1 })
    .toArray();

  console.log('=== 7. V1 COLLECTIONS ===');
  console.log(`Count: ${collections.length}`);
  for (const c of collections) {
    const isTarget = new Date(c.timestamp) >= TARGET_DATE && new Date(c.timestamp) < TARGET_DATE_END;
    console.log(`  ${isTarget ? '>>> ' : '    '} ${new Date(c.timestamp).toLocaleString()} | _id: ${c._id}`);
    console.log(`       metersIn: ${c.metersIn} | metersOut: ${c.metersOut}`);
    console.log(`       prevIn: ${c.prevIn} | prevOut: ${c.prevOut}`);
    console.log(`       movement: ${JSON.stringify(c.movement)}`);
    console.log(`       sasMeters: ${JSON.stringify(c.sasMeters)}`);
    console.log(`       locationReportId: ${c.locationReportId} | isCompleted: ${c.isCompleted}`);
    console.log(`       ramClear: ${c.ramClear}`);
    console.log('');
  }

  // ============================================================================
  // 8. Supplemental meters check
  // ============================================================================
  const supplementalMeters = allMeters.filter(m => m.isSupplemental === true);
  console.log('=== 8. SUPPLEMENTAL METERS ===');
  console.log(`Count: ${supplementalMeters.length}`);
  for (const m of supplementalMeters) {
    console.log(`  ${new Date(m.readAt).toLocaleString()} | drop: ${m.movement?.drop} | cancelled: ${m.movement?.totalCancelledCredits}`);
  }
  console.log('');

  // ============================================================================
  // 9. RAM clear meters check
  // ============================================================================
  const ramClearMeters = allMeters.filter(m => m.isRamClear === true);
  console.log('=== 9. RAM CLEAR METERS ===');
  console.log(`Count: ${ramClearMeters.length}`);
  for (const m of ramClearMeters) {
    console.log(`  ${new Date(m.readAt).toLocaleString()} | drop: ${m.movement?.drop} | cancelled: ${m.movement?.totalCancelledCredits}`);
  }
  console.log('');

  // ============================================================================
  // 10. Discrepancy analysis
  // ============================================================================
  console.log('=== 10. DISCREPANCY ANALYSIS ===');
  console.log(`History drop on Jun 27: ${historyEntries.map(e => (e.metersIn ?? 0) - (e.prevMetersIn ?? 0)).reduce((a, b) => a + b, 0)}`);
  console.log(`Meter sum on Jun 27: ${jun27Drop}`);
  console.log(`Meter sum Jun 27 to now: ${sumDrop}`);
  console.log(`History drop total: ${allHistory.map(e => (e.metersIn ?? 0) - (e.prevMetersIn ?? 0)).reduce((a, b) => a + b, 0)}`);
  console.log(`Running drop from meters: ${runningDrop}`);
  console.log('');

  // Check the gap
  const historyDropJun27 = historyEntries.map(e => (e.metersIn ?? 0) - (e.prevMetersIn ?? 0)).reduce((a, b) => a + b, 0);
  const meterDropJun27 = jun27Drop;
  console.log(`Gap (history - meters) on Jun 27: ${historyDropJun27 - meterDropJun27}`);

  // Also check: are there duplicate meters?
  const meterIds = allMeters.map(m => m._id);
  const uniqueIds = new Set(meterIds);
  console.log(`\nTotal meter documents: ${meterIds.length}`);
  console.log(`Unique _id values: ${uniqueIds.size}`);
  if (meterIds.length !== uniqueIds.size) {
    console.log('WARNING: DUPLICATE _id VALUES DETECTED!');
    const counts: Record<string, number> = {};
    for (const id of meterIds) {
      counts[String(id)] = (counts[String(id)] || 0) + 1;
    }
    for (const [id, count] of Object.entries(counts)) {
      if (count > 1) {
        console.log(`  Duplicate _id "${id}" appears ${count} times`);
      }
    }
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
