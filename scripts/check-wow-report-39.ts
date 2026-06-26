import 'dotenv/config';
import mongoose from 'mongoose';
import { Collections } from '../app/api/lib/models/collections';
import { Machine } from '../app/api/lib/models/machines';
import { isWowMachine } from '../shared/utils/wowMachine';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);

  // Report 39b4fd16
  const cols = await Collections.find(
    { locationReportId: '39b4fd16-c6b4-4585-b18f-851563b093e6' },
    { machineId: 1, metersIn: 1, prevIn: 1, movement: 1, sasMeters: 1 }
  ).lean<any[]>();

  console.log(`Collections: ${cols.length}`);

  const machineIds = [...new Set(cols.map(c => String(c.machineId)).filter(Boolean))];
  const machines = await Machine.find(
    { _id: { $in: machineIds } },
    { serialNumber: 1, relayId: 1, 'meta.dataSync.source': 1, gamingLocation: 1 }
  ).lean<any[]>();

  const machMap = new Map(machines.map(m => [String(m._id), m]));

  const withWow = cols.filter(c => {
    const m = machMap.get(String(c.machineId));
    return m && isWowMachine(m);
  });
  const withoutWow = cols.filter(c => {
    const m = machMap.get(String(c.machineId));
    return !m || !isWowMachine(m);
  });

  console.log(`\nisWowMachine=true: ${withWow.length}`);
  console.log(`isWowMachine=false: ${withoutWow.length}`);

  // Show detail for first few without wow
  console.log(`\nNon-WOW machine details:`);
  for (const c of withoutWow.slice(0, 15)) {
    const m = machMap.get(String(c.machineId));
    if (m) {
      console.log(`  ${m.serialNumber} loc=${m.gamingLocation} relay='${m.relayId || ''}' source=${m.meta?.dataSync?.source} sasStart=${c.sasMeters?.sasStartTime || 'none'}`);
    } else {
      console.log(`  no machine doc for ${c.machineId}`);
    }
  }

  // Unique locations
  const locs = [...new Set(machines.map(m => String(m.gamingLocation)))];
  console.log(`\nUnique locations for machines in this report: ${locs.join(', ')}`);

  await mongoose.disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
