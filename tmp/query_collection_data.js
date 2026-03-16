const { MongoClient } = require('mongodb');

const uri = 'mongodb://sunny1:87ydaiuhdsia2e@147.182.133.136:27017/sas-aaron?authSource=admin';
const locationId = '69b46eda54694ea2246da6fd';

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('sas-aaron');

  console.log('='.repeat(100));
  console.log('1. COLLECTION REPORTS for location', locationId);
  console.log('='.repeat(100));

  const reports = await db.collection('collectionreports').find({ location: locationId }).sort({ timestamp: 1 }).toArray();
  console.log(`Found ${reports.length} collection reports\n`);
  for (const r of reports) {
    console.log(JSON.stringify(r, null, 2));
    console.log('---');
  }

  // Get locationReportIds from the reports
  const reportIds = reports.map(r => r._id);
  const locationReportIds = reports.map(r => r.locationReportId).filter(Boolean);
  console.log('\nReport IDs:', reportIds);
  console.log('Location Report IDs:', locationReportIds);

  console.log('\n' + '='.repeat(100));
  console.log('2. COLLECTIONS (individual machine collections) linked to these reports');
  console.log('='.repeat(100));

  // Try multiple ways to find linked collections
  const collections = await db.collection('collections').find({
    $or: [
      { locationReportId: { $in: [...reportIds.map(String), ...locationReportIds.map(String)] } },
      { location: locationId }
    ]
  }).sort({ timestamp: 1 }).toArray();

  console.log(`Found ${collections.length} collections\n`);
  for (const c of collections) {
    console.log(JSON.stringify(c, null, 2));
    console.log('---');
  }

  console.log('\n' + '='.repeat(100));
  console.log('3. MACHINES at this location - collectionMeters and collectionTime');
  console.log('='.repeat(100));

  const machines = await db.collection('machines').find({
    gamingLocation: locationId,
    deletedAt: { $exists: false }
  }).project({
    _id: 1,
    'custom.name': 1,
    serialNumber: 1,
    collectionMeters: 1,
    collectionTime: 1,
    previousCollectionTime: 1,
    game: 1,
    machineId: 1,
  }).toArray();

  console.log(`Found ${machines.length} machines\n`);
  const machineIds = [];
  const machineIdentifiers = [];
  for (const m of machines) {
    console.log(JSON.stringify(m, null, 2));
    machineIds.push(m._id);
    // The system uses serialNumber as the identifier in meters
    machineIdentifiers.push(m.serialNumber || m.custom?.name || m._id);
    console.log('---');
  }

  console.log('\n' + '='.repeat(100));
  console.log('4. GAMING LOCATION previousCollectionTime');
  console.log('='.repeat(100));

  const gamingLocation = await db.collection('gaminglocations').findOne({ _id: locationId });
  if (gamingLocation) {
    console.log('previousCollectionTime:', gamingLocation.previousCollectionTime);
    console.log('gameDayOffset:', gamingLocation.gameDayOffset);
    console.log('name:', gamingLocation.name);
  } else {
    console.log('Gaming location not found!');
  }

  // Now check what identifier is used in meters for these machines
  console.log('\n' + '='.repeat(100));
  console.log('5. SAMPLE METERS - checking machine identifier format');
  console.log('='.repeat(100));

  for (const id of machineIdentifiers) {
    const sample = await db.collection('meters').findOne({ machine: id });
    if (sample) {
      console.log(`Machine identifier "${id}" -> found meter, readAt: ${sample.readAt}`);
    } else {
      console.log(`Machine identifier "${id}" -> NO meters found`);
    }
  }
  // Also try by _id
  for (const id of machineIds) {
    const sample = await db.collection('meters').findOne({ machine: id });
    if (sample) {
      console.log(`Machine _id "${id}" -> found meter, readAt: ${sample.readAt}`);
    } else {
      console.log(`Machine _id "${id}" -> NO meters found`);
    }
  }

  // Determine the correct identifiers
  console.log('\n' + '='.repeat(100));
  console.log('6. MOVEMENT SUMS FROM METERS - Multiple Time Ranges');
  console.log('='.repeat(100));

  // Find correct identifiers by checking which ones have meters
  const validIdentifiers = {};
  for (const m of machines) {
    const possibleIds = [m.serialNumber, m.custom?.name, m._id, m.machineId].filter(Boolean);
    for (const pid of possibleIds) {
      const count = await db.collection('meters').countDocuments({ machine: pid });
      if (count > 0) {
        validIdentifiers[m._id] = pid;
        break;
      }
    }
    if (!validIdentifiers[m._id]) {
      validIdentifiers[m._id] = m._id; // fallback
    }
  }

  console.log('\nValid meter identifiers per machine:');
  for (const [mid, ident] of Object.entries(validIdentifiers)) {
    const machine = machines.find(m => m._id === mid);
    console.log(`  ${mid} (${machine?.custom?.name || machine?.serialNumber || 'unnamed'}) -> meters use: "${ident}"`);
  }

  const ranges = [
    { name: 'Range A: March 14 00:00 UTC to March 15 00:00 UTC', start: new Date('2026-03-14T00:00:00Z'), end: new Date('2026-03-15T00:00:00Z') },
    { name: 'Range B: March 13 12:00 UTC to March 15 12:00 UTC', start: new Date('2026-03-13T12:00:00Z'), end: new Date('2026-03-15T12:00:00Z') },
    { name: 'Range C: March 14 13:00 UTC to March 15 13:00 UTC (9am-9am TT)', start: new Date('2026-03-14T13:00:00Z'), end: new Date('2026-03-15T13:00:00Z') },
  ];

  for (const range of ranges) {
    console.log(`\n${'─'.repeat(90)}`);
    console.log(`${range.name}`);
    console.log(`${'─'.repeat(90)}`);

    for (const m of machines) {
      const ident = validIdentifiers[m._id];
      const machineName = m.custom?.name || m.serialNumber || m._id;

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
        console.log(`\n  Machine: ${machineName} (${ident})`);
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
      } else {
        console.log(`\n  Machine: ${machineName} (${ident}) -> NO meters in this range`);
      }
    }
  }

  // BONUS: Show the overall meter timeline for these machines
  console.log('\n' + '='.repeat(100));
  console.log('7. METER TIMELINE OVERVIEW - first and last meters per machine');
  console.log('='.repeat(100));

  for (const m of machines) {
    const ident = validIdentifiers[m._id];
    const machineName = m.custom?.name || m.serialNumber || m._id;

    const totalCount = await db.collection('meters').countDocuments({ machine: ident });
    const first = await db.collection('meters').findOne({ machine: ident }, { sort: { readAt: 1 } });
    const last = await db.collection('meters').findOne({ machine: ident }, { sort: { readAt: -1 } });

    // Also count meters in last 48 hours
    const fortyEightHoursAgo = new Date('2026-03-13T13:00:00Z');
    const recentCount = await db.collection('meters').countDocuments({
      machine: ident,
      readAt: { $gte: fortyEightHoursAgo }
    });

    console.log(`\n  ${machineName} (${ident}):`);
    console.log(`    Total meters: ${totalCount}`);
    console.log(`    Recent meters (last ~48h): ${recentCount}`);
    if (first) console.log(`    First: ${first.readAt.toISOString()}`);
    if (last) console.log(`    Last:  ${last.readAt.toISOString()}`);
  }

  // BONUS 2: What happens if we delete reports and create fresh?
  console.log('\n' + '='.repeat(100));
  console.log('8. ANALYSIS: What happens if existing reports are deleted?');
  console.log('='.repeat(100));

  console.log('\nIf both collection reports are deleted:');
  console.log('  - Collections linked to those reports would also need to be deleted');
  console.log('  - getSasTimePeriod() would find NO previous collections');
  console.log('  - It would fall back to machine.collectionTime');

  for (const m of machines) {
    const machineName = m.custom?.name || m.serialNumber || m._id;
    console.log(`\n  ${machineName}:`);
    console.log(`    machine.collectionTime: ${m.collectionTime || 'NOT SET'}`);
    console.log(`    machine.previousCollectionTime: ${m.previousCollectionTime || 'NOT SET'}`);
    console.log(`    machine.collectionMeters: ${JSON.stringify(m.collectionMeters || {})}`);
  }

  if (gamingLocation) {
    console.log(`\n  Gaming Location previousCollectionTime: ${gamingLocation.previousCollectionTime || 'NOT SET'}`);
    console.log('  If machine.collectionTime is NOT SET, system uses 24h fallback (sasEndTime - 24h)');
  }

  await client.close();
  console.log('\nDone!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
