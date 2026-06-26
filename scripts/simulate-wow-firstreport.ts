/**
 * Simulates the NEW first-report WOW baseline (Recent mode, no picked start):
 * baselineDate = latestSync.readAt - N days, baseline reading = latest WOW_SYNC <= baselineDate.
 * Confirms (a) the window is now a real span (not seconds) and (b) Machine Gross
 * (metersIn-prevIn) reconciles to SAS Gross (telescoped sum of movement.drop with
 * exclusive lower bound at the baseline reading).
 *
 * Run: bun run scripts/simulate-wow-firstreport.ts [machineId-or-blank-for-report]
 *      bun run scripts/simulate-wow-firstreport.ts report <reportId>
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { Collections } from '../app/api/lib/models/collections';
import { Meters } from '../app/api/lib/models/meters';

const MONGODB_URI = process.env.MONGODB_URI as string;
const REPORT_ID = process.argv[2] === 'report' ? process.argv[3] : 'c746e506-4523-4d11-bb5d-736317995cfd';
const N_DAYS = 1;
const iso = (d?: Date | null) => (d ? new Date(d).toISOString() : 'null');
const num = (v?: number | null) => (v == null ? 'null' : v.toLocaleString());

async function main() {
  await mongoose.connect(MONGODB_URI);
  const cols = await Collections.find({ locationReportId: REPORT_ID }, { machineId: 1, serialNumber: 1 }).lean<any[]>();
  console.log(`Simulating NEW first-report baseline (N=${N_DAYS}d) for ${cols.length} machines\n`);

  let okWindows = 0, reconcileOk = 0, reconcileBad = 0;
  let sampleShown = 0;

  for (const c of cols) {
    const latest = await Meters.findOne({ machine: c.machineId, meterSource: 'WOW_SYNC' }).sort({ readAt: -1 }).select('readAt drop totalCancelledCredits').lean<any>();
    if (!latest) continue;
    const end = new Date(latest.readAt);
    const baselineDate = new Date(end.getTime() - N_DAYS * 24 * 60 * 60 * 1000);
    const baseline = await Meters.findOne({ machine: c.machineId, meterSource: 'WOW_SYNC', readAt: { $lte: baselineDate } }).sort({ readAt: -1 }).select('readAt drop totalCancelledCredits').lean<any>()
      ?? await Meters.findOne({ machine: c.machineId, meterSource: 'WOW_SYNC', readAt: { $gt: baselineDate } }).sort({ readAt: 1 }).select('readAt drop totalCancelledCredits').lean<any>();
    if (!baseline) continue;

    const start = new Date(baseline.readAt);
    const windowMs = end.getTime() - start.getTime();
    const windowHrs = windowMs / 3.6e6;
    if (windowMs > 60_000) okWindows++; // more than a minute

    const machineGross = (latest.drop - baseline.drop) - ((latest.totalCancelledCredits ?? 0) - (baseline.totalCancelledCredits ?? 0));

    // SAS gross: telescoped sum of movement.* for docs in (start, end], exclusive lower bound
    const docs = await Meters.find({ machine: c.machineId, readAt: { $gt: start, $lte: end } }).sort({ readAt: 1 }).select('movement meterSource isSupplemental readAt').lean<any[]>();
    let mvDrop = 0, mvCanc = 0;
    for (const d of docs) {
      const isCR = d.meterSource === 'COLLECTION_REPORT';
      if (isCR && !(d.isSupplemental === true && new Date(d.readAt).getTime() === end.getTime())) continue;
      mvDrop += d.movement?.drop ?? 0;
      mvCanc += d.movement?.totalCancelledCredits ?? 0;
    }
    const sasGross = mvDrop - mvCanc;
    const reconciles = Math.round((machineGross - sasGross) * 100) / 100 === 0;
    if (reconciles) reconcileOk++; else reconcileBad++;

    if (sampleShown < 6) {
      sampleShown++;
      console.log('='.repeat(80));
      console.log(`${c.serialNumber} (${c.machineId})`);
      console.log(`  NEW window: ${iso(start)} -> ${iso(end)}  (${windowHrs.toFixed(1)}h, ${docs.length} docs)`);
      console.log(`  prevIn=${num(baseline.drop)}  metersIn=${num(latest.drop)}`);
      console.log(`  Machine Gross=${num(machineGross)}  SAS Gross=${num(sasGross)}  reconciles=${reconciles ? 'YES' : 'NO ('+num(machineGross-sasGross)+')'}`);
    }
  }

  console.log('\n' + '#'.repeat(80));
  console.log(`Windows > 1 minute (real span): ${okWindows}/${cols.length}`);
  console.log(`Reconciled (Machine Gross == SAS Gross): ${reconcileOk}  |  mismatched: ${reconcileBad}`);
  await mongoose.disconnect();
}
main().catch(e => { console.error(e); mongoose.disconnect(); process.exit(1); });
