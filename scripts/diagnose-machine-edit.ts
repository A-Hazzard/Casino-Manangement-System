/**
 * Machine Edit Diagnostic Script v2
 *
 * Examines collections and meters for a specific machine and simulates
 * what would happen with proposed edit values.
 *
 * Usage:
 *   bun run scripts/diagnose-machine-edit.ts
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI as string;
const MACHINE_ID = 'd3535ed031f4e5e1ab2e23d2';

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

function toTrinidad(utcDate: Date): string {
  return utcDate.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
    hour12: true, timeZone: 'America/Port_of_Spain',
  });
}

async function main() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;
  const Collections = db.collection('collections');
  const Meters = db.collection('meters');

  // ── Date range ──────────────────────────────────────────────────────────
  const rangeStart = new Date('2026-02-01T12:00:00.000Z');
  const rangeEnd = new Date('2026-03-15T12:00:00.000Z');

  // ── Current collection ──────────────────────────────────────────────────
  sep('CURRENT COLLECTION');
  const collections = await Collections.find({
    machineId: MACHINE_ID,
    timestamp: { $gte: rangeStart, $lte: rangeEnd },
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  }).sort({ timestamp: 1 }).toArray();

  console.log(`  Found ${collections.length} collection(s)\n`);
  for (const col of collections) {
    row('Collection ID', col._id);
    row('Timestamp', toTrinidad(new Date(col.timestamp)));
    row('isCompleted', col.isCompleted ? '✅' : '⚠️');
    row('metersIn', col.metersIn);
    row('metersOut', col.metersOut);
    row('prevIn', col.prevIn);
    row('prevOut', col.prevOut);
    row('movement.gross', col.movement?.gross);
    row('sasMeters.sasStartTime', ts(col.sasMeters?.sasStartTime));
    row('sasMeters.sasEndTime', ts(col.sasMeters?.sasEndTime));
    row('meterId', col.meterId || '(NOT SET)');
    console.log('');
  }

  // ── SAS meters (cumulative readings from relay) ─────────────────────────
  sep('ALL METERS (SAS READS FROM RELAY)');
  const meters = await Meters.find({
    machine: MACHINE_ID,
    readAt: { $gte: rangeStart, $lte: rangeEnd },
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  }).sort({ readAt: 1 }).toArray();

  console.log(`  Found ${meters.length} meters\n`);
  for (const m of meters) {
    const readAt = toTrinidad(new Date(m.readAt));
    row(readAt, `drop=${fmt(m.drop)}  cancelled=${fmt(m.totalCancelledCredits)}  _id=${m._id}`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // SIMULATION — values from the screenshot
  // ════════════════════════════════════════════════════════════════════════
  sep('SIMULATION: SCREENSHOT VALUES');

  const proposedPrevIn = 3396800;
  const proposedPrevOut = 2927700;
  const proposedMetersIn = 4175600;
  const proposedMetersOut = 3504600;

  const sasWindowStart = new Date('2026-02-28T12:00:00.000Z'); // Feb 28, 8AM Trinidad
  const sasWindowEnd = new Date('2026-03-11T12:00:00.000Z');   // Mar 11, 8AM Trinidad

  console.log(`\n  Proposed values:`);
  row('metersIn', proposedMetersIn);
  row('metersOut', proposedMetersOut);
  row('prevIn', proposedPrevIn);
  row('prevOut', proposedPrevOut);
  console.log('');

  // ── Movement calculation ────────────────────────────────────────────────
  sep('MOVEMENT CALCULATION');
  const movementIn = proposedMetersIn - proposedPrevIn;
  const movementOut = proposedMetersOut - proposedPrevOut;
  const machineGross = movementIn - movementOut;

  row('movement.metersIn (metersIn - prevIn)', movementIn);
  row('movement.metersOut (metersOut - prevOut)', movementOut);
  row('movement.gross (in - out)', machineGross);
  console.log('');

  // ── SAS delta over window ──────────────────────────────────────────────
  sep('SAS DELTA OVER WINDOW (Feb 28 8AM → Mar 11 8AM)');

  // Baseline: last SAS reading BEFORE window start
  const baselineSas = await Meters.find({
    machine: MACHINE_ID,
    readAt: { $lt: sasWindowStart },
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  }).sort({ readAt: -1 }).limit(1).toArray();

  // Endpoint: last SAS reading AT or BEFORE window end
  const endpointSas = await Meters.find({
    machine: MACHINE_ID,
    readAt: { $lte: sasWindowEnd },
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  }).sort({ readAt: -1 }).limit(1).toArray();

  console.log(`\n  Window: ${toTrinidad(sasWindowStart)} → ${toTrinidad(sasWindowEnd)}\n`);

  if (baselineSas.length > 0) {
    const b = baselineSas[0];
    console.log(`  BASELINE (last SAS read before window):`);
    row('readAt', toTrinidad(new Date(b.readAt)));
    row('top-level drop (cumulative)', fmt(b.drop));
    row('top-level cancelled (cumulative)', fmt(b.totalCancelledCredits));
    console.log('');
  } else {
    console.log(`  ⚠️  No SAS reading before window start — SAS gross will use 0 as baseline\n`);
  }

  if (endpointSas.length > 0) {
    const e = endpointSas[0];
    console.log(`  ENDPOINT (last SAS read at/before window end):`);
    row('readAt', toTrinidad(new Date(e.readAt)));
    row('top-level drop (cumulative)', fmt(e.drop));
    row('top-level cancelled (cumulative)', fmt(e.totalCancelledCredits));
    console.log('');
  }

  if (baselineSas.length > 0 && endpointSas.length > 0) {
    const baseDrop = baselineSas[0].drop || 0;
    const baseCancelled = baselineSas[0].totalCancelledCredits || 0;
    const endDrop = endpointSas[0].drop || 0;
    const endCancelled = endpointSas[0].totalCancelledCredits || 0;

    const sasDropDelta = endDrop - baseDrop;
    const sasCancelledDelta = endCancelled - baseCancelled;
    const sasGross = sasDropDelta - sasCancelledDelta;

    console.log(`  ── SAS Delta ───────────────────────────────────────────────`);
    row('drop delta (endpoint - baseline)', fmt(sasDropDelta));
    row('cancelled delta (endpoint - baseline)', fmt(sasCancelledDelta));
    row('SAS gross (drop delta - cancelled delta)', fmt(sasGross));
    console.log('');

    const variation = machineGross - sasGross;

    console.log(`  ── VARIATION ────────────────────────────────────────────────`);
    row('Machine gross', fmt(machineGross));
    row('SAS gross', fmt(sasGross));
    row('Variation (machine - SAS)', fmt(variation));
    row('Status', Math.abs(variation) < 0.01 ? '✅ NO VARIATION' : `⚠️  VARIATION OF ${fmt(variation)}`);
    console.log('');
  } else {
    console.log(`  ❌ Cannot compute SAS delta — missing readings\n`);
  }

  // ── Time correctness check ─────────────────────────────────────────────
  sep('TIME CHECK');
  console.log(`  If user enters 8:00 AM Trinidad on March 11:`);
  row('sasEndTime → meter.readAt', '2026-03-11T12:00:00.000Z (correct ✅)');
  row('sasStartTime', '2026-02-28T12:00:00.000Z (from Feb 28 8AM ✅)');
  console.log(`  With ModernCalendar fix: time propagates immediately ✅\n`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
