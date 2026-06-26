/**
 * Simulates the NEXT Recent auto-report for machines that now have history from a
 * just-created report. Baseline = previous collection (history): prevIn = that report's
 * metersIn, sasStartTime = its collectionTime; end = each machine's latest WOW_SYNC now.
 * Shows the resulting window length, drop, and whether SAS gross reconciles.
 *
 * Run: bun run scripts/simulate-wow-nextreport.ts [priorReportId]
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { Collections } from '../app/api/lib/models/collections';
import { Machine } from '../app/api/lib/models/machines';
import { Meters } from '../app/api/lib/models/meters';

const MONGODB_URI = process.env.MONGODB_URI as string;
const PRIOR = process.argv[2] || 'c746e506-4523-4d11-bb5d-736317995cfd';
const iso = (d?: Date | null) => (d ? new Date(d).toISOString() : 'null');
const num = (v?: number | null) => (v == null ? 'null' : v.toLocaleString());

async function main() {
  await mongoose.connect(MONGODB_URI);
  const cols = await Collections.find({ locationReportId: PRIOR }, { machineId: 1, serialNumber: 1, metersIn: 1, metersOut: 1 }).lean<any[]>();
  const machines = await Machine.find({ _id: { $in: cols.map(c => c.machineId) } }, { collectionMetersHistory: 1, collectionTime: 1 }).lean<any[]>();
  const histMap = new Map(machines.map(m => [String(m._id), m]));

  let shown = 0, tiny = 0, real = 0, reconcileOk = 0, reconcileBad = 0;
  for (const c of cols) {
    const m = histMap.get(c.machineId);
    const hist = (m?.collectionMetersHistory ?? []).filter((e: any) => e.timestamp).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    if (hist.length === 0) continue;
    const prevIn = hist[0].metersIn ?? 0;
    const prevOut = hist[0].metersOut ?? 0;
    const start = new Date(hist[0].timestamp);

    const latest = await Meters.findOne({ machine: c.machineId, meterSource: 'WOW_SYNC' }).sort({ readAt: -1 }).select('readAt drop totalCancelledCredits').lean<any>();
    if (!latest) continue;
    const end = new Date(latest.readAt);
    const windowHrs = (end.getTime() - start.getTime()) / 3.6e6;
    if (Math.abs(end.getTime() - start.getTime()) < 60_000) tiny++; else real++;

    const drop = latest.drop - prevIn;
    const machineGross = (latest.drop - prevIn) - ((latest.totalCancelledCredits ?? 0) - prevOut);

    const docs = await Meters.find({ machine: c.machineId, readAt: { $gt: start, $lte: end } }).sort({ readAt: 1 }).select('movement meterSource isSupplemental readAt').lean<any[]>();
    let mvDrop = 0, mvCanc = 0;
    for (const d of docs) {
      const isCR = d.meterSource === 'COLLECTION_REPORT';
      if (isCR && !(d.isSupplemental === true && new Date(d.readAt).getTime() === end.getTime())) continue;
      mvDrop += d.movement?.drop ?? 0; mvCanc += d.movement?.totalCancelledCredits ?? 0;
    }
    const sasGross = mvDrop - mvCanc;
    if (Math.round((machineGross - sasGross) * 100) / 100 === 0) reconcileOk++; else reconcileBad++;

    if (shown < 6) {
      shown++;
      console.log('='.repeat(80));
      console.log(`${c.serialNumber}`);
      console.log(`  window: ${iso(start)} -> ${iso(end)}  (${windowHrs.toFixed(2)}h, ${docs.length} new syncs)`);
      console.log(`  prevIn=${num(prevIn)} metersIn=${num(latest.drop)}  drop=${num(drop)}`);
      console.log(`  Machine Gross=${num(machineGross)}  SAS Gross=${num(sasGross)}  reconciles=${machineGross===sasGross?'YES':'NO ('+num(machineGross-sasGross)+')'}`);
    }
  }
  console.log('\n' + '#'.repeat(80));
  console.log(`Tiny windows (<1min, just collected): ${tiny}  |  real windows: ${real}`);
  console.log(`Reconciled: ${reconcileOk}  |  mismatched: ${reconcileBad}`);
  await mongoose.disconnect();
}
main().catch(e => { console.error(e); mongoose.disconnect(); process.exit(1); });
