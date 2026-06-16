/**
 * V2 Variation Investigation Script
 *
 * Diagnoses why machine gross ≠ SAS gross for a V2 collection session and tells
 * you EXACTLY what to adjust (SAS time window, meter exclusions, or prev meters)
 * to resolve the variation.
 *
 * Usage:
 *   bun run scratch/investigate-v2-variation.ts <sessionId>
 *   bun run scratch/investigate-v2-variation.ts          ← most recent submitted session
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

function sign(n: number): string {
  return n >= 0 ? `+${fmt(n)}` : fmt(n);
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

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type MeterDoc = Record<string, unknown> & {
  readAt: Date;
  movement?: { drop?: number; totalCancelledCredits?: number; jackpot?: number };
  meterSource?: string;
  isSupplemental?: boolean;
};

type ReportedMachineDoc = Record<string, unknown> & {
  _id: string;
  machineId: string;
  machineName?: string;
  machineCustomName?: string;
  serialNumber?: string;
  sessionStatus?: string;
  sasStartTime?: Date;
  sasEndTime?: Date;
  sasMetersIn?: number | null;
  sasMetersOut?: number | null;
  sasGross?: number | null;
  movement?: { manualMetersIn?: number; manualMetersOut?: number; machineGross?: number };
  metersMatch?: boolean;
  ramClear?: boolean;
  isSupplemental?: boolean;
  status?: string;
  prevSasMetersIn?: number;
  prevSasMetersOut?: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Core analysis helpers
// ─────────────────────────────────────────────────────────────────────────────

function sumMeters(meters: MeterDoc[]): { drop: number; cancelled: number; jackpot: number; gross: number } {
  let drop = 0, cancelled = 0, jackpot = 0;
  for (const m of meters) {
    drop += m.movement?.drop ?? 0;
    cancelled += m.movement?.totalCancelledCredits ?? 0;
    jackpot += m.movement?.jackpot ?? 0;
  }
  return { drop, cancelled, jackpot, gross: drop - cancelled };
}

function findMatchingWindow(
  meters: MeterDoc[],
  targetDrop: number,
  targetCancelled: number,
  mustInclude?: Date,
): { start: Date; end: Date; meters: MeterDoc[]; exact: boolean } | null {
  const sorted = [...meters].sort((a, b) => a.readAt.getTime() - b.readAt.getTime());
  const n = sorted.length;

  for (let i = 0; i < n; i++) {
    let drop = 0, cancelled = 0;
    for (let j = i; j < n; j++) {
      drop += sorted[j].movement?.drop ?? 0;
      cancelled += sorted[j].movement?.totalCancelledCredits ?? 0;
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
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;
  const sessionId = process.argv[2] ?? null;

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 1: Find session
  // ──────────────────────────────────────────────────────────────────────────
  sep('STEP 1 — V2 SESSION', 80, '═');

  const query: Record<string, unknown> = sessionId
    ? { sessionId }
    : {};
  const machines = await db.collection('reportedmachines')
    .find(query)
    .sort({ createdAt: -1 })
    .toArray() as ReportedMachineDoc[];

  if (machines.length === 0) {
    console.error('No reported machines found for this session');
    await mongoose.disconnect();
    return;
  }

  // Group by sessionId to find all machines in this session
  const firstMachine = machines[0];
  const resolvedSessionId = String(firstMachine.sessionId);
  const sessionMachines = await db.collection('reportedmachines')
    .find({ sessionId: resolvedSessionId })
    .sort({ sequenceOrder: 1 })
    .toArray() as ReportedMachineDoc[];

  row('Session ID:', resolvedSessionId);
  row('Status:', firstMachine.sessionStatus);
  row('Location:', `${firstMachine.locationName} (${firstMachine.locationId})`);
  row('Machines in session:', sessionMachines.length);
  row('');

  // Session-level summary
  let totalMachineGross = 0;
  let totalSasGross = 0;
  for (const rm of sessionMachines) {
    totalMachineGross += rm.movement?.machineGross ?? 0;
    totalSasGross += rm.sasGross ?? 0;
  }
  row('Total Machine Gross:', fmt(totalMachineGross));
  row('Total SAS Gross:', fmt(totalSasGross));
  row('Total Variation:', sign(totalMachineGross - totalSasGross),
    4, Math.abs(totalMachineGross - totalSasGross) < 0.01 ? '✅ ZERO' : '❌');

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 2: Licencee config
  // ──────────────────────────────────────────────────────────────────────────
  let includeJackpot = false;
  if (firstMachine.licencee) {
    const licencee = await db.collection('licencees').findOne(
      { _id: String(firstMachine.licencee) },
      { projection: { includeJackpot: 1 } }
    );
    includeJackpot = Boolean(licencee?.includeJackpot);
  }
  row('includeJackpot:', includeJackpot);

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 3: Per-machine analysis
  // ──────────────────────────────────────────────────────────────────────────
  sep('STEP 2 — PER-MACHINE ANALYSIS', 80, '═');

  let computedTotalVariation = 0;

  for (const rm of sessionMachines) {
    const mid = String(rm.machineId);
    const movement = rm.movement as { manualMetersIn?: number; manualMetersOut?: number; machineGross?: number } | undefined;
    const machineGross = movement?.machineGross ?? 0;
    const sasGross = (rm.sasGross as number | null) ?? 0;
    const sasStart = rm.sasStartTime ? new Date(rm.sasStartTime as unknown as string) : null;
    const sasEnd = rm.sasEndTime ? new Date(rm.sasEndTime as unknown as string) : null;
    const isSkipped = rm.status === 'skipped';
    const isSupplemental = rm.isSupplemental === true;

    // Get machine doc for relayId, sasMeters, collectionMeters
    const machine = await db.collection('machines').findOne(
      { _id: mid },
      { projection: { relayId: 1, serialNumber: 1, sasMeters: 1, collectionMeters: 1, collectionTime: 1, previousCollectionTime: 1 } }
    ) as Record<string, unknown> | null;
    const hasSmib = Boolean((machine?.relayId as string)?.trim());

    sep(`MACHINE: ${rm.machineCustomName || rm.machineName || rm.serialNumber || mid} (${mid})`, 80, '─');
    if (isSkipped) {
      console.log('\n  ℹ  SKIPPED — no collection data, moving on.');
      continue;
    }
    if (isSupplemental) {
      console.log('\n  ℹ  SUPPLEMENTAL — manual meters for offline SMIB, SAS may differ from Meters.');
    }
    row('relayId (SMIB):', (machine?.relayId as string) ?? 'NONE — no SMIB');
    row('metersMatch:', rm.metersMatch ?? 'N/A');
    row('isSupplemental:', isSupplemental);
    row('ramClear:', rm.ramClear ?? false);
    row('');
    row('Machine Gross (movement.machineGross):', fmt(machineGross));
    row('SAS Gross (stored on doc):', fmt(sasGross));
    row('');

    const sasMetersIn = (rm.sasMetersIn as number | null) ?? null;
    const sasMetersOut = (rm.sasMetersOut as number | null) ?? null;
    row('sasMetersIn (absolute):', fmt(sasMetersIn));
    row('sasMetersOut (absolute):', fmt(sasMetersOut));
    row('prevSasMetersIn:', fmt(rm.prevSasMetersIn));
    row('prevSasMetersOut:', fmt(rm.prevSasMetersOut));

    const manualIn = movement?.manualMetersIn ?? 0;
    const manualOut = movement?.manualMetersOut ?? 0;
    row('Movement Manual In:', fmt(manualIn));
    row('Movement Manual Out:', fmt(manualOut));

    if (!hasSmib) {
      console.log('\n  ℹ  No SMIB — no SAS meters to compare. Skipping SAS analysis.');
      continue;
    }

    if (!sasStart || !sasEnd) {
      console.log('\n  ⚠  No SAS time window — cannot perform meter analysis.');
      console.log('     Check if sasStartTime/sasEndTime are set on the ReportedMachine.');
      // Show machine's collection time for reference
      row('Machine.collectionTime:', localTs(machine?.collectionTime));
      row('Machine.previousCollectionTime:', localTs(machine?.previousCollectionTime));
      computedTotalVariation += machineGross - sasGross;
      continue;
    }

    row('SAS window start:', localTs(sasStart));
    row('SAS window end:', localTs(sasEnd));

    // ── Fetch ALL meters in a wide window (±2 hours around SAS window) ────
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

    const smibMetersInWindow = inWindow.filter(m =>
      m.meterSource !== 'COLLECTION_REPORT' ||
      (m.meterSource === 'COLLECTION_REPORT' && m.isSupplemental === true && m.readAt.getTime() === sasEnd.getTime())
    );
    const crMetersInWindow = inWindow.filter(m =>
      m.meterSource === 'COLLECTION_REPORT' && !(m.isSupplemental === true && m.readAt.getTime() === sasEnd.getTime())
    );

    // ── Print all meters in wide window ──────────────────────────────────
    console.log(`\n  ┌── ALL METERS in wide window (±2h around SAS): ${wideMeters.length} total`);
    for (const m of wideMeters) {
      const inW = m.readAt >= sasStart && m.readAt <= sasEnd;
      const isCR = m.meterSource === 'COLLECTION_REPORT';
      const isSupp = m.isSupplemental === true;
      const marker = inW ? (isCR ? (isSupp ? '<<< SUP' : '<<< CR ') : '<<< SAS') : '       ';
      const mvt = m.movement ?? {};
      const drop = mvt.drop ?? 0;
      const cancelled = mvt.totalCancelledCredits ?? 0;
      const src = (m.meterSource as string ?? '?').padEnd(20);
      const sign_ = (n: number) => n !== 0 ? fmt(n) : '0';
      console.log(
        `  │  ${marker}  ${localTs(m.readAt).padEnd(32)}  ` +
        `drop=${String(sign_(drop)).padStart(8)}  cancelled=${String(sign_(cancelled)).padStart(10)}  src=${src}` +
        (isCR && inW && !isSupp ? '  ⚠ SYNTHETIC' : '')
      );
    }
    console.log('  └──');

    // ── Current window sums ───────────────────────────────────────────────
    const currentWindowSum = sumMeters(inWindow);
    const smibOnlySum = sumMeters(smibMetersInWindow);

    sep('  ANALYSIS — Current Window', 78, '·');

    console.log(`\n  All meters in window (${inWindow.length}):`);
    row('    Σ drop:', fmt(currentWindowSum.drop));
    row('    Σ cancelled:', fmt(currentWindowSum.cancelled));
    row('    SAS Gross:', fmt(currentWindowSum.gross));
    const variation = machineGross - (includeJackpot ? currentWindowSum.gross - currentWindowSum.jackpot : currentWindowSum.gross);
    row('    Variation (machine − SAS):', sign(variation),
      4, Math.abs(variation) < 0.01 ? '✅ ZERO' : '❌ MISMATCH');

    // ── Detect COLLECTION_REPORT double-counting ──────────────────────────
    if (crMetersInWindow.length > 0) {
      const crSum = sumMeters(crMetersInWindow);
      console.log(`\n  ⚠  ISSUE DETECTED: ${crMetersInWindow.length} non-supplemental COLLECTION_REPORT meter(s) inside SAS window`);
      console.log(`     These are SYNTHETIC meters created FROM the collection data.`);
      console.log(`     Including them DOUBLE-COUNTS any SMIB readings they duplicate.`);
      console.log(`\n  SMIB-only meters in window (${smibMetersInWindow.length}):`);
      row('    Σ drop:', fmt(smibOnlySum.drop));
      row('    Σ cancelled:', fmt(smibOnlySum.cancelled));
      row('    SAS Gross (excluding CR meters):', fmt(smibOnlySum.gross));
      const varExclCR = machineGross - (includeJackpot ? smibOnlySum.gross - smibOnlySum.jackpot : smibOnlySum.gross);
      row('    Variation if CR meters excluded:', sign(varExclCR),
        4, Math.abs(varExclCR) < 0.01 ? '✅ ZERO — this fixes it' : `❌ Still ${fmt(varExclCR)}`);
    }

    // ── Check if before/after meters would fix variation ─────────────────
    const beforeSum = sumMeters(beforeWindow);
    const afterSum = sumMeters(afterWindow);

    const varWithBefore = machineGross - sumMeters([...beforeWindow, ...inWindow]).gross;
    const varWithAfter = machineGross - sumMeters([...inWindow, ...afterWindow]).gross;
    const varSmibWithBefore = machineGross - sumMeters([...beforeWindow, ...smibMetersInWindow]).gross;
    const varSmibWithAfter = machineGross - sumMeters([...smibMetersInWindow, ...afterWindow]).gross;

    if (beforeWindow.length > 0 || afterWindow.length > 0) {
      sep('  ANALYSIS — Window Boundary Adjustments', 78, '·');
      console.log('');

      if (beforeWindow.length > 0) {
        console.log(`  Meters BEFORE window (${beforeWindow.length}):`);
        for (const m of beforeWindow) {
          const mvt = m.movement ?? {};
          console.log(`     ${localTs(m.readAt)}  drop=${fmt(mvt.drop ?? 0)}  cancelled=${fmt(mvt.totalCancelledCredits ?? 0)}  src=${m.meterSource ?? '?'}`);
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
    }

    // ── Smart window search ────────────────────────────────────────────────
    sep('  ANALYSIS — Smart Window Search', 78, '·');

    const machineGrossDelta = manualIn - manualOut;
    console.log(`\n  Searching for a window of available meters that matches machine gross delta:`);
    console.log(`  Target delta: machineGross=${fmt(machineGross)}, manualIn=${fmt(manualIn)}, manualOut=${fmt(manualOut)}\n`);

    const smibMetersWide = wideMeters.filter(m =>
      m.meterSource !== 'COLLECTION_REPORT' ||
      (m.meterSource === 'COLLECTION_REPORT' && m.isSupplemental === true)
    );
    const matchSmib = findMatchingWindow(smibMetersWide, manualIn, manualOut);

    const matchWithCR = crMetersInWindow.length > 0
      ? findMatchingWindow(wideMeters, manualIn, manualOut, crMetersInWindow[0].readAt)
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
        console.log(`  → Recommended sasStartTime: ${localTs(matchSmib.start)}${startChanged ? ` (currently ${localTs(sasStart)}, shift ${matchSmib.start > sasStart ? 'LATER' : 'EARLIER'})` : ' ✓'}`);
        console.log(`  → Recommended sasEndTime:   ${localTs(matchSmib.end)}${endChanged ? ` (currently ${localTs(sasEnd)}, shift ${matchSmib.end > sasEnd ? 'LATER' : 'EARLIER'})` : ' ✓'}`);
      } else {
        console.log(`  → Window boundaries already correct — check meter source filtering`);
      }
    }

    if (matchWithCR?.exact) {
      const mSum = sumMeters(matchWithCR.meters);
      console.log(`\n  ✅ OPTION B — Include CR meter, adjust boundaries (${matchWithCR.meters.length} meters):`);
      for (const m of matchWithCR.meters) {
        const mvt = m.movement ?? {};
        const isCR = m.meterSource === 'COLLECTION_REPORT';
        console.log(`     ${localTs(m.readAt)}  drop=${fmt(mvt.drop ?? 0)}  cancelled=${fmt(mvt.totalCancelledCredits ?? 0)}  src=${m.meterSource ?? '?'}${isCR ? ' ← CR' : ''}`);
      }
      console.log(`  Σ drop=${fmt(mSum.drop)}  Σ cancelled=${fmt(mSum.cancelled)}  gross=${fmt(mSum.gross)}`);
      const startChanged = Math.abs(matchWithCR.start.getTime() - sasStart.getTime()) > 60_000;
      const endChanged = Math.abs(matchWithCR.end.getTime() - sasEnd.getTime()) > 60_000;
      if (startChanged || endChanged) {
        console.log(`  → Recommended sasStartTime: ${localTs(matchWithCR.start)}${startChanged ? ` (currently ${localTs(sasStart)})` : ' ✓'}`);
        console.log(`  → Recommended sasEndTime:   ${localTs(matchWithCR.end)}${endChanged ? ` (currently ${localTs(sasEnd)})` : ' ✓'}`);
      }
    }

    if (!matchSmib?.exact && !matchWithCR?.exact) {
      console.log(`  ℹ  No exact match found in ±2h window.`);
      console.log(`  Possible causes:`);
      console.log(`  • Meters outside the ±2h search window`);
      console.log(`  • prev meters baseline is wrong (check section below)`);
      console.log(`  • Machine sent an absolute meter value as a delta`);
    }

    // ── Rogue meter check ────────────────────────────────────────────────
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

    // ── Check prev meters against previous V2 + V1 collections ───────────
    sep('  ANALYSIS — Prev Meters Baseline Check', 78, '·');

    // Priority 1: Previous V2 submission
    const prevV2 = await db.collection('reportedmachines').findOne(
      {
        machineId: mid,
        sessionId: { $ne: resolvedSessionId },
        sessionStatus: 'submitted',
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
      },
      { sort: { sasEndTime: -1 } }
    ) as ReportedMachineDoc | null;

    if (prevV2) {
      console.log('\n  Previous V2 Submission:');
      row('    sessionId:', String(prevV2.sessionId));
      row('    sasEndTime:', localTs(prevV2.sasEndTime));
      row('    sasMetersIn:', fmt(prevV2.sasMetersIn));
      row('    sasMetersOut:', fmt(prevV2.sasMetersOut));
      row('    → Recommended sasStartTime:', localTs(prevV2.sasEndTime));
    }

    // Priority 2: Previous V1 collection
    const prevV1 = await db.collection('collections').findOne(
      {
        machineId: mid,
        isCompleted: true,
        locationReportId: { $exists: true, $ne: '' },
        'sasMeters.sasEndTime': { $exists: true },
      },
      { sort: { timestamp: -1 } }
    ) as Record<string, unknown> | null;

    if (prevV1) {
      const v1SasEnd = (prevV1.sasMeters as Record<string, unknown>)?.sasEndTime;
      console.log('\n  Previous V1 Collection:');
      row('    locationReportId:', String(prevV1.locationReportId));
      row('    timestamp:', localTs(prevV1.timestamp));
      row('    sasMeters.sasEndTime:', localTs(v1SasEnd));
      row('    metersIn:', fmt(prevV1.metersIn));
      row('    metersOut:', fmt(prevV1.metersOut));
      if (!prevV2) {
        row('    → Recommended sasStartTime (V1 fallback):', localTs(v1SasEnd));
      }
    } else if (!prevV2) {
      console.log('\n  No previous V2 submission or V1 collection found.');
    }

    // Priority 3: Machine fields
    row('\n  Machine.collectionMeters.metersIn:', fmt(machine?.collectionMeters?.metersIn));
    row('  Machine.collectionMeters.metersOut:', fmt(machine?.collectionMeters?.metersOut));
    row('  Machine.collectionTime:', localTs(machine?.collectionTime));
    row('  Machine.previousCollectionTime:', localTs(machine?.previousCollectionTime));
    row('  Machine.sasMeters.drop:', fmt((machine?.sasMeters as Record<string, unknown>)?.drop));
    row('  Machine.sasMeters.totalCancelledCredits:', fmt((machine?.sasMeters as Record<string, unknown>)?.totalCancelledCredits));

    if (!prevV2 && !prevV1) {
      const recStart = machine?.previousCollectionTime ?? machine?.collectionTime;
      if (recStart) {
        row('    → Recommended sasStartTime (Machine fallback):', localTs(recStart));
      }
    }

    // ── Final variation summary for this machine ──────────────────────────
    sep(`  FINAL SUMMARY — ${rm.machineCustomName || rm.machineName || rm.serialNumber || mid}`, 78, '═');

    const currentVariation = machineGross - (includeJackpot ? currentWindowSum.gross - currentWindowSum.jackpot : currentWindowSum.gross);
    const smibVariation = machineGross - (includeJackpot ? smibOnlySum.gross - smibOnlySum.jackpot : smibOnlySum.gross);

    row('Machine Gross:', fmt(machineGross));
    row('SAS Gross (current window, all meters):', fmt(currentWindowSum.gross));
    row('SAS Gross (SMIB-only, excl. CR meters):', fmt(smibOnlySum.gross));
    row('Variation (current):', sign(currentVariation), 2, Math.abs(currentVariation) < 0.01 ? '✅' : '❌');
    row('Variation (SMIB-only):', sign(smibVariation), 2, Math.abs(smibVariation) < 0.01 ? '✅' : '❌');

    computedTotalVariation += currentVariation;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // STEP 4: Session-level summary
  // ──────────────────────────────────────────────────────────────────────────
  sep('SESSION SUMMARY', 80, '═');
  row('Total Machine Gross:', fmt(totalMachineGross));
  row('Total SAS Gross:', fmt(totalSasGross));
  row('Computed Total Variation:', fmt(Math.round(computedTotalVariation * 100) / 100));

  await mongoose.disconnect();
  console.log('\nDone.\n');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
