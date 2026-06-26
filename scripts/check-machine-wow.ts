import 'dotenv/config';
import mongoose from 'mongoose';
import { Collections } from '../app/api/lib/models/collections';
import { Machine } from '../app/api/lib/models/machines';
import { isWowMachine } from '../shared/utils/wowMachine';
import { GamingLocations } from '../app/api/lib/models/gaminglocations';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);

  // Find a recent no-SMIB location report
  const locs = await GamingLocations.find({ noSMIBLocation: true }).lean<any[]>();
  const locIds = locs.map(l => String(l._id));

  // Pick the most recent report from a no-SMIB location with >1 collections
  const { CollectionReport } = await import('../app/api/lib/models/collectionReport');
  const report = await CollectionReport.findOne({ location: { '$in': locIds } })
    .sort({ timestamp: -1 })
    .lean<any>();

  if (!report) { console.log('No report found'); await mongoose.disconnect(); return; }

  const reportId = report.locationReportId || report._id;
  const cols = await Collections.find({ locationReportId: reportId }).lean<any[]>();
  console.log(`Report: ${reportId} (${new Date(report.timestamp).toISOString().slice(0,10)})`);
  console.log(`Location: ${report.location}`);
  console.log(`Collections: ${cols.length}`);

  // Check machines
  const machineIds = [...new Set(cols.map(c => String(c.machineId)).filter(Boolean))];
  const machines = await Machine.find({ _id: { $in: machineIds } }).lean<any[]>();

  // Check what the location's machines look like
  const locMachines = await Machine.find({ gamingLocation: report.location }).limit(5).lean<any[]>();
  console.log(`\nSample machines at this location (${locMachines.length} total):`);
  for (const m of locMachines) {
    const source = m.meta?.dataSync?.source;
    console.log(`  ${m._id} serial=${m.serialNumber} relayId='${m.relayId || ''}' dataSync='${source}' isWow=${isWowMachine(m)}`);
  }

  // Check the actual machines in this report
  console.log(`\nMachines in this report (${machines.length}):`);
  for (const m of machines) {
    const source = m.meta?.dataSync?.source;
    console.log(`  ${m._id} serial=${m.serialNumber} relayId='${m.relayId || ''}' dataSync='${source}' isWow=${isWowMachine(m)}`);
  }

  // Check all unqiue dataSync sources
  const allSources = [...new Set(locMachines.map(m => m.meta?.dataSync?.source).filter(Boolean))];
  console.log(`\nUnique dataSync sources at this location: ${allSources.join(', ')}`);

  // Check one collection's meters and sasMeters
  const sampleCol = cols[0];
  console.log(`\nSample collection:`);
  console.log(`  machineId: ${sampleCol.machineId}`);
  console.log(`  metersIn: ${sampleCol.metersIn}, prevIn: ${sampleCol.prevIn}`);
  console.log(`  movement: ${JSON.stringify(sampleCol.movement)}`);
  console.log(`  sasMeters: ${JSON.stringify(sampleCol.sasMeters)}`);

  await mongoose.disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
