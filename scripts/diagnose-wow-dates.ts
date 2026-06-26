/**
 * Dumps the SAS window dates chosen per machine for a collection report, plus each
 * machine's surrounding WOW_SYNC sync timeline, to explain why windows look identical.
 *
 * Run: bun run scripts/diagnose-wow-dates.ts [reportId]
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { Collections } from '../app/api/lib/models/collections';
import { Meters } from '../app/api/lib/models/meters';

const MONGODB_URI = process.env.MONGODB_URI as string;
const REPORT_ID = process.argv[2] || 'c746e506-4523-4d11-bb5d-736317995cfd';
const iso = (d?: Date | null) => (d ? new Date(d).toISOString() : 'null');

async function main() {
  await mongoose.connect(MONGODB_URI);
  const cols = await Collections.find({ locationReportId: REPORT_ID }).lean<any[]>();
  console.log(`Report ${REPORT_ID}: ${cols.length} collections\n`);

  // Frequency of distinct start/end timestamps
  const startFreq = new Map<string, number>();
  const endFreq = new Map<string, number>();

  for (const c of cols) {
    const s = iso(c.sasMeters?.sasStartTime);
    const e = iso(c.sasMeters?.sasEndTime);
    startFreq.set(s, (startFreq.get(s) ?? 0) + 1);
    endFreq.set(e, (endFreq.get(e) ?? 0) + 1);
  }

  console.log('Distinct sasStartTime values (count):');
  [...startFreq.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${v.toString().padStart(3)}  ${k}`));
  console.log('\nDistinct sasEndTime values (count):');
  [...endFreq.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${v.toString().padStart(3)}  ${k}`));

  // For the first 8 machines, show the chosen window vs the actual nearest WOW_SYNC syncs
  console.log('\nPer-machine detail (first 8):');
  for (const c of cols.slice(0, 8)) {
    const start = c.sasMeters?.sasStartTime ? new Date(c.sasMeters.sasStartTime) : null;
    const end = c.sasMeters?.sasEndTime ? new Date(c.sasMeters.sasEndTime) : null;
    console.log('='.repeat(80));
    console.log(`machine ${c.machineId} (${c.serialNumber || c.machineName || ''})`);
    console.log(`  chosen window: ${iso(start)} -> ${iso(end)}`);
    console.log(`  metersIn=${c.metersIn} prevIn=${c.prevIn}`);

    // Latest WOW_SYNC overall, and the sync nearest the chosen start/end
    const latest = await Meters.findOne({ machine: c.machineId, meterSource: 'WOW_SYNC' }).sort({ readAt: -1 }).select('readAt drop').lean<any>();
    const total = await Meters.countDocuments({ machine: c.machineId, meterSource: 'WOW_SYNC' });
    console.log(`  WOW_SYNC docs total=${total}, latest readAt=${iso(latest?.readAt)} drop=${latest?.drop}`);

    if (start) {
      const atStart = await Meters.findOne({ machine: c.machineId, meterSource: 'WOW_SYNC', readAt: { $lte: start } }).sort({ readAt: -1 }).select('readAt drop').lean<any>();
      const afterStart = await Meters.findOne({ machine: c.machineId, meterSource: 'WOW_SYNC', readAt: { $gt: start } }).sort({ readAt: 1 }).select('readAt drop').lean<any>();
      console.log(`  sync <=start: ${iso(atStart?.readAt)} drop=${atStart?.drop}  | next>start: ${iso(afterStart?.readAt)} drop=${afterStart?.drop}`);
    }
    if (end) {
      const atEnd = await Meters.findOne({ machine: c.machineId, meterSource: 'WOW_SYNC', readAt: { $lte: end } }).sort({ readAt: -1 }).select('readAt drop').lean<any>();
      console.log(`  sync <=end:   ${iso(atEnd?.readAt)} drop=${atEnd?.drop}`);
    }
  }

  await mongoose.disconnect();
}
main().catch(e => { console.error(e); mongoose.disconnect(); process.exit(1); });
