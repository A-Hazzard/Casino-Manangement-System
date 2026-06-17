/**
 * Variation Investigation Script
 *
 * Diagnoses why machine gross ≠ SAS gross for a collection report and tells
 * you EXACTLY what to adjust (time window, meter exclusions, or prevIn/prevOut)
 * to resolve the variation.
 *
 * Usage:
 *   bun run scripts/investigate-variation.ts <locationReportId>     ← full report by UUID
 *   bun run scripts/investigate-variation.ts <collectionId>         ← single collection by 24-hex _id
 *   bun run scripts/investigate-variation.ts                        ← most recent report
 *
 * ID format detection:
 *   24 hex chars → MongoDB _id → single-collection mode
 *   UUID with dashes → locationReportId → full report mode
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI as string;

// ─────────────────────────────────────────────────────────────────────────────
// Formatting helpers
// ─────────────────────────────────────────────────────────────────────────────

function sep(title: string, width = 80, char = '─') {
  const bar = char.repeat(width);
  if (!title) return console.log(bar);
  console.log(`\n${bar}`);
  console.log(`  ${title}`);
  console.log(bar);
}

function row(label: string, value: unknown, indent = 2, flag = '') {
  const prefix = ' '.repeat(indent);
  const val = value === null || value === undefined ? 'null' : String(value);
  const suffix = flag ? `  ${flag}` : '';
  console.log(`${prefix}${label.padEnd(42)}${val}${suffix}`);
}

function fmt(n: unknown): string {
  if (n === null || n === undefined) return 'null';
  const num = Number(n);
  return isNaN(num) ? String(n) : num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
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
    hour12: true,
    timeZoneName: 'short',
  });
}

function sign(n: number): string {
  return n >= 0 ? `+${fmt(n)}` : fmt(n);
}

// ─────────────────────────────────────────────────────────────────────────────
// Core analysis helpers
// ─────────────────────────────────────────────────────────────────────────────

type MeterDoc = Record<string, unknown> & {
  readAt: Date;
  movement?: { drop?: number; totalCancelledCredits?: number; jackpot?: number };
  meterSource?: string;
};

/** Sum movement fields from an array of meter docs */
function sumMeters(meters: MeterDoc[]): { drop: number; cancelled: number; jackpot: number; gross: number } {
  let drop = 0, cancelled = 0, jackpot = 0;
  for (const m of meters) {
    drop += m.movement?.drop ?? 0;
    cancelled += m.movement?.totalCancelledCredits ?? 0;
    jackpot += m.movement?.jackpot ?? 0;
  }
  return { drop, cancelled, jackpot, gross: drop - cancelled };
}

/**
 * Given a target drop and cancelled, search every contiguous subset of the
 * available meters (sorted by readAt) that sums exactly to the target.
 * Returns the best matching window [start, end] timestamps.
 * Set mustInclude to require a specific meter to always be in the subset.
 */
function findMatchingWindow(
  meters: MeterDoc[],
  targetDrop: number,
  targetCancelled: number,
  mustInclude?: Date,
): { start: Date; end: Date; meters: MeterDoc[]; exact: boolean } | null {
  const sorted = [...meters].sort((a, b) => a.readAt.getTime() - b.readAt.getTime());
  const n = sorted.length;

  // Try every [i, j] window
  for (let i = 0; i < n; i++) {
    let drop = 0, cancelled = 0;
    for (let j = i; j < n; j++) {
      drop += sorted[j].movement?.drop ?? 0;
      cancelled += sorted[j].movement?.totalCancelledCredits ?? 0;
      // If mustInclude is set, skip windows that don't contain that timestamp
      if (mustInclude) {
        const windowCoversRequired =
          sorted[i].readAt <= mustInclude && sorted[j].readAt >= mustInclude;
        if (!windowCoversRequired) continue;
      }
      if (Math.abs(drop - targetDrop) < 0.01 && Math.abs(cancelled - targetCancelled) < 0.01) {
        return {
          start: sorted[i].readAt,
          end: sorted[j].readAt,
          meters: sorted.slice(i, j + 1),
          exact: true,
        };
      }
    }
  }

  // No exact match — find the window whose gross is closest to target gross
  const targetGross = targetDrop - targetCancelled;
  let bestDiff = Infinity;
  let bestResult: { start: Date; end: Date; meters: MeterDoc[]; exact: boolean } | null = null;

  for (let i = 0; i < n; i++) {
    let drop = 0, cancelled = 0;
    for (let j = i; j < n; j++) {
      drop += sorted[j].movement?.drop ?? 0;
      cancelled += sorted[j].movement?.totalCancelledCredits ?? 0;
      const gross = drop - cancelled;
      const diff = Math.abs(gross - targetGross);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestResult = {
          start: sorted[i].readAt,
          end: sorted[j].readAt,
          meters: sorted.slice(i, j + 1),
          exact: false,
        };
      }
    }
  }

  return bestResult;
}

// ─────────────────────────────────────────────────────────────────────────────
// Location / licencee config helper
// ─────────────────────────────────────────────────────────────────────────────

async function fetchLocationConfig(
  db: mongoose.mongo.Db,
  locationId: unknown
): Promise<{ includeJackpot: boolean; isNoSMIBLocation: boolean }> {
  if (!locationId) return { includeJackpot: false, isNoSMIBLocation: false };
  const location = await db.collection('gaminglocations').findOne(
    { _id: locationId },
    { projection: { 'rel.licencee': 1, noSMIBLocation: 1 } }
  );
  const isNoSMIBLocation = location?.noSMIBLocation === true;
  let includeJackpot = false;
  if (location?.rel?.licencee) {
    const licencee = await db.collection('licencees').findOne(
      { _id: location.rel.licencee },
      { projection: { includeJackpot: 1 } }
    );
    includeJackpot = Boolean(licencee?.includeJackpot);
  }
  return { includeJackpot, isNoSMIBLocation };
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-collection analysis (shared by both modes)
// ─────────────────────────────────────────────────────────────────────────────

async function analyseCollection(
  db: mongoose.mongo.Db,
  col: Record<string, unknown>,
  machineMap: Map<string, unknown>,
  isNoSMIBLocation: boolean,
  includeJackpot: boolean,
  report: Record<string, unknown> | null,
  _totalGross: number,
  _totalSasGross: number,
  _totalVariation: number,
  accumulate: (mg: number, sg: number, vr: number) => void
) {
  const mid = String(col.machineId);
  const machine = machineMap.get(mid) as Record<string, unknown> | undefined;
  const hasSmib = Boolean((machine?.relayId as string)?.trim());
  const lastActivity = machine?.lastActivity ? new Date(machine.lastActivity as string) : null;
  const lastActivityAgo = lastActivity ? Math.round((Date.now() - lastActivity.getTime()) / 1000) + 's ago' : 'never';

  const metersIn = Number(col.metersIn ?? 0);
  const metersOut = Number(col.metersOut ?? 0);
  const prevIn = Number(col.prevIn ?? 0);
  const prevOut = Number(col.prevOut ?? 0);

  const dropDelta = col.movement?.metersIn != null ? Number((col.movement as Record<string, unknown>).metersIn) : (metersIn - prevIn);
  const cancelDelta = col.movement?.metersOut != null ? Number((col.movement as Record<string, unknown>).metersOut) : (metersOut - prevOut);
  const machineGross = col.movement?.gross != null ? Number((col.movement as Record<string, unknown>).gross) : (dropDelta - cancelDelta);

  const sasStart = col.sasMeters?.sasStartTime ? new Date(col.sasMeters.sasStartTime as string) : null;
  const sasEnd = col.sasMeters?.sasEndTime ? new Date(col.sasMeters.sasEndTime as string) : null;

  sep(`MACHINE: ${machine?.serialNumber ?? mid} (${mid})`, 80, '─');
  row('relayId (SMIB):', (machine?.relayId as string) ?? 'NONE — no SMIB');
  row('lastActivity:', lastActivityAgo);
  row('meterId (supplemental):', (col.meterId as string) ?? 'NOT SET');
  row('ramClear:', col.ramClear ?? false);
  row('sasMeters.gross (stored):', fmt(col.sasMeters?.gross));
  row('');
  row('metersIn (absolute):', fmt(metersIn));
  row('prevIn   (baseline):', fmt(prevIn));
  row('drop delta:', fmt(dropDelta), 2, '← metersIn − prevIn');
  row('');
  row('metersOut (absolute):', fmt(metersOut));
  row('prevOut   (baseline):', fmt(prevOut));
  row('cancelled delta:', fmt(cancelDelta), 2, '← metersOut − prevOut');
  row('');
  row('MACHINE GROSS:', fmt(machineGross), 2, `← drop(${fmt(dropDelta)}) − cancelled(${fmt(cancelDelta)})`);
  row('');
  row('SAS window start:', localTs(sasStart));
  row('SAS window end:', localTs(sasEnd));

  if (!hasSmib || isNoSMIBLocation) {
    console.log('\n  ℹ  No SMIB — variation is always 0, skipping SAS analysis.');
    accumulate(machineGross, machineGross, 0);
    return;
  }

  if (!sasStart || !sasEnd) {
    console.log('\n  ⚠  No SAS time window — cannot perform meter analysis.');
    accumulate(machineGross, 0, machineGross);
    return;
  }

  const wideStart = new Date(sasStart.getTime() - 2 * 60 * 60 * 1000);
  const wideEnd = new Date(sasEnd.getTime() + 2 * 60 * 60 * 1000);

  const wideMeters = await db.collection('meters').find({
    machine: mid,
    readAt: { $gte: wideStart, $lte: wideEnd },
    deletedAt: null,
  }).sort({ readAt: 1 }).toArray() as MeterDoc[];

  const inWindow = wideMeters.filter(m => m.readAt >= sasStart && m.readAt <= sasEnd);
  const beforeWindow = wideMeters.filter(m => m.readAt < sasStart);
  const afterWindow = wideMeters.filter(m => m.readAt > sasEnd);

  const smibMetersInWindow = inWindow.filter(m => m.meterSource !== 'COLLECTION_REPORT');
  const crMetersInWindow = inWindow.filter(m => m.meterSource === 'COLLECTION_REPORT');

  console.log(`\n  ┌── ALL METERS in wide window (±2h around SAS): ${wideMeters.length} total`);
  for (const m of wideMeters) {
    const inW = m.readAt >= sasStart && m.readAt <= sasEnd;
    const isCR = m.meterSource === 'COLLECTION_REPORT';
    const marker = inW ? (isCR ? '<<< CR ' : '<<< SAS') : '       ';
    const mvt = m.movement ?? {};
    const drop = mvt.drop ?? 0;
    const cancelled = mvt.totalCancelledCredits ?? 0;
    const src = (m.meterSource as string ?? '?').padEnd(20);
    const sign_ = (n: number) => n !== 0 ? fmt(n) : '0';
    console.log(
      `  │  ${marker}  ${localTs(m.readAt).padEnd(32)}  ` +
      `drop=${String(sign_(drop)).padStart(8)}  cancelled=${String(sign_(cancelled)).padStart(10)}  src=${src}` +
      (isCR ? '  ⚠ SYNTHETIC' : '')
    );
  }
  console.log('  └──');

  const currentWindowSum = sumMeters(inWindow);
  const smibOnlySum = sumMeters(smibMetersInWindow);

  sep('  ANALYSIS — Current Window', 78, '·');

  console.log(`\n  All meters in window (${inWindow.length}):`);
  row('    Σ drop:', fmt(currentWindowSum.drop));
  row('    Σ cancelled:', fmt(currentWindowSum.cancelled));
  row('    SAS Gross:', fmt(currentWindowSum.gross));
  row('    Variation (machine − SAS):', sign(machineGross - currentWindowSum.gross),
    4, Math.abs(machineGross - currentWindowSum.gross) < 0.01 ? '✅ ZERO' : '❌ MISMATCH');

  if (crMetersInWindow.length > 0) {
    sumMeters(crMetersInWindow);
    console.log(`\n  ⚠  ISSUE DETECTED: ${crMetersInWindow.length} COLLECTION_REPORT meter(s) inside SAS window`);
    console.log(`     These are SYNTHETIC meters created FROM the collection data.`);
    console.log(`     Including them DOUBLE-COUNTS any SMIB readings they duplicate.`);
    console.log(`\n  SMIB-only meters in window (${smibMetersInWindow.length}):`);
    row('    Σ drop:', fmt(smibOnlySum.drop));
    row('    Σ cancelled:', fmt(smibOnlySum.cancelled));
    row('    SAS Gross (excluding CR meters):', fmt(smibOnlySum.gross));
    const varExclCR = machineGross - smibOnlySum.gross;
    row('    Variation if CR meters excluded:', sign(varExclCR),
      4, Math.abs(varExclCR) < 0.01 ? '✅ ZERO — this fixes it' : `❌ Still ${fmt(varExclCR)}`);

    if (Math.abs(varExclCR) < 0.01) {
      console.log('\n  ✅ ROOT CAUSE: variation checker includes COLLECTION_REPORT meters.');
      console.log('     FIX: Filter `source !== "COLLECTION_REPORT"` in the SAS meter query');
      console.log('          in app/api/collection-reports/check-variations/route.ts');
    }
  }

  const beforeSum = sumMeters(beforeWindow);
  const afterSum = sumMeters(afterWindow);

  const varWithBefore = machineGross - sumMeters([...beforeWindow, ...inWindow]).gross;
  const varWithAfter = machineGross - sumMeters([...inWindow, ...afterWindow]).gross;
  const varWithBoth = machineGross - sumMeters([...beforeWindow, ...inWindow, ...afterWindow]).gross;
  const varSmibWithBefore = machineGross - sumMeters([...beforeWindow, ...smibMetersInWindow]).gross;
  const varSmibWithAfter = machineGross - sumMeters([...smibMetersInWindow, ...afterWindow]).gross;
  const varSmibWithBoth = machineGross - sumMeters([...beforeWindow, ...smibMetersInWindow, ...afterWindow]).gross;

  if (beforeWindow.length > 0 || afterWindow.length > 0) {
    sep('  ANALYSIS — Window Boundary Adjustments', 78, '·');
    console.log('');

    if (beforeWindow.length > 0) {
      console.log(`  Meters BEFORE window (${beforeWindow.length}):`);
      for (const m of beforeWindow) {
        const mvt = m.movement ?? {};
        const isCR = m.meterSource === 'COLLECTION_REPORT';
        console.log(`     ${localTs(m.readAt)}  drop=${fmt(mvt.drop ?? 0)}  cancelled=${fmt(mvt.totalCancelledCredits ?? 0)}  src=${m.meterSource ?? '?'}${isCR ? ' ← CR' : ''}`);
      }
      row('    Before Σ drop:', fmt(beforeSum.drop));
      row('    Before Σ cancelled:', fmt(beforeSum.cancelled));
      row('    Variation if window extended to include BEFORE:', sign(varWithBefore),
        4, Math.abs(varWithBefore) < 0.01 ? '✅ ZERO' : '');
      if (crMetersInWindow.length > 0) {
        row('    Variation (SMIB-only + BEFORE):', sign(varSmibWithBefore),
          4, Math.abs(varSmibWithBefore) < 0.01 ? '✅ ZERO' : '');
      }
    }

    if (afterWindow.length > 0) {
      console.log(`\n  Meters AFTER window (${afterWindow.length}):`);
      for (const m of afterWindow) {
        const mvt = m.movement ?? {};
        console.log(`     ${localTs(m.readAt)}  drop=${fmt(mvt.drop ?? 0)}  cancelled=${fmt(mvt.totalCancelledCredits ?? 0)}  src=${m.meterSource ?? '?'}`);
      }
      row('    After Σ drop:', fmt(afterSum.drop));
      row('    After Σ cancelled:', fmt(afterSum.cancelled));
      row('    Variation if window extended to include AFTER:', sign(varWithAfter),
        4, Math.abs(varWithAfter) < 0.01 ? '✅ ZERO' : '');
      if (crMetersInWindow.length > 0) {
        row('    Variation (SMIB-only + AFTER):', sign(varSmibWithAfter),
          4, Math.abs(varSmibWithAfter) < 0.01 ? '✅ ZERO' : '');
      }
    }

    if (beforeWindow.length > 0 && afterWindow.length > 0) {
      row('\n    Variation if window covers ALL (before+in+after):', sign(varWithBoth),
        4, Math.abs(varWithBoth) < 0.01 ? '✅ ZERO' : '');
      if (crMetersInWindow.length > 0) {
        row('    Variation (SMIB-only + before + after):', sign(varSmibWithBoth),
          4, Math.abs(varSmibWithBoth) < 0.01 ? '✅ ZERO' : '');
      }
    }
  }

  sep('  ANALYSIS — Smart Window Search', 78, '·');
  console.log(`\n  Searching for a window of available meters that matches machine gross:`);
  console.log(`  Target: drop=${fmt(dropDelta)}, cancelled=${fmt(cancelDelta)}, gross=${fmt(machineGross)}\n`);

  const smibMetersWide = wideMeters.filter(m => m.meterSource !== 'COLLECTION_REPORT');
  const matchSmib = findMatchingWindow(smibMetersWide, dropDelta, cancelDelta);

  const matchWithCR = crMetersInWindow.length > 0
    ? findMatchingWindow(wideMeters, dropDelta, cancelDelta, crMetersInWindow[0].readAt)
    : null;

  if (matchSmib?.exact) {
    const mSum = sumMeters(matchSmib.meters);
    console.log(`  ✅ OPTION A — SMIB meters only (${matchSmib.meters.length} meters):`);
    for (const m of matchSmib.meters) {
      const mvt = m.movement ?? {};
      console.log(`     ${localTs(m.readAt)}  drop=${fmt(mvt.drop ?? 0)}  cancelled=${fmt(mvt.totalCancelledCredits ?? 0)}  src=${m.meterSource ?? '?'}`);
    }
    console.log(`  Σ drop=${fmt(mSum.drop)}  Σ cancelled=${fmt(mSum.cancelled)}  gross=${fmt(mSum.gross)}`);
    const startChanged = Math.abs(matchSmib.start.getTime() - sasStart.getTime()) > 60_000;
    const endChanged = Math.abs(matchSmib.end.getTime() - sasEnd.getTime()) > 60_000;
    if (startChanged || endChanged) {
      console.log(`  → sasStartTime: ${localTs(matchSmib.start)}${startChanged ? ` (was ${localTs(sasStart)}, shift ${matchSmib.start > sasStart ? 'LATER' : 'EARLIER'})` : ' ✓'}`);
      console.log(`  → sasEndTime:   ${localTs(matchSmib.end)}${endChanged ? ` (was ${localTs(sasEnd)}, shift ${matchSmib.end > sasEnd ? 'LATER' : 'EARLIER'})` : ' ✓'}`);
    } else {
      console.log(`  → Window boundaries already correct — exclude CR source in the query`);
    }
  }

  if (matchWithCR?.exact) {
    const mSum = sumMeters(matchWithCR.meters);
    console.log(`\n  ✅ OPTION B — Include COLLECTION_REPORT meter, adjust boundaries (${matchWithCR.meters.length} meters):`);
    for (const m of matchWithCR.meters) {
      const mvt = m.movement ?? {};
      const isCR = m.meterSource === 'COLLECTION_REPORT';
      console.log(`     ${localTs(m.readAt)}  drop=${fmt(mvt.drop ?? 0)}  cancelled=${fmt(mvt.totalCancelledCredits ?? 0)}  src=${m.meterSource ?? '?'}${isCR ? ' ← CR' : ''}`);
    }
    console.log(`  Σ drop=${fmt(mSum.drop)}  Σ cancelled=${fmt(mSum.cancelled)}  gross=${fmt(mSum.gross)}`);
    const startChanged = Math.abs(matchWithCR.start.getTime() - sasStart.getTime()) > 60_000;
    const endChanged = Math.abs(matchWithCR.end.getTime() - sasEnd.getTime()) > 60_000;
    if (startChanged || endChanged) {
      console.log(`  → sasStartTime: ${localTs(matchWithCR.start)}${startChanged ? ` (was ${localTs(sasStart)}, shift ${matchWithCR.start > sasStart ? 'LATER' : 'EARLIER'})` : ' ✓'}`);
      console.log(`  → sasEndTime:   ${localTs(matchWithCR.end)}${endChanged ? ` (was ${localTs(sasEnd)}, shift ${matchWithCR.end > sasEnd ? 'LATER' : 'EARLIER'})` : ' ✓'}`);
    } else {
      console.log(`  → Window boundaries are already correct for this option`);
    }
  } else if (crMetersInWindow.length > 0 && !matchWithCR?.exact) {
    console.log(`\n  ℹ  OPTION B — No window containing the CR meter produces zero variation.`);
    console.log(`     The CR meter's values don't match the machine gross on their own or combined.`);
  }

  if (!matchSmib?.exact && !matchWithCR?.exact) {
    const best = matchSmib ?? matchWithCR;
    if (best) {
      const mSum = sumMeters(best.meters);
      const remaining = machineGross - mSum.gross;
      console.log(`  ⚠  No exact match found in ±2h window. Closest (${best.meters.length} meters):`);
      for (const m of best.meters) {
        const mvt = m.movement ?? {};
        console.log(`     ${localTs(m.readAt)}  drop=${fmt(mvt.drop ?? 0)}  cancelled=${fmt(mvt.totalCancelledCredits ?? 0)}`);
      }
      console.log(`\n  Σ drop=${fmt(mSum.drop)}  Σ cancelled=${fmt(mSum.cancelled)}  gross=${fmt(mSum.gross)}`);
      console.log(`  Remaining gap: ${sign(remaining)}`);
      console.log(`\n  Possible causes:`);
      console.log(`  • Meters outside the ±2h search window — the collection gap is longer than 2h`);
      console.log(`  • prevIn or prevOut baseline is wrong (check section below)`);
      console.log(`  • The machine sent an absolute meter value as a delta (check ROGUE section)`);
    } else {
      console.log('  No meters available to search.');
    }
  }

  const rogueThreshold = 10_000;
  const rogueMeters = wideMeters.filter(m => {
    const mvt = m.movement ?? {};
    return (mvt.drop ?? 0) > rogueThreshold || (mvt.totalCancelledCredits ?? 0) > rogueThreshold;
  });
  if (rogueMeters.length > 0) {
    sep('  ⚠  ROGUE METERS DETECTED (value > 10,000 — likely absolute reading sent as delta)', 78, '·');
    for (const m of rogueMeters) {
      const mvt = m.movement ?? {};
      console.log(`\n  ${localTs(m.readAt)}`);
      console.log(`    movement.drop:      ${fmt(mvt.drop)}`);
      console.log(`    movement.cancelled: ${fmt(mvt.totalCancelledCredits)}`);
      console.log(`    source: ${m.meterSource ?? '?'}`);
      console.log(`    → This meter is almost certainly corrupting any SAS window that includes it`);
    }
  }

  const reportTimestamp = report?.timestamp ? new Date(report.timestamp as string) : new Date();
  const prevCol = await db.collection('collections').findOne(
    {
      machineId: mid,
      isCompleted: true,
      locationReportId: { $exists: true, $ne: report ? String(report.locationReportId) : '' },
      timestamp: { $lt: reportTimestamp },
    },
    { sort: { timestamp: -1 } }
  );

  sep('  ANALYSIS — prevIn / prevOut Baseline Check', 78, '·');
  if (prevCol) {
    const prevMachine = prevCol as Record<string, unknown>;
    const expectedPrevIn = Number(prevMachine.metersIn ?? 0);
    const expectedPrevOut = Number(prevMachine.metersOut ?? 0);
    row('Previous collection report:', String(prevMachine.locationReportId));
    row('Previous metersIn:', fmt(expectedPrevIn));
    row('  → current prevIn is:', fmt(prevIn),
      4, Math.abs(expectedPrevIn - prevIn) < 0.01 ? '✅ correct' : `❌ MISMATCH (off by ${fmt(prevIn - expectedPrevIn)})`);
    row('Previous metersOut:', fmt(expectedPrevOut));
    row('  → current prevOut is:', fmt(prevOut),
      4, Math.abs(expectedPrevOut - prevOut) < 0.01 ? '✅ correct' : `❌ MISMATCH (off by ${fmt(prevOut - expectedPrevOut)})`);

    if (Math.abs(expectedPrevIn - prevIn) > 0.01) {
      const correctedDrop = metersIn - expectedPrevIn;
      const correctedCancel = metersOut - expectedPrevOut;
      const correctedGross = correctedDrop - correctedCancel;
      console.log(`\n  If prevIn were correct (${fmt(expectedPrevIn)}):`);
      row('    corrected drop delta:', fmt(correctedDrop));
      row('    corrected cancel delta:', fmt(correctedCancel));
      row('    corrected machine gross:', fmt(correctedGross));
    }
  } else {
    console.log('  No previous completed collection found — this may be the first collection.');
    row('prevIn used:', fmt(prevIn), 2, '(from machine.collectionMeters or 0)');
    row('prevOut used:', fmt(prevOut));
  }

  sep(`  FINAL SUMMARY — ${machine?.serialNumber ?? mid}`, 78, '═');

  const currentVariation = machineGross - (includeJackpot ? currentWindowSum.gross - currentWindowSum.jackpot : currentWindowSum.gross);
  const smibVariation = machineGross - (includeJackpot ? smibOnlySum.gross - smibOnlySum.jackpot : smibOnlySum.gross);

  row('Machine Gross:', fmt(machineGross));
  row('SAS Gross (current window, all meters):', fmt(currentWindowSum.gross));
  row('SAS Gross (SMIB-only, excl. CR meters):', fmt(smibOnlySum.gross));
  row('Variation (current):', sign(currentVariation), 2, Math.abs(currentVariation) < 0.01 ? '✅' : '❌');
  row('Variation (SMIB-only):', sign(smibVariation), 2, Math.abs(smibVariation) < 0.01 ? '✅' : '❌');

  accumulate(machineGross, currentWindowSum.gross, currentVariation);
}

async function main() {
  if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;
  const arg = process.argv[2] ?? null;

  // ── Detect argument type ──────────────────────────────────────────────────
  // 24 hex chars = MongoDB _id → single-collection mode
  // UUID with dashes = locationReportId → full report mode
  const isCollectionId = arg !== null && /^[0-9a-f]{24}$/i.test(arg);

  // ──────────────────────────────────────────────────────────────────────────
  // SINGLE-COLLECTION MODE: analyse one collection by _id (report may not exist yet)
  // ──────────────────────────────────────────────────────────────────────────
  if (isCollectionId) {
    sep('SINGLE-COLLECTION MODE — ' + arg, 80, '═');

    const singleCol = await db.collection('collections').findOne({ _id: arg }) as Record<string, unknown> | null;
    if (!singleCol) { console.error('Collection not found: ' + arg); await mongoose.disconnect(); return; }

    row('_id:', singleCol._id);
    row('machineId:', singleCol.machineId);
    row('locationReportId:', singleCol.locationReportId || '(none — not yet in a report)');
    row('isCompleted:', singleCol.isCompleted);
    row('meterId:', singleCol.meterId ?? 'NOT SET');
    row('');

    const { includeJackpot, isNoSMIBLocation } = await fetchLocationConfig(db, singleCol.location);
    row('noSMIBLocation:', isNoSMIBLocation);
    row('includeJackpot:', includeJackpot);

    const mid = String(singleCol.machineId);
    const machineDoc = await db.collection('machines').findOne(
      { _id: mid },
      { projection: { _id: 1, relayId: 1, serialNumber: 1, lastActivity: 1 } }
    );
    const machineMap = new Map([[mid, machineDoc]]);

    const colls = [singleCol];
    let computedTotalGross = 0, computedTotalSasGross = 0, computedTotalVariation = 0;

    for (const col of colls) {
      await analyseCollection(db, col, machineMap, isNoSMIBLocation, includeJackpot, null,
        computedTotalGross, computedTotalSasGross, computedTotalVariation,
        (mg, sg, vr) => { computedTotalGross += mg; computedTotalSasGross += sg; computedTotalVariation += vr; });
    }

    sep('SINGLE-COLLECTION SUMMARY', 80, '═');
    row('Machine Gross:', fmt(computedTotalGross));
    row('SAS Gross:', fmt(computedTotalSasGross));
    row('Variation:', sign(computedTotalVariation), 2,
      Math.abs(computedTotalVariation) < 0.01 ? '✅ ZERO' : '❌');

    await mongoose.disconnect();
    console.log('\nDone.\n');
    return;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // FULL-REPORT MODE: find report by locationReportId (or most recent)
  // ──────────────────────────────────────────────────────────────────────────
  const locationReportId = arg;

  sep('STEP 1 — COLLECTION REPORT', 80, '═');

  const reportRaw = locationReportId
    ? await db.collection('collectionreports').findOne({ locationReportId })
    : (await db.collection('collectionreports').find({}).sort({ timestamp: -1 }).limit(1).toArray())[0];

  if (!reportRaw) { console.error('Report not found'); await mongoose.disconnect(); return; }

  const report = reportRaw as Record<string, unknown>;
  row('locationReportId:', report.locationReportId);
  row('Location:', `${report.locationName} (${report.location})`);
  row('Timestamp (UTC):', ts(report.timestamp));
  row('isEditing:', report.isEditing);
  row('');
  row('Stored totalGross:', fmt(report.totalGross));
  row('Stored totalSasGross:', fmt(report.totalSasGross));
  row('Stored totalVariation:', fmt(report.totalVariation));

  const { includeJackpot, isNoSMIBLocation } = await fetchLocationConfig(db, report.location);
  row('noSMIBLocation:', isNoSMIBLocation);
  row('includeJackpot:', includeJackpot);

  sep('STEP 2 — COLLECTIONS', 80, '═');

  const colls = await db.collection('collections')
    .find({ locationReportId: String(report.locationReportId) })
    .sort({ timestamp: 1 })
    .toArray() as Record<string, unknown>[];

  console.log(`  Found ${colls.length} collection(s)\n`);

  const machineIds = colls.map(c => String(c.machineId)).filter(Boolean);
  const machineDocs = machineIds.length
    ? await db.collection('machines').find(
        { _id: { $in: machineIds } } as Record<string, unknown>,
        { projection: { _id: 1, relayId: 1, serialNumber: 1, collectionMeters: 1, sasMeters: 1 } }
      ).toArray()
    : [];
  const machineMap = new Map(machineDocs.map(m => [String(m._id), m]));

  let computedTotalGross = 0, computedTotalSasGross = 0, computedTotalVariation = 0;

  for (const col of colls) {
    await analyseCollection(db, col, machineMap, isNoSMIBLocation, includeJackpot, report,
      computedTotalGross, computedTotalSasGross, computedTotalVariation,
      (mg, sg, vr) => { computedTotalGross += mg; computedTotalSasGross += sg; computedTotalVariation += vr; });
  }

  sep('REPORT SUMMARY', 80, '═');
  row('Stored totalGross:', fmt(report.totalGross));
  row('Computed totalGross:', fmt(computedTotalGross));
  row('Stored totalSasGross:', fmt(report.totalSasGross));
  row('Computed totalSasGross:', fmt(computedTotalSasGross));
  row('Stored totalVariation:', fmt(report.totalVariation));
  row('Computed totalVariation:', fmt(Math.round(computedTotalVariation * 100) / 100));

  const varDiff = Math.abs(computedTotalVariation - Number(report.totalVariation));
  if (varDiff < 0.01) {
    console.log('\n  ✅ Script and DB agree on the variation figure.');
  } else {
    console.log(`\n  ❌ Script (${fmt(computedTotalVariation)}) ≠ DB (${fmt(report.totalVariation)}) — difference: ${fmt(varDiff)}`);
    console.log('     The check-variations route may be using a different calculation.');
  }

  await mongoose.disconnect();
  console.log('\nDone.\n');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
