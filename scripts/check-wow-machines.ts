/**
 * Diagnostic: Check which machines have meta.dataSync.source = 'wow' and at which locations.
 *
 * @module scripts/check-wow-machines
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection.db!;

  const wowMachines = await db
    .collection('machines')
    .find(
      {
        'meta.dataSync.source': 'wow',
        $or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2025-01-01') } }],
      },
      { projection: { gamingLocation: 1, serialNumber: 1, name: 1, 'meta.dataSync.source': 1 } }
    )
    .toArray();

  console.log(`Total WOW machines: ${wowMachines.length}`);

  const byLocation = new Map<string, Array<string>>();
  for (const machine of wowMachines) {
    const locId = String(machine.gamingLocation);
    if (!byLocation.has(locId)) byLocation.set(locId, []);
    byLocation.get(locId)!.push(String(machine.serialNumber || machine.name || machine._id));
  }

  const locIds = [...byLocation.keys()];
  const locations = await db
    .collection('gaminglocations')
    .find({ _id: { $in: locIds } }, { projection: { name: 1 } })
    .toArray();
  const locNameMap = new Map<string, string>();
  for (const loc of locations) locNameMap.set(String(loc._id), String(loc.name));

  console.log('\nWOW machines by location:');
  for (const [locId, machines] of byLocation) {
    console.log(`  ${locNameMap.get(locId) || locId} (${machines.length}): ${machines.join(', ')}`);
  }

  // Also check the distinct gamingLocation values from the Machine.distinct query used in the route
  const distinctLocs = await db.collection('machines').distinct('gamingLocation', {
    'meta.dataSync.source': 'wow',
    $or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2025-01-01') } }],
  });
  console.log(`\nMachine.distinct('gamingLocation') count: ${distinctLocs.length}`);

  await mongoose.disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
