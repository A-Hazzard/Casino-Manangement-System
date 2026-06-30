/**
 * Investigate V2 session Meters — duplicate detection and prevIn math audit
 *
 * Answers:
 *   - Why are there 2 meter documents for one machine+session?
 *   - Was movement.drop calculated correctly (delta vs raw cumulative)?
 *   - What were the prev meters BEFORE this collection?
 *
 * Usage:
 *   bunx tsx scripts/investigate-v2-session-meters.ts [sessionId] [machineId]
 *
 * Examples:
 *   bunx tsx scripts/investigate-v2-session-meters.ts
 *   bunx tsx scripts/investigate-v2-session-meters.ts 6a403a6628cfb0761e35c77b
 *   bunx tsx scripts/investigate-v2-session-meters.ts 6a403a6628cfb0761e35c77b <machineId>
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI as string;

// ============================================================================
// Types
// ============================================================================

type HistoryEntry = {
  locationReportId?: string;
  metersIn?: number;
  metersOut?: number;
  prevMetersIn?: number;
  prevMetersOut?: number;
  timestamp?: Date;
  reportVersion?: number;
};

type ReportedMachineRow = {
  _id: string;
  machineId: string;
  sessionId: string;
  machineName?: string;
  machineCustomName?: string;
  serialNumber?: string;
  sessionStatus?: string;
  status?: string;
  hasRelay?: boolean;
  manualMetersIn?: number | null;
  manualMetersOut?: number | null;
  sasMetersIn?: number | null;
  sasMetersOut?: number | null;
  prevSasMetersIn?: number;
  prevSasMetersOut?: number;
  sasEndTime?: Date;
  ramClear?: boolean;
  ramClearMetersIn?: number | null;
  ramClearMetersOut?: number | null;
  movement?: {
    manualMetersIn?: number;
    manualMetersOut?: number;
    machineGross?: number;
  };
};

type MeterRow = {
  _id: string;
  machine: string;
  locationSession?: string;
  isRamClear?: boolean;
  drop?: number | null;
  totalCancelledCredits?: number | null;
  movement?: {
    drop?: number;
    totalCancelledCredits?: number;
  };
  meterSource?: string;
  readAt?: Date;
  createdAt?: Date;
};

type PrevResolution = {
  prevIn: number;
  prevOut: number;
  sourceIn: string;
  sourceOut: string;
};

// ============================================================================
// Helpers (mirrors app/api/lib/helpers/collectionReportV2/meterDocuments.ts)
// ============================================================================

function divider(title: string) {
  console.log(`\n${'='.repeat(72)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(72));
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString('en-US', {
    timeZone: 'America/Port_of_Spain',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatNumber(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function resolvePrevMeters(
  historyEntry: HistoryEntry | undefined,
  prevSasMetersIn?: number,
  prevSasMetersOut?: number
): PrevResolution {
  if (historyEntry?.prevMetersIn !== undefined) {
    return {
      prevIn: historyEntry.prevMetersIn,
      prevOut: historyEntry.prevMetersOut ?? 0,
      sourceIn: 'collectionMetersHistory.prevMetersIn (frozen at submit)',
      sourceOut: 'collectionMetersHistory.prevMetersOut (frozen at submit)',
    };
  }
  if (prevSasMetersIn !== undefined) {
    return {
      prevIn: prevSasMetersIn,
      prevOut: prevSasMetersOut ?? 0,
      sourceIn: 'ReportedMachine.prevSasMetersIn',
      sourceOut: 'ReportedMachine.prevSasMetersOut',
    };
  }
  return {
    prevIn: 0,
    prevOut: 0,
    sourceIn: 'fallback 0 (BUG TRIGGER — cascade used this when prev missing)',
    sourceOut: 'fallback 0 (BUG TRIGGER — cascade used this when prev missing)',
  };
}

function resolvePrevFromMachineHistory(
  history: HistoryEntry[],
  sessionId: string,
  referenceTime: Date
): { prevIn: number; prevOut: number; source: string } | null {
  const sessionEntry = history.find(
    entry => entry.locationReportId === sessionId
  );
  if (sessionEntry?.prevMetersIn !== undefined) {
    return {
      prevIn: sessionEntry.prevMetersIn,
      prevOut: sessionEntry.prevMetersOut ?? 0,
      source: 'history entry for THIS session',
    };
  }

  const priorEntries = [...history]
    .filter(entry => entry.timestamp && entry.timestamp < referenceTime)
    .sort(
      (left, right) =>
        (right.timestamp?.getTime() ?? 0) - (left.timestamp?.getTime() ?? 0)
    );

  const previousEntry = priorEntries[0];
  if (previousEntry) {
    return {
      prevIn: previousEntry.metersIn ?? 0,
      prevOut: previousEntry.metersOut ?? 0,
      source: `prior history entry (${formatDate(previousEntry.timestamp)})`,
    };
  }

  return null;
}

function classifyMeterDrop(
  movementDrop: number,
  expectedDelta: number,
  manualIn: number
): 'OK' | 'RAW_CUMULATIVE' | 'MISMATCH' {
  if (movementDrop === expectedDelta) return 'OK';
  if (movementDrop === manualIn) return 'RAW_CUMULATIVE';
  return 'MISMATCH';
}

// ============================================================================
// Investigation
// ============================================================================

async function findLatestSessionId(
  db: mongoose.mongo.Db
): Promise<string | null> {
  const latest = await db
    .collection('reportedmachines')
    .findOne(
      {},
      { sort: { createdAt: -1 }, projection: { sessionId: 1 } }
    );
  return latest?.sessionId ?? null;
}

async function investigateMachineMeters(
  db: mongoose.mongo.Db,
  reported: ReportedMachineRow,
  sessionId: string
): Promise<void> {
  const machineLabel =
    reported.machineCustomName ||
    reported.machineName ||
    reported.serialNumber ||
    reported.machineId;

  divider(`METER AUDIT: ${machineLabel}`);

  const machineDoc = await db.collection('machines').findOne({
    _id: reported.machineId,
  });

  const history = (machineDoc?.collectionMetersHistory ?? []) as HistoryEntry[];
  const sessionHistory = history.find(
    entry => entry.locationReportId === sessionId
  );
  const referenceTime = reported.sasEndTime
    ? new Date(reported.sasEndTime)
    : new Date();

  const manualIn = reported.manualMetersIn ?? reported.sasMetersIn ?? 0;
  const manualOut = reported.manualMetersOut ?? reported.sasMetersOut ?? 0;

  console.log('\n  ReportedMachine inputs:');
  console.log(`    manualMetersIn:     ${formatNumber(reported.manualMetersIn)}`);
  console.log(`    manualMetersOut:    ${formatNumber(reported.manualMetersOut)}`);
  console.log(`    prevSasMetersIn:    ${formatNumber(reported.prevSasMetersIn)}`);
  console.log(`    prevSasMetersOut:   ${formatNumber(reported.prevSasMetersOut)}`);
  console.log(`    sasEndTime:         ${formatDate(reported.sasEndTime)}`);
  console.log(`    sessionStatus:      ${reported.sessionStatus}`);
  console.log(`    hasRelay:           ${reported.hasRelay}`);

  if (reported.movement) {
    console.log('\n  ReportedMachine.movement (UI delta):');
    console.log(
      `    manualMetersIn:     ${formatNumber(reported.movement.manualMetersIn)}`
    );
    console.log(
      `    manualMetersOut:    ${formatNumber(reported.movement.manualMetersOut)}`
    );
    console.log(
      `    machineGross:       ${formatNumber(reported.movement.machineGross)}`
    );
  }

  divider('PREV METER RESOLUTION (what the code should use)');

  const resolved = resolvePrevMeters(
    sessionHistory,
    reported.prevSasMetersIn,
    reported.prevSasMetersOut
  );
  console.log(`    prevIn:  ${formatNumber(resolved.prevIn)}  ← ${resolved.sourceIn}`);
  console.log(`    prevOut: ${formatNumber(resolved.prevOut)}  ← ${resolved.sourceOut}`);

  const historyFallback = resolvePrevFromMachineHistory(
    history,
    sessionId,
    referenceTime
  );
  if (historyFallback) {
    console.log(
      `\n    computeMovement-style fallback would give prevIn=${formatNumber(historyFallback.prevIn)} (${historyFallback.source})`
    );
  }

  if (machineDoc?.collectionMeters) {
    console.log(
      `\n    Machine.collectionMeters: in=${formatNumber(machineDoc.collectionMeters.metersIn)} out=${formatNumber(machineDoc.collectionMeters.metersOut)}`
    );
  }

  if (sessionHistory) {
    console.log('\n  Frozen history entry for this session:');
    console.log(
      `    prevMetersIn/Out:   ${formatNumber(sessionHistory.prevMetersIn)} / ${formatNumber(sessionHistory.prevMetersOut)}`
    );
    console.log(
      `    metersIn/Out:       ${formatNumber(sessionHistory.metersIn)} / ${formatNumber(sessionHistory.metersOut)}`
    );
    console.log(`    reportVersion:      ${sessionHistory.reportVersion ?? 'missing'}`);
  } else {
    console.log('\n  ⚠ No collectionMetersHistory entry for this session yet');
  }

  const expectedDrop = Number(manualIn) - resolved.prevIn;
  const expectedCancelled = Number(manualOut) - resolved.prevOut;
  const wrongDropIfPrevZero = Number(manualIn);

  divider('EXPECTED METER MATH');
  console.log(`    Expected movement.drop:                  ${formatNumber(expectedDrop)}`);
  console.log(`      = manualMetersIn (${formatNumber(manualIn)}) - prevIn (${formatNumber(resolved.prevIn)})`);
  console.log(`    Expected movement.totalCancelledCredits: ${formatNumber(expectedCancelled)}`);
  console.log(
    `\n    If prevIn wrongly defaults to 0 (old cascade bug):`
  );
  console.log(
    `      movement.drop would be ${formatNumber(wrongDropIfPrevZero)} (= raw cumulative manualIn) ← WRONG`
  );

  divider('PRIOR METERS (before this collection readAt)');

  const priorMeters = await db
    .collection('meters')
    .find({
      machine: reported.machineId,
      readAt: { $lt: referenceTime },
      $or: [
        { deletedAt: null },
        { deletedAt: { $exists: false } },
        { deletedAt: { $lt: new Date('2025-01-01') } },
      ],
    })
    .sort({ readAt: -1 })
    .limit(5)
    .toArray();

  if (priorMeters.length === 0) {
    console.log('    (none — first collection for this machine)');
  } else {
    for (const prior of priorMeters as MeterRow[]) {
      console.log(
        `    ${formatDate(prior.readAt)} | drop=${formatNumber(prior.drop)} | mov.drop=${formatNumber(prior.movement?.drop)} | session=${prior.locationSession?.slice(0, 8) ?? 'none'}... | ramClear=${prior.isRamClear}`
      );
    }
    const latestPrior = priorMeters[0] as MeterRow;
    console.log(
      `\n    Latest prior absolute drop: ${formatNumber(latestPrior.drop)}`
    );
    console.log(
      `    If used as prevIn by mistake: delta would be ${formatNumber(Number(manualIn) - Number(latestPrior.drop ?? 0))}`
    );
  }

  divider('SESSION METERS (locationSession = this session)');

  const sessionMeters = await db
    .collection('meters')
    .find({
      machine: reported.machineId,
      locationSession: sessionId,
      $or: [
        { deletedAt: null },
        { deletedAt: { $exists: false } },
        { deletedAt: { $lt: new Date('2025-01-01') } },
      ],
    })
    .sort({ createdAt: 1 })
    .toArray();

  const nonRamClearMeters = (sessionMeters as MeterRow[]).filter(
    meter => meter.isRamClear !== true
  );
  const ramClearMeters = (sessionMeters as MeterRow[]).filter(
    meter => meter.isRamClear === true
  );

  console.log(`    Total meter docs:     ${sessionMeters.length}`);
  console.log(`    Non-RAM-clear:        ${nonRamClearMeters.length}`);
  console.log(`    RAM-clear:            ${ramClearMeters.length}`);

  if (nonRamClearMeters.length > 1) {
    console.log(
      '\n  *** DUPLICATE NON-RAM-CLEAR METERS DETECTED ***'
    );
    console.log(
      '  Root cause: submit + post-submit cascade both created meters (race / filter mismatch).'
    );
    console.log(
      '  Old cascade filter { isRamClear: false } did NOT match docs with isRamClear: undefined.'
    );
  }

  if (sessionMeters.length === 0) {
    console.log('\n    No meters found for this session.');
    if (!reported.hasRelay) {
      console.log(
        '    ⚠ No-SMIB machine should have a COLLECTION_REPORT meter after submit.'
      );
    }
    return;
  }

  for (const [index, meter] of (sessionMeters as MeterRow[]).entries()) {
    const movDrop = meter.movement?.drop ?? 0;
    const movCancelled = meter.movement?.totalCancelledCredits ?? 0;
    const isNonRamClear = meter.isRamClear !== true;
    const classification = isNonRamClear
      ? classifyMeterDrop(movDrop, expectedDrop, Number(manualIn))
      : 'OK';

    const flag =
      classification === 'OK'
        ? '✓'
        : classification === 'RAW_CUMULATIVE'
          ? '✗ RAW (prevIn was 0)'
          : '✗ MISMATCH';

    console.log(`\n  Meter ${index + 1} ${flag}`);
    console.log(`    _id:                ${meter._id}`);
    console.log(`    isRamClear:         ${meter.isRamClear ?? 'undefined'}`);
    console.log(`    createdAt:          ${formatDate(meter.createdAt)}`);
    console.log(`    readAt:             ${formatDate(meter.readAt)}`);
    console.log(`    meterSource:        ${meter.meterSource}`);
    console.log(`    drop (absolute):    ${formatNumber(meter.drop)}`);
    console.log(`    movement.drop:      ${formatNumber(movDrop)}`);
    console.log(
      `    movement.cancelled: ${formatNumber(movCancelled)}`
    );

    if (isNonRamClear) {
      console.log(`    Expected drop:      ${formatNumber(expectedDrop)}`);
      if (classification === 'RAW_CUMULATIVE') {
        console.log(
          '    Diagnosis: movement.drop equals raw manualIn — prevIn was treated as 0'
        );
      } else if (classification === 'OK') {
        console.log('    Diagnosis: delta math is correct');
      } else {
        console.log('    Diagnosis: unexpected value — investigate prev sources');
      }
    }
  }

  divider('CREATION TIMELINE (why 2 docs appear)');
  console.log(
    '  Path 1 — Submit: PATCH .../sessions/[id]/submit → persistMachineMetersOnSubmit'
  );
  console.log(
    '  Path 2 — Edit:   PATCH .../machines?id=... (sessionStatus=submitted) → cascadeMachineEdit'
  );
  console.log(
    '  Both fire for no-SMIB machines. If they race or filters disagree, you get 2 docs.'
  );
  if (nonRamClearMeters.length >= 2) {
    const first = nonRamClearMeters[0];
    const second = nonRamClearMeters[1];
    const gapMs =
      new Date(second.createdAt ?? 0).getTime() -
      new Date(first.createdAt ?? 0).getTime();
    console.log(
      `\n  Gap between 1st and 2nd non-RAM-clear meter: ${gapMs}ms`
    );
    if (gapMs > 0 && gapMs < 60000) {
      console.log(
        '  → Typical race: submit created first, cascade/edit created second shortly after.'
      );
    }
  }
}

async function investigateSession(
  db: mongoose.mongo.Db,
  sessionId: string,
  machineIdFilter?: string
): Promise<void> {
  divider(`SESSION ${sessionId}`);

  const query: Record<string, unknown> = { sessionId };
  if (machineIdFilter) {
    query.machineId = machineIdFilter;
  }

  const machines = await db
    .collection('reportedmachines')
    .find(query)
    .sort({ sequenceOrder: 1 })
    .toArray();

  if (machines.length === 0) {
    console.log('No reported machines found for this session/filter.');
    return;
  }

  console.log(`Location:  ${machines[0]?.locationName ?? 'Unknown'}`);
  console.log(`Machines:  ${machines.length}`);
  console.log(`Status:    ${machines[0]?.sessionStatus ?? 'Unknown'}`);

  for (const machine of machines as ReportedMachineRow[]) {
    await investigateMachineMeters(db, machine, sessionId);
  }
}

// ============================================================================
// Entry Point
// ============================================================================

async function main() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;

  let sessionId = process.argv[2];
  const machineIdFilter = process.argv[3];

  if (!sessionId) {
    sessionId = (await findLatestSessionId(db)) ?? undefined;
    if (sessionId) {
      divider('NO SESSION ID PROVIDED');
      console.log(`Auto-selecting latest session: ${sessionId}`);
    } else {
      console.log('No sessions found in reportedmachines.');
      await mongoose.disconnect();
      return;
    }
  }

  if (!sessionId) {
    console.log('Usage: bunx tsx scripts/investigate-v2-session-meters.ts [sessionId] [machineId]');
    await mongoose.disconnect();
    return;
  }

  await investigateSession(db, sessionId, machineIdFilter);

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
