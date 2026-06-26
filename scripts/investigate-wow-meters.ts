/**
 * Read-only diagnostic for WOW (Wheel of Wonders) collection meters.
 *
 * Dumps a machine's collection-history + its full WOW_SYNC meter timeline so we can see
 * how dense the synced data is and what `prevIn`/`metersIn` resolve to for any chosen
 * start/end window. Used to debug "meters never change when I pick a different date".
 *
 * Run: bun run scripts/investigate-wow-meters.ts [machineNameFragment]
 *   (defaults to WOW-250814-14)
 *
 * @module scripts/investigate-wow-meters
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { Machine } from '../app/api/lib/models/machines';
import { Meters } from '../app/api/lib/models/meters';

const MONGODB_URI = process.env.MONGODB_URI as string;
const NAME_FRAGMENT = process.argv[2] || 'WOW-250814-14';
const LOOKBACK_DAYS = 60;

type MachineDoc = {
  _id: string;
  machineName?: string;
  serialNumber?: string;
  meta?: { dataSync?: { source?: string } | null } | null;
  collectionTime?: Date;
  previousCollectionTime?: Date;
  collectionMeters?: { metersIn?: number; metersOut?: number };
  collectionMetersHistory?: Array<{
    metersIn?: number;
    metersOut?: number;
    prevMetersIn?: number;
    prevMetersOut?: number;
    timestamp?: Date;
    reportVersion?: number;
  }>;
};

type MeterRow = {
  readAt: Date;
  drop?: number;
  totalCancelledCredits?: number;
  meterSource?: string;
};

const fmt = (date?: Date | null): string =>
  date ? new Date(date).toISOString() : 'null';
const num = (value?: number | null): string =>
  value == null ? 'null' : value.toLocaleString();

/** Mirrors the FIXED endpoint logic: latest WOW_SYNC drop at or before `at`. */
function dropAt(rows: MeterRow[], at: Date): MeterRow | null {
  const eligible = rows.filter(row => new Date(row.readAt).getTime() <= at.getTime());
  if (eligible.length > 0) return eligible[eligible.length - 1];
  // nearest-after fallback
  const after = rows.filter(row => new Date(row.readAt).getTime() > at.getTime());
  return after.length > 0 ? after[0] : null;
}

async function main(): Promise<void> {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }
  await mongoose.connect(MONGODB_URI);
  const dbName = mongoose.connection.db?.databaseName;
  console.log(`Connected to ${dbName}\n`);

  // ── Find the machine ──────────────────────────────────────────────────────
  const machine = await Machine.findOne({
    $or: [
      { machineName: { $regex: NAME_FRAGMENT, $options: 'i' } },
      { serialNumber: { $regex: NAME_FRAGMENT, $options: 'i' } },
    ],
  }).lean<MachineDoc>();

  if (!machine) {
    console.error(`No machine matching "${NAME_FRAGMENT}"`);
    await mongoose.disconnect();
    return;
  }

  console.log('═══════════════════════ MACHINE ═══════════════════════');
  console.log('_id:                  ', machine._id);
  console.log('machineName:          ', machine.machineName);
  console.log('serialNumber:         ', machine.serialNumber);
  console.log('meta.dataSync.source: ', machine.meta?.dataSync?.source);
  console.log('collectionTime:       ', fmt(machine.collectionTime));
  console.log('previousCollectionTime:', fmt(machine.previousCollectionTime));
  console.log('collectionMeters:     ', JSON.stringify(machine.collectionMeters));

  const history = (machine.collectionMetersHistory ?? [])
    .filter(entry => entry.timestamp)
    .sort(
      (a, b) =>
        new Date(b.timestamp as Date).getTime() -
        new Date(a.timestamp as Date).getTime()
    );

  console.log(`\ncollectionMetersHistory (${history.length} entries, newest first):`);
  for (const entry of history) {
    console.log(
      `  ${fmt(entry.timestamp)}  in=${num(entry.metersIn)}  out=${num(entry.metersOut)}` +
        `  prevIn=${num(entry.prevMetersIn)}  v${entry.reportVersion ?? '?'}`
    );
  }

  // ── WOW_SYNC meter timeline ───────────────────────────────────────────────
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const rows = await Meters.find({
    machine: machine._id,
    meterSource: 'WOW_SYNC',
    readAt: { $gte: since },
  })
    .sort({ readAt: 1 })
    .select('readAt drop totalCancelledCredits meterSource')
    .lean<MeterRow[]>();

  console.log(
    `\n═══════════ WOW_SYNC METERS (last ${LOOKBACK_DAYS} days · ${rows.length} rows) ═══════════`
  );
  let prevDrop: number | undefined;
  for (const row of rows) {
    const delta =
      prevDrop != null && row.drop != null ? row.drop - prevDrop : undefined;
    console.log(
      `  ${fmt(row.readAt)}  drop=${num(row.drop)}  out=${num(row.totalCancelledCredits)}` +
        (delta != null ? `  (+${num(delta)})` : '')
    );
    prevDrop = row.drop;
  }

  if (rows.length === 0) {
    console.log('  (no WOW_SYNC rows in window — metersIn will be flat)');
  }

  // ── Simulate the FIXED endpoint for sample windows ────────────────────────
  console.log('\n═══════════ SIMULATED FIXED ENDPOINT (drop@start → drop@end) ═══════════');
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;
  const samples: Array<{ label: string; start: Date; end: Date }> = [
    { label: 'last 7 days', start: new Date(now.getTime() - 7 * day), end: now },
    { label: 'last 14 days', start: new Date(now.getTime() - 14 * day), end: now },
    { label: 'last 30 days', start: new Date(now.getTime() - 30 * day), end: now },
  ];
  for (const sample of samples) {
    const startRow = dropAt(rows, sample.start);
    const endRow = dropAt(rows, sample.end);
    const prevIn = startRow?.drop;
    const metersIn = endRow?.drop;
    const deltaIn =
      prevIn != null && metersIn != null ? metersIn - prevIn : undefined;
    console.log(
      `  ${sample.label.padEnd(14)} start=${fmt(sample.start)} end=${fmt(sample.end)}`
    );
    console.log(
      `      prevIn=${num(prevIn)} (@${fmt(startRow?.readAt)})  ` +
        `metersIn=${num(metersIn)} (@${fmt(endRow?.readAt)})  deltaIn=${num(deltaIn)}`
    );
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal:', err);
  mongoose.disconnect();
  process.exit(1);
});
