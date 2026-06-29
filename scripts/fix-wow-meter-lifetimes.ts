/**
 * Fix Script: Recalculate WOW_SYNC Meter Lifetime Values
 *
 * WOW_SYNC meters store cumulative absolute lifetime values (drop, totalCancelledCredits, etc.)
 * that must be monotonically non-decreasing. The movement.* fields store the per-reading delta:
 *   movement.field = current.field - previous.field
 *
 * When a lifetime value is wrong (e.g. drop went 200 → 100 instead of 200 → 500), the
 * movement value is trusted as ground truth and the lifetime is corrected:
 *   corrected.field = previous_corrected.field + movement.field
 *
 * Corrections cascade: once a meter is fixed, subsequent meters use the corrected value
 * as their base, so all downstream meters are also kept consistent.
 *
 * Movement values are NOT modified — only the top-level lifetime fields.
 *
 * Meters with negative movement on any field are skipped (logged as anomalies).
 *
 * Usage:
 *   bun run scripts/fix-wow-meter-lifetimes.ts              # dry-run (no writes)
 *   bun run scripts/fix-wow-meter-lifetimes.ts --write      # apply fixes
 *   MONGODB_URI="mongodb://..." bun run scripts/fix-wow-meter-lifetimes.ts --write
 */

import mongoose from 'mongoose';

const MONGODB_URI = 
  'mongodb://sunny1:87ydaiuhdsia2e@147.182.133.136:27017/sas-tunapuna?authSource=admin';

// ============================================================================
// Types
// ============================================================================

type WowMeter = {
  _id: string;
  readAt: Date;
  machine: string;
  drop: number;
  totalCancelledCredits: number;
  jackpot: number;
  coinIn: number;
  coinOut: number;
  gamesPlayed: number;
  gamesWon: number;
  totalWonCredits: number;
  totalHandPaidCancelledCredits: number;
  movement: {
    drop: number;
    totalCancelledCredits: number;
    jackpot: number;
    coinIn: number;
    coinOut: number;
    gamesPlayed: number;
    gamesWon: number;
    totalWonCredits: number;
    totalHandPaidCancelledCredits: number;
  };
};

type LifetimeField = keyof Omit<WowMeter, '_id' | 'readAt' | 'machine' | 'movement'>;

const FIELDS: LifetimeField[] = [
  'drop',
  'totalCancelledCredits',
  'jackpot',
  'coinIn',
  'coinOut',
  'gamesPlayed',
  'gamesWon',
  'totalWonCredits',
  'totalHandPaidCancelledCredits',
];

type FixEntry = {
  meterId: string;
  machineId: string;
  readAt: Date;
  prevMeterId: string;
  prevReadAt: Date;
  prevLifetime: Record<string, number>;
  before: Record<string, number>;
  movement: Record<string, number>;
  after: Record<string, number>;
  skippedFields: string[];
};

// ============================================================================
// Helpers
// ============================================================================

function n(val: unknown): number {
  if (val === null || val === undefined) return 0;
  const num = Number(val);
  return isNaN(num) ? 0 : num;
}

function fmt(val: unknown): string {
  const num = n(val);
  return num.toLocaleString();
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : str + ' '.repeat(len - str.length);
}

function fmtDate(d: Date): string {
  return new Date(d).toISOString().replace('T', ' ').slice(0, 19);
}

// ============================================================================
// Core: scan one machine and compute all needed fixes
// ============================================================================

function computeFixes(meters: WowMeter[]): {
  fixes: FixEntry[];
  anomalies: { meterId: string; field: string; movDelta: number }[];
} {
  const fixes: FixEntry[] = [];
  const anomalies: { meterId: string; field: string; movDelta: number }[] = [];

  if (meters.length < 2) return { fixes, anomalies };

  // Running corrected lifetime — start from first meter (baseline assumed correct)
  const running: Record<string, number> = {};
  for (const field of FIELDS) running[field] = n(meters[0][field]);

  for (let idx = 1; idx < meters.length; idx++) {
    const meter = meters[idx];
    const prevMeter = meters[idx - 1];
    const mov = meter.movement ?? ({} as WowMeter['movement']);

    const beforeValues: Record<string, number> = {};
    const afterValues: Record<string, number> = {};
    const movValues: Record<string, number> = {};
    const prevLifetime: Record<string, number> = {};
    const skippedFields: string[] = [];
    let needsFix = false;

    for (const field of FIELDS) {
      const movDelta = n(mov[field as keyof typeof mov]);
      const actual = n(meter[field]);

      beforeValues[field] = actual;
      movValues[field] = movDelta;
      prevLifetime[field] = running[field];

      if (movDelta < 0) {
        // Anomaly — cannot determine correct lifetime; leave running unchanged
        anomalies.push({ meterId: String(meter._id), field, movDelta });
        skippedFields.push(field);
        afterValues[field] = actual; // unchanged
        continue;
      }

      const expected = running[field] + movDelta;
      afterValues[field] = expected;

      if (Math.abs(actual - expected) > 0.001) {
        needsFix = true;
      }

      // Advance running with corrected value regardless of whether actual was wrong
      running[field] = expected;
    }

    if (needsFix) {
      fixes.push({
        meterId: String(meter._id),
        machineId: String(meter.machine),
        readAt: meter.readAt,
        prevMeterId: String(prevMeter._id),
        prevReadAt: prevMeter.readAt,
        prevLifetime,
        before: beforeValues,
        movement: movValues,
        after: afterValues,
        skippedFields,
      });
    }
  }

  return { fixes, anomalies };
}

// ============================================================================
// Apply fixes to DB
// ============================================================================

async function applyFix(
  metersCol: mongoose.mongo.Collection,
  entry: FixEntry
): Promise<void> {
  const setDoc: Record<string, number> = {};
  for (const field of FIELDS) {
    if (!entry.skippedFields.includes(field)) {
      setDoc[field] = entry.after[field];
    }
  }
  // Ensure the _id is an ObjectId when querying the Mongo collection
  const id = typeof entry.meterId === 'string' ? new mongoose.Types.ObjectId(entry.meterId) : entry.meterId;
  await metersCol.updateOne({ _id: id }, { $set: setDoc });
}

// ============================================================================
// Print helpers
// ============================================================================

function printFixEntry(entry: FixEntry, action: string, machineLabel: string): void {
  console.log(`\n${action}  ${entry.meterId}`);
  console.log(`  Machine:       ${machineLabel}: ${entry.machineId}`);
  console.log(`  readAt:        ${fmtDate(entry.readAt)}`);
  console.log(`  Prev meter:    ${entry.prevMeterId}  (${fmtDate(entry.prevReadAt)})`);

  // Print a compact before/after table only for changed fields
  const changedFields = FIELDS.filter(
    field =>
      !entry.skippedFields.includes(field) &&
      Math.abs(entry.before[field] - entry.after[field]) > 0.001
  );

  if (changedFields.length > 0) {
    console.log(
      `\n  ${'Field'.padEnd(32)}  ${'Prev lifetime'.padStart(14)}  ${'movement'.padStart(10)}  ${'Before'.padStart(14)}  →  ${'After'.padStart(14)}`
    );
    console.log('  ' + '-'.repeat(96));
    for (const field of changedFields) {
      console.log(
        `  ${padRight(field, 32)}  ${fmt(entry.prevLifetime[field]).padStart(14)}  ${fmt(entry.movement[field]).padStart(10)}  ${fmt(entry.before[field]).padStart(14)}  →  ${fmt(entry.after[field]).padStart(14)}`
      );
    }
  }

  if (entry.skippedFields.length > 0) {
    console.log(`\n  ⚠️  Skipped (negative movement): ${entry.skippedFields.join(', ')}`);
  }
}

// ============================================================================
// Main
// ============================================================================

// ============================================================================
// Concurrency pool — run up to `limit` promises at once
// ============================================================================

async function pMap<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  limit: number
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await fn(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}

// ============================================================================
// Per-machine scan + optional write
// ============================================================================

type MachineResult = {
  machineId: string;
  machineIndex: number;
  total: number;
  fixes: FixEntry[];
  anomalies: { meterId: string; field: string; movDelta: number }[];
};

async function processMachine(
  metersCol: mongoose.mongo.Collection,
  machineId: string,
  machineIndex: number,
  total: number,
  write: boolean
): Promise<MachineResult> {
  const raw = await metersCol
    .find({ machine: machineId, meterSource: 'WOW_SYNC' })
    .sort({ readAt: 1, _id: 1 })
    .toArray();

  if (raw.length < 2) return { machineId, machineIndex, total, fixes: [], anomalies: [] };

  const meters = raw as unknown as WowMeter[];
  const { fixes, anomalies } = computeFixes(meters);

  if (write) {
    await Promise.all(fixes.map(entry => applyFix(metersCol, entry)));
  }

  return { machineId, machineIndex, total, fixes, anomalies };
}

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const concurrency = 32;

  console.log('\n🔧 fix-wow-meter-lifetimes');
  console.log(`   mode:        ${write ? 'WRITE' : 'dry-run (add --write to apply)'}`);
  console.log(`   concurrency: ${concurrency} machines in parallel\n`);

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  try {
    const db = mongoose.connection.db!;
    const metersCol = db.collection('meters');

    const machineIds: string[] = await metersCol.distinct('machine', {
      meterSource: 'WOW_SYNC',
    });

    const total = machineIds.length;
    console.log(`📊 ${total} WOW machines to process (concurrency=${concurrency})\n`);

    let completed = 0;

    const allResults = await pMap(
      machineIds,
      async (machineId, idx) => {
        const result = await processMachine(metersCol, machineId, idx + 1, total, write);
        completed++;
        if (completed % 10 === 0 || completed === total) {
          process.stdout.write(`\r   scanning... ${completed}/${total}`);
        }
        return result;
      },
      concurrency
    );

    console.log('\n');

    // ============================================================================
    // Print results in original order
    // ============================================================================

    let globalMeterCount = 0;
    let totalFixed = 0;
    let totalMachinesWithFixes = 0;
    const skippedAnomalies: { machineId: string; meterId: string; field: string; movDelta: number }[] = [];

    for (const result of allResults) {
      for (const anomaly of result.anomalies) {
        skippedAnomalies.push({ machineId: result.machineId, ...anomaly });
      }

      if (result.fixes.length === 0) continue;

      totalMachinesWithFixes++;
      totalFixed += result.fixes.length;
      globalMeterCount += result.fixes.length;

      const machineLabel = `[${result.machineIndex}/${total}]`;
      const verb = write ? 'updated' : 'would update';
      console.log(`${machineLabel} ${result.machineId}  →  ${result.fixes.length} meter${result.fixes.length > 1 ? 's' : ''} ${verb}`);
    }

    // ============================================================================
    // Summary
    // ============================================================================
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Machines processed:         ${total}`);
    console.log(`Machines with fixes:        ${totalMachinesWithFixes}`);
    console.log(`Meters ${write ? 'updated' : 'that would be updated'}: ${totalFixed.toString().padStart(4)}`);
    console.log(`Anomalies skipped:          ${skippedAnomalies.length}`);

    if (skippedAnomalies.length > 0) {
      console.log('\n⚠️  Anomalies (negative movement — not fixed automatically):');
      for (const a of skippedAnomalies) {
        console.log(`   machine=${a.machineId}  meter=${a.meterId}  field=${a.field}  movement=${a.movDelta}`);
      }
    }

    if (!write && totalFixed > 0) {
      console.log('\n   Re-run with --write to apply all fixes.');
    } else if (write && totalFixed === 0) {
      console.log('\n✅ Nothing to fix.');
    } else if (write && totalFixed > 0) {
      console.log(`\n✅ ${totalFixed} meter${totalFixed > 1 ? 's' : ''} updated.`);
    }

    console.log();
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected\n');
  }
}

main().catch(err => {
  console.error('❌ Fatal:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
