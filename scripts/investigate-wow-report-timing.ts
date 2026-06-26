import mongoose from 'mongoose';
import { Machine } from '../app/api/lib/models/machines';
import { Meters } from '../app/api/lib/models/meters';
import { GamingLocations } from '../app/api/lib/models/gamingLocations';

const MONGODB_URI =
  'mongodb://sunny1:87ydaiuhdsia2e@147.182.133.136:27017/sas-tunapuna?authSource=admin';

function formatUtc(d: Date): string {
  return d.toISOString();
}

function formatLocalTrinidad(d: Date): string {
  const trinidad = new Date(d.getTime() - 4 * 60 * 60 * 1000);
  return trinidad.toISOString().replace('Z', ' (TT)');
}

function getPreviousGamingDayStart(offset: number): Date {
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  const currentGamingDayStart =
    now.getUTCHours() < offset
      ? new Date(yesterday)
      : new Date(today);

  currentGamingDayStart.setUTCHours(offset, 0, 0, 0);

  const previousGamingDayStart = new Date(
    currentGamingDayStart.getTime() - 24 * 60 * 60 * 1000
  );

  return previousGamingDayStart;
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB.\n');

  const now = new Date();

  const wowMachines = await Machine.find({
    'meta.dataSync.source': 'wow',
    $or: [
      { deletedAt: null },
      { deletedAt: { $lt: new Date('2025-01-01') } },
    ],
  })
    .select(
      '_id serialNumber customName gamingLocation collectionMeters collectionMetersHistory'
    )
    .lean<any[]>();

  console.log(`Active WOW machines found: ${wowMachines.length}\n`);

  const locationIds = [
    ...new Set(wowMachines.map(m => String(m.gamingLocation))),
  ];
  const locations = await GamingLocations.find({ _id: { $in: locationIds } })
    .select('_id name gameDayOffset')
    .lean<any[]>();

  const locationMap = new Map(
    locations.map(l => [String(l._id), l])
  );

  let withHistory = 0;
  let withoutHistory = 0;
  const machinesByOffset: Record<number, number> = {};

  for (const machine of wowMachines) {
    const loc = locationMap.get(String(machine.gamingLocation));
    const offset = loc?.gameDayOffset ?? 8;
    const locName = loc?.name ?? 'Unknown';
    const machineId = String(machine._id);

    machinesByOffset[offset] = (machinesByOffset[offset] ?? 0) + 1;

    const history = (machine.collectionMetersHistory ?? [])
      .filter((entry: any) => entry.timestamp)
      .sort(
        (a: any, b: any) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

    const hasHistory = history.length > 0;
    if (hasHistory) withHistory++;
    else withoutHistory++;

    const mostRecent = history[0] ?? null;

    // Determine start time using the EXACT same logic as the modal
    let startTime: Date;
    if (hasHistory) {
      // lastTime branch — uses most recent collection history timestamp
      startTime = new Date(mostRecent.timestamp);
    } else {
      // No lastTime — uses previous gaming day boundary
      startTime = getPreviousGamingDayStart(offset);
    }

    // Fetch what the WOW meters API would return
    const latestMeter = await Meters.findOne({
      machine: machineId,
      meterSource: 'WOW_SYNC',
      readAt: { $lte: now },
    })
      .sort({ readAt: -1 })
      .lean<any>();

    const prevFromHistory = hasHistory
      ? {
          metersIn: mostRecent.metersIn,
          metersOut: mostRecent.metersOut,
        }
      : null;

    // Simulate what prevIn/prevOut would resolve to (no history fallback)
    let baselineMeter = null;
    if (!hasHistory) {
      const baselineDate = startTime;
      baselineMeter =
        (await Meters.findOne({
          machine: machineId,
          meterSource: 'WOW_SYNC',
          readAt: { $lte: baselineDate },
        })
          .sort({ readAt: -1 })
          .lean<any>()) ??
        (await Meters.findOne({
          machine: machineId,
          meterSource: 'WOW_SYNC',
          readAt: { $gt: baselineDate },
        })
          .sort({ readAt: 1 })
          .lean<any>());
    }

    // ---- PRINT ----
    console.log('='.repeat(90));
    console.log(
      `  ${machine.customName ?? 'N/A'} | Serial: ${machine.serialNumber}`
    );
    console.log(`  Location: ${locName} (gameDayOffset=${offset})`);
    console.log(`  Machine ID: ${machineId}`);

    if (latestMeter) {
      console.log(
        `  Latest WOW_SYNC meter: readAt=${formatUtc(latestMeter.readAt)} | drop=${latestMeter.drop} | totalCancelledCredits=${latestMeter.totalCancelledCredits}`
      );
    } else {
      console.log('  ⚠️  No WOW_SYNC meter readings exist for this machine');
    }

    console.log(`  History entries: ${history.length}`);

    if (hasHistory) {
      console.log(
        `  Most recent history: timestamp=${formatUtc(new Date(mostRecent.timestamp))} | metersIn=${mostRecent.metersIn} | metersOut=${mostRecent.metersOut}`
      );
      console.log(`    locationReportId: ${mostRecent.locationReportId ?? 'N/A'}`);
    } else {
      console.log('  First report — no collection history');
    }

    console.log('');
    console.log('  >>> IF YOU CREATE A REPORT NOW <<<');
    console.log(`  Start time:  ${formatUtc(startTime)}  (TT: ${formatLocalTrinidad(startTime)})`);
    console.log(`  End time:    ${formatUtc(now)}  (TT: ${formatLocalTrinidad(now)})`);

    const estimatedWindowMs = now.getTime() - startTime.getTime();
    const estimatedWindowHours = (estimatedWindowMs / (1000 * 60 * 60)).toFixed(1);
    console.log(`  Window:      ${estimatedWindowHours} hours`);

    if (latestMeter) {
      const dropDelta = latestMeter.drop - (prevFromHistory?.metersIn ?? baselineMeter?.drop ?? 0);
      const cancelledDelta =
        latestMeter.totalCancelledCredits -
        (prevFromHistory?.metersOut ?? baselineMeter?.totalCancelledCredits ?? 0);

      console.log('');
      console.log('  Predicted values (from WOW meters API logic):');
      console.log(`    metersIn (latest): ${latestMeter.drop}`);
      console.log(`    metersOut (latest): ${latestMeter.totalCancelledCredits}`);

      if (prevFromHistory) {
        console.log(`    prevIn (from history): ${prevFromHistory.metersIn}`);
        console.log(`    prevOut (from history): ${prevFromHistory.metersOut}`);
        console.log(`    movement.drop: ${dropDelta}`);
        console.log(`    movement.totalCancelledCredits: ${cancelledDelta}`);
        console.log(`    movement.gross: ${dropDelta - cancelledDelta}`);
      } else if (baselineMeter) {
        console.log(`    prevIn (first report, from baseline meter): ${baselineMeter.drop} (readAt: ${formatUtc(baselineMeter.readAt)})`);
        console.log(`    prevOut (first report, from baseline meter): ${baselineMeter.totalCancelledCredits}`);
        console.log(`    movement.drop: ~${dropDelta}`);
        console.log(`    movement.totalCancelledCredits: ~${cancelledDelta}`);
        console.log(`    movement.gross: ~${dropDelta - cancelledDelta}`);
      } else {
        console.log('    prevIn: fallback to metersIn (no baseline found)');
        console.log('    prevOut: fallback to metersOut (no baseline found)');
      }
    }

    console.log('');
  }

  // Summary
  console.log('='.repeat(90));
  console.log('SUMMARY');
  console.log('='.repeat(90));
  console.log(`Current time (UTC):  ${formatUtc(now)}`);
  console.log(`Current time (TT):   ${formatLocalTrinidad(now)}`);
  console.log('');
  console.log(`WOW machines with history:   ${withHistory}`);
  console.log(`WOW machines without history: ${withoutHistory}`);
  console.log(`Total:                       ${wowMachines.length}`);
  console.log('');
  console.log('Machines per gameDayOffset:');
  for (const [offsetStr, count] of Object.entries(
    machinesByOffset
  ).sort(([a], [b]) => Number(a) - Number(b))) {
    const offset = Number(offsetStr);
    const nowLoc = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    const currentHour = nowLoc.getUTCHours();
    const isBeforeOffset = currentHour < offset;

    console.log(
      `  offset ${offset}:00 — ${count} machines (current hour ${currentHour}:00 TT, ${isBeforeOffset ? 'BEFORE' : 'AFTER'} offset → ${isBeforeOffset ? 'still in previous' : 'in current'} gaming day)`
    );
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch((err: any) => {
  console.error('Error:', err);
  mongoose.disconnect();
});
