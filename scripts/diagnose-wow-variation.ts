/**
 * Diagnoses why WOW collection reports show machine-gross vs SAS-gross variations.
 * For each collection in a report, prints the collection's entered/selected meters
 * and the actual WOW_SYNC meter docs inside its [sasStartTime, sasEndTime] window,
 * comparing how Machine Gross (metersIn-prevIn) and SAS Gross (sum movement.*) are derived.
 *
 * Run: bun run scripts/diagnose-wow-variation.ts [reportId]
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { Collections } from '../app/api/lib/models/collections';
import { Meters } from '../app/api/lib/models/meters';

const MONGODB_URI = process.env.MONGODB_URI as string;
const REPORT_ID = process.argv[2] || '67f8a628-1de1-4ba6-b762-c2eced14ba66';
const iso = (d?: Date | null) => (d ? new Date(d).toISOString() : 'null');
const n = (v?: number | null) => (v == null ? 'null' : v.toLocaleString());

async function main() {
  await mongoose.connect(MONGODB_URI);
  const cols = await Collections.find({ locationReportId: REPORT_ID }).lean<any[]>();
  console.log(`Report ${REPORT_ID}: ${cols.length} collections\n`);

  // Limit detailed dump to first 6 machines for readability
  const detailed = cols.slice(0, 6);

  let sumMachineGross = 0;
  let sumSasMovement = 0;
  let sumSasAbsDelta = 0;

  for (const c of cols) {
    const start = c.sasMeters?.sasStartTime ? new Date(c.sasMeters.sasStartTime) : null;
    const end = c.sasMeters?.sasEndTime ? new Date(c.sasMeters.sasEndTime) : null;
    const machineGross = c.movement?.gross ?? ((c.metersIn ?? 0) - (c.prevIn ?? 0)) - ((c.metersOut ?? 0) - (c.prevOut ?? 0));
    sumMachineGross += machineGross;

    if (!start || !end) continue;

    // All meter docs in window (any source)
    const docs = await Meters.find({
      machine: c.machineId,
      readAt: { $gte: start, $lte: end },
    }).sort({ readAt: 1 }).select('readAt drop totalCancelledCredits meterSource isSupplemental movement').lean<any[]>();

    // Detail page sum (movement.*, excluding non-supplemental COLLECTION_REPORT)
    let mvDrop = 0, mvCanc = 0, mvJack = 0, included = 0;
    for (const d of docs) {
      const isCR = d.meterSource === 'COLLECTION_REPORT';
      const atEnd = new Date(d.readAt).getTime() === end.getTime();
      if (isCR && !(d.isSupplemental === true && atEnd)) continue;
      // FIX: exclude the baseline reading at exactly sasStartTime (exclusive lower bound)
      if (new Date(d.readAt).getTime() === start.getTime()) continue;
      mvDrop += d.movement?.drop ?? 0;
      mvCanc += d.movement?.totalCancelledCredits ?? 0;
      mvJack += d.movement?.jackpot ?? 0;
      included++;
    }
    const sasMovementGross = mvDrop - mvCanc;
    sumSasMovement += sasMovementGross;

    // Absolute delta within window (last - first) using WOW_SYNC absolute drop
    const wow = docs.filter(d => d.meterSource === 'WOW_SYNC');
    const absDelta = wow.length >= 1
      ? ((wow[wow.length - 1].drop ?? 0) - (wow[0].drop ?? 0)) - ((wow[wow.length - 1].totalCancelledCredits ?? 0) - (wow[0].totalCancelledCredits ?? 0))
      : 0;
    sumSasAbsDelta += absDelta;

    if (detailed.includes(c)) {
      console.log('='.repeat(80));
      console.log(`machine ${c.machineId}  (${c.serialNumber || c.machineName || ''})`);
      console.log(`  window: ${iso(start)} -> ${iso(end)}`);
      console.log(`  COLLECTION: metersIn=${n(c.metersIn)} prevIn=${n(c.prevIn)} | metersOut=${n(c.metersOut)} prevOut=${n(c.prevOut)}`);
      console.log(`  Machine Gross (metersIn-prevIn - metersOut-prevOut) = ${n(machineGross)}`);
      console.log(`  meter docs in window: ${docs.length} (WOW_SYNC=${wow.length}), sources=${[...new Set(docs.map(d => d.meterSource))].join(',')}`);
      const sample = wow.slice(0, 3).map(d => `${iso(d.readAt)}|abs.drop=${n(d.drop)}|mv.drop=${n(d.movement?.drop)}`).join('\n      ');
      if (sample) console.log(`      ${sample}`);
      if (wow.length > 3) console.log(`      ... last: ${iso(wow[wow.length-1].readAt)}|abs.drop=${n(wow[wow.length-1].drop)}`);
      console.log(`  SAS Gross (sum movement.*, ${included} docs) = ${n(sasMovementGross)}`);
      console.log(`  Abs delta in window (lastAbs-firstAbs) = ${n(absDelta)}`);
      console.log(`  VARIATION (machineGross - sasMovementGross) = ${n(machineGross - sasMovementGross)}`);
    }
  }

  console.log('\n' + '#'.repeat(80));
  console.log(`TOTAL Machine Gross   = ${n(sumMachineGross)}`);
  console.log(`TOTAL SAS Gross (mv)  = ${n(sumSasMovement)}`);
  console.log(`TOTAL SAS Abs delta   = ${n(sumSasAbsDelta)}`);
  console.log(`TOTAL VARIATION       = ${n(sumMachineGross - sumSasMovement)}`);
  await mongoose.disconnect();
}
main().catch(e => { console.error(e); mongoose.disconnect(); process.exit(1); });
