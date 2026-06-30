import 'dotenv/config';
import mongoose from 'mongoose';
import { Machine } from '../app/api/lib/models/machines';
import { isWowMachine } from '../shared/utils/wowMachine';
import { GamingLocations } from '../app/api/lib/models/gaminglocations';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);

  // Check machines from the working report's location
  const reportLocation = '69d7c6547efab6fc04a01a97'; // from the check-machine-wow output
  
  // Check what makes a machine WOW
  const locMachines = await Machine.find({ gamingLocation: reportLocation })
    .lean<any[]>();

  console.log(`Location ${reportLocation} has ${locMachines.length} machines`);
  
  const wowMachines = locMachines.filter(m => isWowMachine(m));
  const nonWowMachines = locMachines.filter(m => !isWowMachine(m));
  
  console.log(`isWow=true: ${wowMachines.length}`);
  console.log(`isWow=false: ${nonWowMachines.length}`);

  // Show dataSync sources
  const sources = new Map<string, number>();
  for (const m of locMachines) {
    const src = String(m.meta?.dataSync?.source ?? 'undefined');
    sources.set(src, (sources.get(src) || 0) + 1);
  }
  console.log(`\ndataSync.source distribution:`);
  for (const [src, count] of sources) {
    console.log(`  ${src}: ${count}`);
  }

  // Check if WOW machines have relayId
  const wowWithRelay = wowMachines.filter(m => m.relayId).length;
  console.log(`\nWOW machines with relayId: ${wowWithRelay}/${wowMachines.length}`);
  
  // Check serial numbers of a few non-WOW machines
  console.log(`\nSample non-WOW machines (first 5):`);
  for (const m of nonWowMachines.slice(0, 5)) {
    console.log(`  serial=${m.serialNumber} relayId='${m.relayId || ''}' source=${m.meta?.dataSync?.source}`);
  }

  // Now check: what about the 176 mismatch reports? Find their location flag
  const mismatchRepsNoloc = await (await import('../app/api/lib/models/collectionReport')).CollectionReport
    .find({ locationReportId: '1a001460-4614-4c79-a98d-afe8b2ccf423' })
    .lean<any[]>();
  // Hmm, just check the location from the find-wow output
  // Report 51859c67-504f-463e-bed2-df1c6687bfbb from 2026-06-08
  const reportLocations = [
    '51859c67-504f-463e-bed2-df1c6687bfbb', // 2026-06-08
    '1a001460-4614-4c79-a98d-afe8b2ccf423', // 2026-06-09
  ];
  
  for (const reportId of reportLocations) {
    const rep = await (await import('../app/api/lib/models/collectionReport')).CollectionReport
      .findOne({ locationReportId: reportId })
      .lean<any>();
    if (rep) {
      const loc = await GamingLocations.findOne({ _id: rep.location }).lean<any>();
      console.log(`\nReport ${reportId.slice(0,8)}... location=${rep.location} noSMIBLocation=${loc?.noSMIBLocation}`);
      
      // Check machines at that location
      const lm = await Machine.find({ gamingLocation: rep.location }).limit(3).lean<any[]>();
      for (const m of lm) {
        console.log(`  mach: serial=${m.serialNumber} isWow=${isWowMachine(m)} source=${m.meta?.dataSync?.source} relayId='${m.relayId || ''}'`);
      }
    }
  }

  // Compare the working location's noSMIBLocation flag
  const workingLoc = await GamingLocations.findOne({ _id: reportLocation }).lean<any>();
  console.log(`\nWorking location ${reportLocation}: noSMIBLocation=${workingLoc?.noSMIBLocation}`);

  await mongoose.disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
