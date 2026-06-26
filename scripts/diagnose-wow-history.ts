/**
 * Checks, for a report's machines, whether they had collection history / collectionTime —
 * which determines whether the WOW baseline used "previous collection" or the
 * "second-latest sync" fallback (tiny start==end window).
 *
 * Run: bun run scripts/diagnose-wow-history.ts [reportId]
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { Collections } from '../app/api/lib/models/collections';
import { Machine } from '../app/api/lib/models/machines';

const MONGODB_URI = process.env.MONGODB_URI as string;
const REPORT_ID = process.argv[2] || 'c746e506-4523-4d11-bb5d-736317995cfd';
const iso = (d?: Date | null) => (d ? new Date(d).toISOString() : 'null');

async function main() {
  await mongoose.connect(MONGODB_URI);
  const cols = await Collections.find({ locationReportId: REPORT_ID }, { machineId: 1 }).lean<any[]>();
  const ids = cols.map(c => c.machineId);
  const machines = await Machine.find({ _id: { $in: ids } }, { collectionMetersHistory: 1, collectionTime: 1, serialNumber: 1 }).lean<any[]>();

  let noHistory = 0, noCollectionTime = 0, withHistory = 0;
  const histCounts: number[] = [];
  for (const m of machines) {
    const hist = (m.collectionMetersHistory ?? []).filter((e: any) => e.timestamp);
    histCounts.push(hist.length);
    if (hist.length === 0) noHistory++; else withHistory++;
    if (!m.collectionTime) noCollectionTime++;
  }
  console.log(`Report ${REPORT_ID}: ${machines.length} machines`);
  console.log(`  with collection history (>0 entries): ${withHistory}`);
  console.log(`  NO collection history (0 entries):    ${noHistory}`);
  console.log(`  NO collectionTime:                    ${noCollectionTime}`);
  console.log(`  history-entry counts: min=${Math.min(...histCounts)} max=${Math.max(...histCounts)} avg=${(histCounts.reduce((a,b)=>a+b,0)/histCounts.length).toFixed(1)}`);

  console.log('\nSample (first 8):');
  for (const m of machines.slice(0, 8)) {
    const hist = (m.collectionMetersHistory ?? []).filter((e: any) => e.timestamp)
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    console.log(`  ${m.serialNumber}: histEntries=${hist.length} collectionTime=${iso(m.collectionTime)} latestHistTs=${iso(hist[0]?.timestamp)}`);
  }
  await mongoose.disconnect();
}
main().catch(e => { console.error(e); mongoose.disconnect(); process.exit(1); });
