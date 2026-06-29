/**
 * Report Script: WOW_SYNC Meter Lifetime Integrity Errors
 *
 * WOW_SYNC meters store cumulative absolute lifetime values (drop, totalCancelledCredits, etc.)
 * that must be monotonically non-decreasing. The movement.* fields store the per-reading delta:
 *   movement.field = current.field - previous.field
 *
 * This script walks every WOW machine's meters in chronological order and flags any meter
 * whose lifetime fields don't match (previous_corrected + movement). For each wrong meter it
 * prints a 21-row context table (10 before + the bad row + 10 after) and the full meter JSON.
 *
 * Read-only — no writes.
 *
 * Usage:
 *   bun run scripts/report-wow-meter-errors.ts
 *   MONGODB_URI="mongodb://..." bun run scripts/report-wow-meter-errors.ts
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

type LifetimeFields = keyof Omit<WowMeter, '_id' | 'readAt' | 'machine' | 'movement'>;

const FIELDS: LifetimeFields[] = [
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

type WrongMeter = {
  meter: WowMeter;
  prevMeter: WowMeter;
  wrongFields: string[];
  expectedValues: Record<string, number>;
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
  if (num === 0) return '0';
  return num.toLocaleString();
}

function padLeft(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : ' '.repeat(len - str.length) + str;
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : str + ' '.repeat(len - str.length);
}

function shortId(id: string): string {
  return id.length > 12 ? id.slice(0, 12) + '…' : id;
}

function fmtDate(d: Date): string {
  return new Date(d).toISOString().replace('T', ' ').slice(0, 19);
}

function printContextTable(meters: WowMeter[], wrongIndex: number): void {
  const header = [
    padRight('#', 4),
    padRight('_id (short)', 14),
    padRight('readAt', 19),
    padLeft('drop', 12),
    padLeft('mov.drop', 10),
    padLeft('totalCC', 12),
    padLeft('mov.tcc', 10),
  ].join('  ');

  const sep = '-'.repeat(header.length);
  console.log('\n' + sep);
  console.log(header);
  console.log(sep);

  for (let idx = 0; idx < meters.length; idx++) {
    const meter = meters[idx];
    const isWrong = idx === wrongIndex;
    const prefix = isWrong ? '>>> ' : '    ';
    const row = [
      padRight(prefix + String(idx), 4 + 4),
      padRight(shortId(String(meter._id)), 14),
      padRight(fmtDate(meter.readAt), 19),
      padLeft(fmt(meter.drop), 12),
      padLeft(fmt(meter.movement?.drop), 10),
      padLeft(fmt(meter.totalCancelledCredits), 12),
      padLeft(fmt(meter.movement?.totalCancelledCredits), 10),
    ].join('  ');
    console.log(isWrong ? `\x1b[31m${row}\x1b[0m` : row);
  }
  console.log(sep + '\n');
}

// ============================================================================
// Core scan
// ============================================================================

async function scanMachine(
  metersCol: mongoose.mongo.Collection,
  machineId: string
): Promise<WrongMeter[]> {
  const raw = await metersCol
    .find({ machine: machineId, meterSource: 'WOW_SYNC' })
    .sort({ readAt: 1, _id: 1 })
    .toArray();

  if (raw.length < 2) return [];

  const meters = raw as unknown as WowMeter[];
  const wrongs: WrongMeter[] = [];

  // Running corrected lifetime values — initialised from first meter
  const running: Record<string, number> = {};
  for (const field of FIELDS) running[field] = n(meters[0][field]);

  for (let idx = 1; idx < meters.length; idx++) {
    const meter = meters[idx];
    const prevMeter = meters[idx - 1];
    const mov = meter.movement ?? ({} as WowMeter['movement']);

    const wrongFields: string[] = [];
    const expectedValues: Record<string, number> = {};

    for (const field of FIELDS) {
      const movDelta = n(mov[field as keyof typeof mov]);

      // Negative movement is an anomaly — flag but skip auto-fix in the fix script
      if (movDelta < 0) {
        wrongFields.push(`${field} (negative movement: ${movDelta})`);
        continue;
      }

      const expected = running[field] + movDelta;
      const actual = n(meter[field]);

      if (Math.abs(actual - expected) > 0.001) {
        wrongFields.push(field);
        expectedValues[field] = expected;
      }
    }

    if (wrongFields.length > 0) {
      wrongs.push({ meter, prevMeter, wrongFields, expectedValues });
    }

    // Advance running values — use expected (corrected) so cascade fixes propagate
    for (const field of FIELDS) {
      const movDelta = n(mov[field as keyof typeof mov]);
      if (movDelta >= 0) {
        running[field] = running[field] + movDelta;
      }
      // If movement is negative, keep the running value unchanged (conservative)
    }
  }

  return wrongs;
}

// ============================================================================
// Main
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

async function main() {
  const concurrency = 32;
  console.log('\n🔍 report-wow-meter-errors — read-only\n');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  try {
    const db = mongoose.connection.db!;
    const metersCol = db.collection('meters');

    const machineIds: string[] = await metersCol.distinct('machine', {
      meterSource: 'WOW_SYNC',
    });

    const total = machineIds.length;
    console.log(`📊 Found ${total} WOW machines to scan (concurrency=${concurrency})\n`);

    let completed = 0;

    const allResults = await pMap(
      machineIds,
      async (machineId, idx) => {
        const wrongs = await scanMachine(metersCol, machineId);
        completed++;
        if (completed % 10 === 0 || completed === total) {
          process.stdout.write(`\r   scanning... ${completed}/${total}`);
        }
        return { machineId, idx, wrongs };
      },
      concurrency
    );

    console.log('\n');

    let totalWrong = 0;
    const perMachine: { machineId: string; count: number }[] = [];

    for (const { machineId, idx, wrongs } of allResults) {
      if (wrongs.length === 0) continue;

      totalWrong += wrongs.length;
      perMachine.push({ machineId, count: wrongs.length });

      console.log(`[${idx + 1}/${total}] ${machineId}  →  ${wrongs.length} wrong meter${wrongs.length > 1 ? 's' : ''}`);
      for (const { meter, wrongFields, expectedValues } of wrongs) {
        console.log(`  ❌  ${meter._id}  readAt=${fmtDate(meter.readAt)}`);
        for (const field of wrongFields) {
          const actual = (meter as unknown as Record<string, unknown>)[field];
          const expected = expectedValues[field];
          if (expected !== undefined) {
            console.log(`       ${padRight(field, 30)}  actual=${fmt(actual)}  expected=${fmt(expected)}`);
          } else {
            console.log(`       ${field}`);
          }
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Machines scanned:   ${total}`);
    console.log(`Wrong meters found: ${totalWrong}`);
    if (perMachine.length > 0) {
      console.log('\nPer-machine breakdown:');
      for (const { machineId, count } of perMachine) {
        console.log(`  ${machineId}  →  ${count} wrong meter${count > 1 ? 's' : ''}`);
      }
    } else {
      console.log('\n✅ No wrong meters found!');
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
