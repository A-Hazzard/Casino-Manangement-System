/**
 * Diagnose the collection-report meters aggregation: why it's slow and whether an
 * index-friendly rewrite is semantically identical.
 *
 * Run: bunx tsx scripts/diagnose-meters-aggregation.ts <locationReportId>
 */
import { appendFileSync, writeFileSync } from 'fs';
import mongoose from 'mongoose';
import { Collections } from '../app/api/lib/models/collections';
import { Meters } from '../app/api/lib/models/meters';

const OUT = 'scripts/diag-output.txt';
const log = (msg: string) => {
  appendFileSync(OUT, msg + '\n');
};

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not set. Run with: bun scripts/diagnose-meters-aggregation.ts');
  process.exit(1);
}

const REPORT_ID =
  process.argv[2] || '6d8d3601-5163-4f09-897e-37afac2180b3';

type MeterWindow = { machineId: string; startTime: Date; endTime: Date };

function buildWindowMatch(windows: MeterWindow[]) {
  return {
    $or: windows.map(q => ({
      machine: q.machineId,
      readAt: { $gte: q.startTime, $lte: q.endTime },
      $or: [
        { meterSource: { $ne: 'COLLECTION_REPORT' } },
        {
          meterSource: 'COLLECTION_REPORT',
          isSupplemental: true,
          readAt: q.endTime,
        },
      ],
    })),
  };
}

const groupStage = {
  $group: {
    _id: '$machine',
    totalDrop: { $sum: { $ifNull: ['$movement.drop', 0] } },
    totalCancelled: { $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] } },
    totalJackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
    meterCount: { $sum: 1 },
  },
};

async function timeAggregate(label: string, pipeline: object[]) {
  const start = Date.now();
  const results = await Meters.aggregate(pipeline, { allowDiskUse: true });
  const ms = Date.now() - start;
  results.sort((a: { _id: string }, b: { _id: string }) =>
    String(a._id).localeCompare(String(b._id))
  );
  console.log(`\n${label}: ${ms}ms | ${results.length} machine groups`);
  return { ms, results };
}

async function explainAggregate(label: string, pipeline: object[]) {
  // queryPlanner mode does NOT execute the pipeline — fast, shows index usage.
  const explain = (await Meters.aggregate(pipeline, {
    allowDiskUse: true,
  }).explain('queryPlanner')) as Record<string, unknown>;
  const json = JSON.stringify(explain);
  const stageMatch = json.match(/"stage":"(COLLSCAN|IXSCAN|FETCH|OR)"/g);
  const indexMatch = json.match(/"indexName":"([^"]+)"/g);
  console.log(`\n[explain queryPlanner] ${label}`);
  console.log(
    `  stages:  ${stageMatch ? [...new Set(stageMatch)].join(', ') : 'n/a'}`
  );
  console.log(
    `  indexes: ${indexMatch ? [...new Set(indexMatch)].join(', ') : 'NONE (collection scan)'}`
  );
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected. Report:', REPORT_ID);

  const collections = await Collections.find({
    locationReportId: REPORT_ID,
  }).lean<
    Array<{
      machineId?: string;
      sasMeters?: { sasStartTime?: Date; sasEndTime?: Date };
    }>
  >();

  const windows: MeterWindow[] = collections
    .filter(c => c.machineId && c.sasMeters?.sasStartTime && c.sasMeters?.sasEndTime)
    .map(c => ({
      machineId: c.machineId as string,
      startTime: new Date(c.sasMeters!.sasStartTime as Date),
      endTime: new Date(c.sasMeters!.sasEndTime as Date),
    }));

  console.log(`Collections: ${collections.length} | meter windows: ${windows.length}`);
  if (windows.length === 0) {
    console.log('No windows to test.');
    await mongoose.disconnect();
    return;
  }

  const machineIds = [...new Set(windows.map(w => w.machineId))];
  const globalMin = new Date(Math.min(...windows.map(w => w.startTime.getTime())));
  const globalMax = new Date(Math.max(...windows.map(w => w.endTime.getTime())));
  console.log(
    `Machines: ${machineIds.length} | global readAt range: ${globalMin.toISOString()} → ${globalMax.toISOString()}`
  );

  // CURRENT pipeline (big $or of compound windows).
  const currentPipeline = [{ $match: buildWindowMatch(windows) }, groupStage];

  // OPTIMIZED pipeline: index-friendly machine $in + global range FIRST, then exact
  // per-window residual, then group.
  const optimizedPipeline = [
    {
      $match: {
        machine: { $in: machineIds },
        readAt: { $gte: globalMin, $lte: globalMax },
      },
    },
    { $match: buildWindowMatch(windows) },
    groupStage,
  ];

  await explainAggregate('CURRENT', currentPipeline);
  await explainAggregate('OPTIMIZED', optimizedPipeline);

  const current = await timeAggregate('CURRENT (timed)', currentPipeline);
  const optimized = await timeAggregate('OPTIMIZED (timed)', optimizedPipeline);

  // Equivalence check.
  const equal =
    current.results.length === optimized.results.length &&
    current.results.every((cur: Record<string, number | string>, i: number) => {
      const opt = optimized.results[i] as Record<string, number | string>;
      return (
        cur._id === opt._id &&
        cur.totalDrop === opt.totalDrop &&
        cur.totalCancelled === opt.totalCancelled &&
        cur.totalJackpot === opt.totalJackpot &&
        cur.meterCount === opt.meterCount
      );
    });

  console.log(`\n=== RESULTS IDENTICAL: ${equal ? 'YES ✅' : 'NO ❌'} ===`);
  if (!equal) {
    console.log('CURRENT:', JSON.stringify(current.results, null, 2));
    console.log('OPTIMIZED:', JSON.stringify(optimized.results, null, 2));
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch(err => {
  console.error('Error:', err);
  mongoose.disconnect();
});
