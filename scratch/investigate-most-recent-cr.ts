/**
 * Investigate Most Recent Collection Report
 *
 * Finds the latest collection report, its collections, all Meters in SAS windows,
 * and analyzes variation. Answers:
 *  - Why is there variation?
 *  - Would a follow-up CR (offline) see false variation from COLLECTION_REPORT meters?
 *  - Is the collector data correct?
 *
 * Usage:
 *   bun run scratch/investigate-most-recent-cr.ts
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI as string;

function sep(title: string, width = 80, char = '═') {
  const bar = char.repeat(width);
  if (!title) return console.log(bar);
  console.log(`\n${bar}`);
  console.log(`  ${title}`);
  console.log(bar);
}

function fmt(n: unknown, dp = 2): string {
  if (n === null || n === undefined) return 'null';
  const num = Number(n);
  return isNaN(num) ? String(n) : num.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

function ts(d: unknown): string {
  if (!d) return 'null';
  const date = new Date(d as string);
  return isNaN(date.getTime()) ? String(d) : date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

function localTs(d: unknown): string {
  if (!d) return 'null';
  const date = new Date(d as string);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit',
    hour12: true, timeZoneName: 'short',
  });
}

async function main() {
  if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. FIND THE MOST RECENT COLLECTION REPORT
  // ═══════════════════════════════════════════════════════════════════════════
  sep('STEP 1 — MOST RECENT COLLECTION REPORT', 80, '═');

  const reports = await db.collection('collectionreports')
    .find({})
    .sort({ createdAt: -1 })
    .limit(1)
    .toArray();

  if (reports.length === 0) { console.error('No reports found'); process.exit(1); }
  const report = reports[0] as Record<string, unknown>;
  const locationReportId = String(report.locationReportId ?? report._id ?? '');

  console.log(JSON.stringify(report, null, 2));

  console.log('\n  Key fields:');
  console.log(`    locationReportId : ${locationReportId}`);
  console.log(`    location         : ${report.locationName ?? report.location} (${report.location ?? '?'})`);
  console.log(`    createdAt        : ${ts(report.createdAt)}`);
  console.log(`    timestamp        : ${ts(report.timestamp)}`);
  console.log(`    isEditing        : ${report.isEditing}`);
  console.log(`    totalDrop        : ${fmt(report.totalDrop)}`);
  console.log(`    totalCancelled   : ${fmt(report.totalCancelled)}`);
  console.log(`    totalGross       : ${fmt(report.totalGross)}`);
  console.log(`    totalSasGross    : ${fmt(report.totalSasGross)}`);
  console.log(`    totalVariation   : ${fmt(report.totalVariation)}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. FIND ALL COLLECTIONS FOR THIS REPORT
  // ═══════════════════════════════════════════════════════════════════════════
  sep('STEP 2 — COLLECTIONS', 80, '═');

  const collections = await db.collection('collections')
    .find({ locationReportId })
    .sort({ timestamp: 1 })
    .toArray() as Record<string, unknown>[];

  console.log(`Found ${collections.length} collection(s)`);

  if (collections.length === 0) {
    console.log('\n⚠ No collections found for this locationReportId. Trying locationReportId = report._id...');
    const altCollections = await db.collection('collections')
      .find({ locationReportId: String(report._id) })
      .toArray() as Record<string, unknown>[];
    console.log(`With _id as locationReportId: ${altCollections.length} collection(s)`);
    for (const col of altCollections) {
      console.log(`  - machine: ${col.machineId}  metersIn: ${col.metersIn}`);
    }
    if (altCollections.length > 0) {
      collections.push(...altCollections);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. LOCATION & LICENCEE CONFIG
  // ═══════════════════════════════════════════════════════════════════════════
  let includeJackpot = false;
  let isNoSMIBLocation = false;

  if (report.location) {
    const location = await db.collection('gaminglocations').findOne(
      { _id: report.location },
      { projection: { 'rel.licencee': 1, noSMIBLocation: 1, gameDayOffset: 1, name: 1 } }
    ) as Record<string, unknown> | null;
    isNoSMIBLocation = location?.noSMIBLocation === true;
    console.log(`\n  Location: ${location?.name ?? report.locationName ?? '?'} (noSMIBLocation=${isNoSMIBLocation})`);
    if (location?.rel?.licencee) {
      const licencee = await db.collection('licencees').findOne(
        { _id: location.rel.licencee },
        { projection: { includeJackpot: 1, name: 1 } }
      );
      includeJackpot = Boolean(licencee?.includeJackpot);
      console.log(`  Licencee: ${(licencee as Record<string, unknown>)?.name ?? location.rel.licencee} (includeJackpot=${includeJackpot})`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. PER-MACHINE ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════════
  let computedTotalGross = 0, computedTotalSasGross = 0, computedTotalVariation = 0;
  let computedSasGrossSmibOnly = 0;
  let totalFalseVariationRisk = 0;

  for (const col of collections) {
    const mid = String(col.machineId);
    const machine = await db.collection('machines').findOne(
      { _id: mid },
      { projection: { relayId: 1, serialNumber: 1, collectionMeters: 1, sasMeters: 1, lastActivity: 1, isSasMachine: 1, gamingLocation: 1, custom: 1, collectionMetersHistory: 1 } }
    ) as Record<string, unknown> | null;

    const serial = String(machine?.serialNumber ?? col.serialNumber ?? col.machineName ?? col.machineCustomName ?? mid);
    const hasSmib = Boolean((machine?.relayId as string)?.trim());
    const isOnline = hasSmib && machine?.lastActivity
      ? (Date.now() - new Date(machine.lastActivity as string).getTime()) < 3 * 60 * 1000
      : false;

    // Collection meter values
    const metersIn = Number(col.metersIn ?? 0);
    const metersOut = Number(col.metersOut ?? 0);
    const prevIn = Number(col.prevIn ?? 0);
    const prevOut = Number(col.prevOut ?? 0);
    const dropDelta = metersIn - prevIn;
    const cancelDelta = metersOut - prevOut;
    const machineGross = dropDelta - cancelDelta;
    const colMovement = col.movement as Record<string, unknown> | undefined;

    // SAS window
    const sasMeters = col.sasMeters as Record<string, unknown> | undefined;
    const sasStart = sasMeters?.sasStartTime ? new Date(sasMeters.sasStartTime as string) : null;
    const sasEnd = sasMeters?.sasEndTime ? new Date(sasMeters.sasEndTime as string) : null;

    // Machine collection meters & history
    const machineColMeters = machine?.collectionMeters as Record<string, unknown> | undefined;
    const collectionMetersHistory = machine?.collectionMetersHistory as Array<Record<string, unknown>> | undefined;

    sep(`MACHINE: ${serial} (${mid})`, 80, '─');
    console.log(`  SMIB relayId : ${(machine?.relayId as string) ?? 'NONE'}`);
    console.log(`  SMIB online  : ${isOnline ? 'YES' : 'NO'}`);
    console.log(`  isSasMachine : ${machine?.isSasMachine ?? '?'}`);
    console.log(`  hasSmib      : ${hasSmib}`);
    console.log(`  ramClear     : ${col.ramClear ?? false}`);
    console.log(`  machine.collectionMeters : ${machineColMeters ? JSON.stringify(machineColMeters) : 'null'}`);
    console.log(`  machine.collectionMetersHistory entries: ${collectionMetersHistory?.length ?? 0}`);

    if (collectionMetersHistory && collectionMetersHistory.length > 0) {
      const lastHist = collectionMetersHistory[collectionMetersHistory.length - 1];
      console.log(`  Last history entry: metersIn=${fmt(lastHist.metersIn)} metersOut=${fmt(lastHist.metersOut)} locationReportId=${lastHist.locationReportId ?? '?'}`);
    }

    console.log('');
    console.log(`  Collector entry:`);
    console.log(`    metersIn : ${fmt(metersIn)}  (abs)`);
    console.log(`    metersOut: ${fmt(metersOut)}  (abs)`);
    console.log(`    prevIn   : ${fmt(prevIn)}  (baseline)`);
    console.log(`    prevOut  : ${fmt(prevOut)}  (baseline)`);
    console.log(`    movement.drop  : ${fmt(colMovement?.metersIn ?? dropDelta)}  (delta = metersIn - prevIn)`);
    console.log(`    movement.cancel: ${fmt(colMovement?.metersOut ?? cancelDelta)}  (delta = metersOut - prevOut)`);
    console.log(`    MACHINE GROSS  : ${fmt(machineGross)}`);

    // Check prevIn/prevOut against previous collection
    const reportTimestamp = report.timestamp ? new Date(report.timestamp as string) : new Date();
    const prevCol = await db.collection('collections').findOne(
      {
        machineId: mid,
        isCompleted: true,
        locationReportId: { $exists: true, $ne: '' },
        timestamp: { $lt: reportTimestamp },
      },
      { sort: { timestamp: -1 } }
    ) as Record<string, unknown> | null;

    if (prevCol) {
      const expectedPrevIn = Number(prevCol.metersIn ?? 0);
      const expectedPrevOut = Number(prevCol.metersOut ?? 0);
      const prevInOk = Math.abs(expectedPrevIn - prevIn) < 0.01;
      const prevOutOk = Math.abs(expectedPrevOut - prevOut) < 0.01;
      console.log(`\n  Previous collection check (${String(prevCol.locationReportId ?? '?')}):`);
      console.log(`    expected prevIn  : ${fmt(expectedPrevIn)}  actual: ${fmt(prevIn)}  ${prevInOk ? '✅' : '❌ MISMATCH'}`);
      console.log(`    expected prevOut : ${fmt(expectedPrevOut)}  actual: ${fmt(prevOut)}  ${prevOutOk ? '✅' : '❌ MISMATCH'}`);
    } else {
      console.log(`\n  No previous collection found — first collection for this machine.`);
    }

    if (!hasSmib || isNoSMIBLocation || !sasStart || !sasEnd) {
      console.log(`\n  ⚠ Skipping SAS analysis (no SMIB, noSMIBlocation, or no SAS window)`);
      computedTotalGross += machineGross;
      continue;
    }

    // ── 4a. Collect ALL Meters documents in SAS window ──────────────────────
    console.log(`\n  SAS window:`);
    console.log(`    start: ${localTs(sasStart)}`);
    console.log(`    end  : ${localTs(sasEnd)}`);
    console.log(`    width: ${((sasEnd.getTime() - sasStart.getTime()) / 1000 / 60).toFixed(1)} minutes`);

    const allMeters = await db.collection('meters')
      .find({
        machine: mid,
        readAt: { $gte: sasStart, $lte: sasEnd },
      } as Record<string, unknown>)
      .sort({ readAt: 1 })
      .toArray() as Record<string, unknown>[];

    console.log(`\n  Meters documents in SAS window: ${allMeters.length}`);

    if (allMeters.length === 0) {
      console.log(`  ⚠ No Meters found in SAS window — can't compute SAS gross`);
      continue;
    }

    // Check for meters slightly before/after window
    const beforeCheck = await db.collection('meters')
      .find({
        machine: mid,
        readAt: { $gte: new Date(sasStart.getTime() - 30 * 60 * 1000), $lt: sasStart },
      } as Record<string, unknown>)
      .sort({ readAt: -1 })
      .toArray() as Record<string, unknown>[];

    const afterCheck = await db.collection('meters')
      .find({
        machine: mid,
        readAt: { $gt: sasEnd, $lte: new Date(sasEnd.getTime() + 30 * 60 * 1000) },
      } as Record<string, unknown>)
      .sort({ readAt: 1 })
      .toArray() as Record<string, unknown>[];

    if (beforeCheck.length > 0) {
      const lastBefore = beforeCheck[beforeCheck.length - 1];
      const mvt = lastBefore.movement as Record<string, unknown> | undefined;
      console.log(`\n  Last meter BEFORE window (${localTs(lastBefore.readAt)}):  drop=${fmt(mvt?.drop ?? 0)}  cancelled=${fmt(mvt?.totalCancelledCredits ?? 0)}  src=${lastBefore.meterSource ?? 'SMIB'}`);
    }
    if (afterCheck.length > 0) {
      const firstAfter = afterCheck[0];
      const mvt = firstAfter.movement as Record<string, unknown> | undefined;
      console.log(`  First meter AFTER window (${localTs(firstAfter.readAt)}):  drop=${fmt(mvt?.drop ?? 0)}  cancelled=${fmt(mvt?.totalCancelledCredits ?? 0)}  src=${firstAfter.meterSource ?? 'SMIB'}`);
    }

    // Print all meters
    for (const m of allMeters) {
      const mvt = m.movement as Record<string, unknown> | undefined;
      const src = String(m.meterSource ?? 'SMIB').padEnd(20);
      const isCR = m.meterSource === 'COLLECTION_REPORT';
      const isSupp = m.isSupplemental === true;
      console.log(`    ${localTs(m.readAt)}  drop=${String(fmt(mvt?.drop ?? 0)).padStart(10)}  cancelled=${String(fmt(mvt?.totalCancelledCredits ?? 0)).padStart(10)}  gross=${String(fmt((mvt?.drop ?? 0) - (mvt?.totalCancelledCredits ?? 0))).padStart(10)}  src=${src}${isCR ? ' ⚠ COLLECTION_REPORT' : ''}${isSupp ? ' (supplemental)' : ''}`);
    }

    // ── 4b. Compute SAS gross ALL sources ──────────────────────────────────
    let sasDropAll = 0, sasCancelledAll = 0, sasJackpotAll = 0;
    for (const m of allMeters) {
      const mvt = m.movement as Record<string, unknown> | undefined;
      sasDropAll += Number(mvt?.drop ?? 0);
      sasCancelledAll += Number(mvt?.totalCancelledCredits ?? 0);
      sasJackpotAll += Number(mvt?.jackpot ?? 0);
    }
    const sasGrossAll = sasDropAll - sasCancelledAll;
    const variationAll = machineGross - (includeJackpot ? sasGrossAll - sasJackpotAll : sasGrossAll);

    // ── 4c. Compute SAS gross SMIB-only (exclude COLLECTION_REPORT) ────────
    const smibMeters = allMeters.filter(m => m.meterSource !== 'COLLECTION_REPORT');
    let sasDropSmib = 0, sasCancelledSmib = 0, sasJackpotSmib = 0;
    for (const m of smibMeters) {
      const mvt = m.movement as Record<string, unknown> | undefined;
      sasDropSmib += Number(mvt?.drop ?? 0);
      sasCancelledSmib += Number(mvt?.totalCancelledCredits ?? 0);
      sasJackpotSmib += Number(mvt?.jackpot ?? 0);
    }
    const sasGrossSmib = sasDropSmib - sasCancelledSmib;
    const variationSmib = machineGross - (includeJackpot ? sasGrossSmib - sasJackpotSmib : sasGrossSmib);

    console.log(`\n  SAS GROSS SUMMARY:`);
    console.log(`    Machine gross (collector): ${fmt(machineGross)}`);
    console.log(`    All meters in window: drop=${fmt(sasDropAll)}  cancelled=${fmt(sasCancelledAll)}  gross=${fmt(sasGrossAll)}`);
    console.log(`    SMIB-only meters   : drop=${fmt(sasDropSmib)}  cancelled=${fmt(sasCancelledSmib)}  gross=${fmt(sasGrossSmib)}`);
    console.log(`    Variation (all meters)    : ${fmt(variationAll)}  ${Math.abs(variationAll) < 0.01 ? '✅ ZERO' : '❌ NON-ZERO'}`);
    console.log(`    Variation (SMIB-only)     : ${fmt(variationSmib)}  ${Math.abs(variationSmib) < 0.01 ? '✅ ZERO' : '❌ NON-ZERO'}`);

    const crCount = allMeters.filter(m => m.meterSource === 'COLLECTION_REPORT').length;
    if (crCount > 0) {
      console.log(`\n  ⚠ COLLECTION_REPORT meters detected: ${crCount}`);
      if (Math.abs(variationSmib) < 0.01 && Math.abs(variationAll) >= 0.01) {
        console.log(`  ✅ ROOT CAUSE IDENTIFIED: Variation is caused by COLLECTION_REPORT meters inside the SAS window.`);
        console.log(`     Excluding them resolves the variation completely.`);
        totalFalseVariationRisk++;
      } else if (Math.abs(variationSmib) >= 0.01) {
        console.log(`  ❌ Variation persists even without COLLECTION_REPORT meters — actual data issue.`);
      }
    }

    // ── 4d. Compare collector's sasMeters snapshot vs live aggregation ──────
    const storedSasDrop = Number(sasMeters?.drop ?? 0);
    const storedSasCancelled = Number(sasMeters?.totalCancelledCredits ?? 0);
    const storedSasGross = Number(sasMeters?.gross ?? 0);
    console.log(`\n  Collector vs SMIB comparison:`);
    console.log(`    Collector entered metersIn   : ${fmt(metersIn)}  metersOut: ${fmt(metersOut)}`);
    console.log(`    Stored sasMeters snapshot    : drop=${fmt(storedSasDrop)}  cancelled=${fmt(storedSasCancelled)}  gross=${fmt(storedSasGross)}`);
    console.log(`    SMIB relay reported (window) : drop=${fmt(sasDropSmib)}  cancelled=${fmt(sasCancelledSmib)}  gross=${fmt(sasGrossSmib)}`);
    console.log(`    Collector drop delta         : ${fmt(dropDelta)}`);
    console.log(`    Collector cancelled delta    : ${fmt(cancelDelta)}`);

    const collectorIsCorrect = Math.abs(dropDelta - sasDropSmib) < 0.01 && Math.abs(cancelDelta - sasCancelledSmib) < 0.01;
    if (collectorIsCorrect && Math.abs(variationSmib) < 0.01) {
      console.log(`\n  ✅ COLLECTOR DATA IS CORRECT — matches SMIB relay precisely.`);
    } else if (collectorIsCorrect && Math.abs(variationSmib) >= 0.01) {
      console.log(`\n  ⚠ Collector data matches SMIB but variation persists — window boundary issue?`);
    } else {
      console.log(`\n  ❌ Collector data MISMATCHES SMIB relay by:`);
      console.log(`     drop diff: ${fmt(dropDelta - sasDropSmib)}`);
      console.log(`     cancel diff: ${fmt(cancelDelta - sasCancelledSmib)}`);
    }

    // ── 4e. Check: Would a follow-up CR have a false variation? ─────────────
    // The key question: if a new CR is created for this same machine (while offline),
    // the new SAS window would include these COLLECTION_REPORT meters.
    // Those synthetic meters would create a false variation when compared to machine gross.
    if (crCount > 0) {
      console.log(`\n  🔮 FOLLOW-UP CR ANALYSIS:`);
      console.log(`     If a 2nd CR is created for this machine while OFFLINE:`);
      console.log(`     - The new SAS window will include ${crCount} COLLECTION_REPORT meter(s) from THIS report`);
      console.log(`     - These will show up as SMIB data (false positives)`);
      console.log(`     - The new machine gross will be based on new collector readings`);
      console.log(`     - But the new SAS window will sum: SMIB-data + these COLLECTION_REPORT meters`);

      // Find the machine's current collectionMeters (which was updated when this CR was finalized)
      const newPrevIn = machineColMeters?.metersIn ?? metersIn;
      const newPrevOut = machineColMeters?.metersOut ?? metersOut;
      console.log(`     - Current machine.collectionMeters: metersIn=${fmt(newPrevIn)} metersOut=${fmt(newPrevOut)}`);
      console.log(`     - If collector reads new values (say ${fmt(newPrevIn + dropDelta)} / ${fmt(newPrevOut + cancelDelta)}):`);
      const hypotheticalNewDropDelta = dropDelta; // same drop again
      const hypotheticalNewMachineGross = hypotheticalNewDropDelta - cancelDelta;
      console.log(`       → new machine gross would be ~${fmt(hypotheticalNewMachineGross)}`);
      console.log(`       → new SAS window sum (inc. CR meters): gross=${fmt(sasGrossAll)}`);
      console.log(`       → APPARENT variation: ${fmt(hypotheticalNewMachineGross - sasGrossAll)}`);
      console.log(`       → TRUE variation (excl. CR meters): ${fmt(hypotheticalNewMachineGross - sasGrossSmib)}`);

      if (Math.abs(sasGrossAll - sasGrossSmib) > 0.01) {
        console.log(`\n     🚨 RISK CONFIRMED: COLLECTION_REPORT meters would cause FALSE variation`);
        console.log(`        Amount of false variation: ${fmt(sasGrossAll - sasGrossSmib)}`);
        console.log(`        These ${crCount} synthetic meter(s) must be excluded from follow-up CR SAS queries.`);
      }
    }

    computedTotalGross += machineGross;
    computedTotalSasGross += sasGrossAll;
    computedSasGrossSmibOnly += sasGrossSmib;
    computedTotalVariation += variationAll;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. REPORT-LEVEL SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  sep('REPORT SUMMARY', 80, '═');
  console.log(`  Stored totalGross         : ${fmt(report.totalGross)}`);
  console.log(`  Computed totalGross       : ${fmt(computedTotalGross)}`);
  console.log(`  Stored totalSasGross      : ${fmt(report.totalSasGross)}`);
  console.log(`  Computed totalSasGross    : ${fmt(computedTotalSasGross)}`);
  console.log(`  Computed SAS (SMIB-only)  : ${fmt(computedSasGrossSmibOnly)}`);
  console.log(`  Stored totalVariation     : ${fmt(report.totalVariation)}`);
  console.log(`  Computed totalVariation   : ${fmt(computedTotalVariation)}`);
  console.log(`  Variation if SMIB-only    : ${fmt(computedTotalGross - computedSasGrossSmibOnly)}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. CONCLUSION
  // ═══════════════════════════════════════════════════════════════════════════
  sep('ANALYSIS & CONCLUSIONS', 80, '═');

  const storedVar = Number(report.totalVariation ?? 0);
  const smibOnlyVar = computedTotalGross - computedSasGrossSmibOnly;

  if (Math.abs(storedVar) < 0.01) {
    console.log('  ✅ Report has ZERO variation — all good.');
  } else if (Math.abs(smibOnlyVar) < 0.01 && Math.abs(storedVar) >= 0.01) {
    console.log('  ✅ Variation is ENTIRELY caused by COLLECTION_REPORT meters in the SAS window.');
    console.log('     When excluding synthetic CR meters, variation disappears completely.');
    console.log('\n  RECOMMENDATION: Filter out meterSource === "COLLECTION_REPORT" in variation queries');
    console.log(`  (${totalFalseVariationRisk} of ${collections.length} machines have this issue)`);
  } else {
    console.log('  ❌ True data mismatch exists — variation persists even without CR meters.');
    console.log('     Check prevIn/prevOut baselines and actual SMIB readings.');
  }

  console.log(`\n  Follow-up CR risk: ${totalFalseVariationRisk > 0 ? '🚨 YES — synthetic meters would cause false variation' : '✅ No — no CR meters to cause false variation'}`);
  console.log(`  False variation amount: ${fmt(computedTotalSasGross - computedSasGrossSmibOnly)}`);

  await mongoose.disconnect();
  console.log('\nDone.\n');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
