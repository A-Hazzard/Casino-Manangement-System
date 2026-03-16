const { MongoClient } = require('mongodb');

const uri = 'mongodb://sunny1:87ydaiuhdsia2e@147.182.133.136:27017/sas-aaron?authSource=admin';
const locationId = '69b46eda54694ea2246da6fd';

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('sas-aaron');

  // Get machine IDs from the collections we already found
  const machineIdsFromCollections = [
    '69b46f0454694ea2246da755',  // GGNOVO150
    '69b474a2a52863471c974ef4',  // TEST-MAC-001 (report 1)
    '69b4767a2428b8dd0950572c',  // TEST-MAC-002
    '69b4767b2428b8dd0950572e',  // TEST-MAC-003
    'cr-test-no-jackpot-e4397b15', // TEST-NO-JACKPOT
    '69b4767a2428b8dd0950572a',  // TEST-MAC-001 (report 2, different machineId!)
  ];

  const machineIdentifiers = [
    'GGNOVO150 (TO BE REMOVED)',
    'TEST-MAC-001',
    'TEST-MAC-002',
    'TEST-MAC-003',
    'TEST-NO-JACKPOT',
  ];

  console.log('='.repeat(100));
  console.log('1. MACHINES by ID from collections');
  console.log('='.repeat(100));

  for (const mid of machineIdsFromCollections) {
    const machine = await db.collection('machines').findOne({ _id: mid });
    if (machine) {
      console.log(`\nMachine ${mid}:`);
      console.log(`  custom.name: ${machine.custom?.name}`);
      console.log(`  serialNumber: ${machine.serialNumber}`);
      console.log(`  gamingLocation: ${machine.gamingLocation}`);
      console.log(`  collectionMeters: ${JSON.stringify(machine.collectionMeters)}`);
      console.log(`  collectionTime: ${machine.collectionTime}`);
      console.log(`  previousCollectionTime: ${machine.previousCollectionTime}`);
      console.log(`  deletedAt: ${machine.deletedAt}`);
      console.log(`  game: ${machine.game}`);
    } else {
      console.log(`\nMachine ${mid}: NOT FOUND`);
    }
  }

  console.log('\n' + '='.repeat(100));
  console.log('2. METERS - checking what machine identifiers exist');
  console.log('='.repeat(100));

  for (const ident of machineIdentifiers) {
    const count = await db.collection('meters').countDocuments({ machine: ident });
    console.log(`  "${ident}": ${count} meters`);
  }

  // Also try _ids
  for (const mid of machineIdsFromCollections) {
    const count = await db.collection('meters').countDocuments({ machine: mid });
    if (count > 0) console.log(`  "${mid}" (by _id): ${count} meters`);
  }

  // Check what distinct machine values exist in meters for this location
  const distinctMachinesInMeters = await db.collection('meters').distinct('machine', { location: locationId });
  console.log(`\n  Distinct machine values in meters for location ${locationId}:`, distinctMachinesInMeters);

  // If nothing found by location, try to find any meters with these identifiers
  console.log('\n  Trying broader search...');
  for (const ident of machineIdentifiers) {
    const sample = await db.collection('meters').findOne({ machine: ident });
    if (sample) {
      console.log(`  Found meter for "${ident}" at location: ${sample.location}, readAt: ${sample.readAt}`);
    }
  }

  // Let's also check what the location field looks like in meters
  const sampleMeter = await db.collection('meters').findOne({});
  if (sampleMeter) {
    console.log(`\n  Sample meter document (first in collection):`);
    console.log(`    _id: ${sampleMeter._id}`);
    console.log(`    machine: ${sampleMeter.machine}`);
    console.log(`    location: ${sampleMeter.location}`);
    console.log(`    readAt: ${sampleMeter.readAt}`);
    console.log(`    movement: ${JSON.stringify(sampleMeter.movement)}`);
  }

  // Get distinct locations in meters
  const distinctLocations = await db.collection('meters').distinct('location');
  console.log(`\n  Distinct locations in meters:`, distinctLocations);

  // Get distinct machines in meters (first 20)
  const distinctMachines = await db.collection('meters').distinct('machine');
  console.log(`\n  Distinct machines in meters (${distinctMachines.length} total):`, distinctMachines.slice(0, 20));

  // Now do the movement sums with whatever machines exist
  console.log('\n' + '='.repeat(100));
  console.log('3. MOVEMENT SUMS - for all machines that have meters');
  console.log('='.repeat(100));

  const ranges = [
    { name: 'Range A: March 14 00:00 UTC to March 15 00:00 UTC', start: new Date('2026-03-14T00:00:00Z'), end: new Date('2026-03-15T00:00:00Z') },
    { name: 'Range B: March 13 12:00 UTC to March 15 12:00 UTC', start: new Date('2026-03-13T12:00:00Z'), end: new Date('2026-03-15T12:00:00Z') },
    { name: 'Range C: March 14 13:00 UTC to March 15 13:00 UTC (9am-9am TT)', start: new Date('2026-03-14T13:00:00Z'), end: new Date('2026-03-15T13:00:00Z') },
  ];

  // Use all distinct machines from the meters collection
  const allMachineIdents = distinctMachines;

  for (const range of ranges) {
    console.log(`\n${'─'.repeat(90)}`);
    console.log(`${range.name}`);
    console.log(`${'─'.repeat(90)}`);

    for (const ident of allMachineIdents) {
      const pipeline = [
        {
          $match: {
            machine: ident,
            readAt: { $gte: range.start, $lte: range.end }
          }
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            sumDrop: { $sum: { $ifNull: ['$movement.drop', 0] } },
            sumTotalCancelledCredits: { $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] } },
            sumJackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
            sumCoinIn: { $sum: { $ifNull: ['$movement.coinIn', 0] } },
            sumCoinOut: { $sum: { $ifNull: ['$movement.coinOut', 0] } },
            minReadAt: { $min: '$readAt' },
            maxReadAt: { $max: '$readAt' },
          }
        }
      ];

      const result = await db.collection('meters').aggregate(pipeline).toArray();

      if (result.length > 0) {
        const r = result[0];
        const gross = r.sumDrop - r.sumTotalCancelledCredits;
        const netGross = gross - r.sumJackpot;
        console.log(`\n  Machine: ${ident}`);
        console.log(`    Meters count: ${r.count}`);
        console.log(`    First meter:  ${r.minReadAt.toISOString()}`);
        console.log(`    Last meter:   ${r.maxReadAt.toISOString()}`);
        console.log(`    movement.drop:                   ${r.sumDrop}`);
        console.log(`    movement.totalCancelledCredits:   ${r.sumTotalCancelledCredits}`);
        console.log(`    movement.jackpot:                 ${r.sumJackpot}`);
        console.log(`    movement.coinIn:                  ${r.sumCoinIn}`);
        console.log(`    movement.coinOut:                 ${r.sumCoinOut}`);
        console.log(`    Gross (drop - cancelled):         ${gross}`);
        console.log(`    Net Gross (gross - jackpot):       ${netGross}`);
      }
    }
  }

  // Meter timeline overview
  console.log('\n' + '='.repeat(100));
  console.log('4. METER TIMELINE - per machine');
  console.log('='.repeat(100));

  for (const ident of allMachineIdents) {
    const totalCount = await db.collection('meters').countDocuments({ machine: ident });
    const first = await db.collection('meters').findOne({ machine: ident }, { sort: { readAt: 1 } });
    const last = await db.collection('meters').findOne({ machine: ident }, { sort: { readAt: -1 } });

    console.log(`\n  ${ident}:`);
    console.log(`    Total meters: ${totalCount}`);
    if (first) console.log(`    First: ${first.readAt.toISOString()}`);
    if (last) console.log(`    Last:  ${last.readAt.toISOString()}`);
  }

  // What happens if we delete reports?
  console.log('\n' + '='.repeat(100));
  console.log('5. ANALYSIS: If reports are deleted, what would SAS windows be for a fresh report?');
  console.log('='.repeat(100));

  // Gaming location previousCollectionTime
  const gl = await db.collection('gaminglocations').findOne({ _id: locationId });
  console.log(`\n  Gaming Location previousCollectionTime: ${gl?.previousCollectionTime || 'NOT SET'}`);
  console.log(`  NOTE: This field is on the gaming location, NOT on the collection report schema`);
  console.log(`  The code in creation.ts looks at COLLECTIONS (not collectionreports) to find previousCollectionTime`);

  console.log('\n  For each machine, getSasTimePeriod() does:');
  console.log('    1. Look for most recent collection in "collections" table for this machine');
  console.log('    2. If found, use its timestamp as sasStartTime');
  console.log('    3. If NOT found, use machine.collectionTime as fallback');
  console.log('    4. If that also missing, use 24h fallback (sasEndTime - 24h)');

  console.log('\n  If we delete BOTH reports AND their linked collections:');
  for (const mid of [...new Set(machineIdsFromCollections)]) {
    const machine = await db.collection('machines').findOne({ _id: mid });
    if (machine) {
      console.log(`\n    ${machine.custom?.name || machine.serialNumber || mid}:`);
      console.log(`      machine.collectionTime: ${machine.collectionTime || 'NOT SET'}`);
      if (machine.collectionTime) {
        console.log(`      -> SAS window would be: ${new Date(machine.collectionTime).toISOString()} to [collectionTimestamp]`);
      } else {
        console.log(`      -> SAS window would be: [collectionTimestamp - 24h] to [collectionTimestamp] (24h fallback)`);
      }
    }
  }

  await client.close();
  console.log('\nDone!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
