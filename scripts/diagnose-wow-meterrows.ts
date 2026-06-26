/**
 * For one machine + SAS window, walks every consecutive WOW_SYNC reading and flags
 * where the stored movement.drop / movement.totalCancelledCredits does NOT equal the
 * actual jump in the absolute drop / totalCancelledCredits between the two readings.
 * Those mismatches are exactly what makes summed-movement SAS gross drift from the
 * clean (last - first) meter delta, i.e. the variation.
 *
 * Run: bun run scripts/diagnose-wow-meterrows.ts <machineId> <startISO> <endISO>
 *   or with a serialNumber: bun run scripts/diagnose-wow-meterrows.ts serial WOW-260424-53 <startISO> <endISO>
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { Machine } from '../app/api/lib/models/machines';
import { Meters } from '../app/api/lib/models/meters';

const MONGODB_URI = process.env.MONGODB_URI as string;
const iso = (d?: Date | null) => (d ? new Date(d).toISOString() : 'null');
const num = (v?: number | null) => (v == null ? 'null' : v.toLocaleString());

async function resolveMachineId(arg0: string, arg1: string): Promise<{ id: string; rest: string[] }> {
  if (arg0 === 'serial') {
    const m = await Machine.findOne({ serialNumber: arg1 }).select('_id').lean<any>();
    if (!m) throw new Error('machine not found: ' + arg1);
    return { id: String(m._id), rest: process.argv.slice(4) };
  }
  return { id: arg0, rest: process.argv.slice(3) };
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  const { id, rest } = await resolveMachineId(process.argv[2], process.argv[3]);
  const start = new Date(rest[0]);
  const end = new Date(rest[1]);

  // Pull one reading before the window (the baseline) through the end, inclusive.
  const baseline = await Meters.findOne({ machine: id, meterSource: 'WOW_SYNC', readAt: { $lte: start } }).sort({ readAt: -1 }).lean<any>();
  const inWindow = await Meters.find({ machine: id, meterSource: 'WOW_SYNC', readAt: { $gt: start, $lte: end } }).sort({ readAt: 1 }).lean<any[]>();

  const rows = baseline ? [baseline, ...inWindow] : inWindow;
  console.log(`machine ${id}  window ${iso(start)} -> ${iso(end)}`);
  console.log(`baseline @ ${iso(baseline?.readAt)} abs.drop=${num(baseline?.drop)} abs.canc=${num(baseline?.totalCancelledCredits)}`);
  console.log(`in-window readings: ${inWindow.length}\n`);

  let sumMvDrop = 0, sumMvCanc = 0, badDrop = 0, badCanc = 0, dupes = 0, drops = 0;
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1], cur = rows[i];
    const jumpDrop = (cur.drop ?? 0) - (prev.drop ?? 0);
    const jumpCanc = (cur.totalCancelledCredits ?? 0) - (prev.totalCancelledCredits ?? 0);
    const mvDrop = cur.movement?.drop ?? 0;
    const mvCanc = cur.movement?.totalCancelledCredits ?? 0;
    sumMvDrop += mvDrop; sumMvCanc += mvCanc;
    const dDrop = mvDrop - jumpDrop;
    const dCanc = mvCanc - jumpCanc;
    if (dDrop !== 0) badDrop += dDrop;
    if (dCanc !== 0) badCanc += dCanc;
    if (jumpDrop < 0 || jumpCanc < 0) drops++;
    if ((cur.readAt && prev.readAt) && new Date(cur.readAt).getTime() === new Date(prev.readAt).getTime()) dupes++;
    if (dDrop !== 0 || dCanc !== 0 || jumpDrop < 0) {
      console.log(`MISMATCH @ ${iso(cur.readAt)}  abs.drop=${num(cur.drop)} (jump ${num(jumpDrop)}) mv.drop=${num(mvDrop)} [Δ ${num(dDrop)}]  | abs.canc jump ${num(jumpCanc)} mv.canc=${num(mvCanc)} [Δ ${num(dCanc)}]  src=${cur.meterSource} ramClear=${cur.isRamClear ?? false}`);
    }
  }

  const absDrop = (rows[rows.length-1].drop ?? 0) - (rows[0].drop ?? 0);
  const absCanc = (rows[rows.length-1].totalCancelledCredits ?? 0) - (rows[0].totalCancelledCredits ?? 0);
  console.log(`\nSUM movement.drop = ${num(sumMvDrop)}   vs   abs delta drop = ${num(absDrop)}   (movement excess: ${num(sumMvDrop - absDrop)})`);
  console.log(`SUM movement.canc = ${num(sumMvCanc)}   vs   abs delta canc = ${num(absCanc)}   (movement excess: ${num(sumMvCanc - absCanc)})`);
  console.log(`SAS gross (sum mv) = ${num(sumMvDrop - sumMvCanc)}   |   clean gross (abs) = ${num(absDrop - absCanc)}   |   variation = ${num((absDrop-absCanc)-(sumMvDrop-sumMvCanc))}`);
  console.log(`negative jumps (meter went down / RAM clear): ${drops}, duplicate-timestamp rows: ${dupes}`);
  await mongoose.disconnect();
}
main().catch(e => { console.error(e); mongoose.disconnect(); process.exit(1); });
