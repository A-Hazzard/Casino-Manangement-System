require('dotenv').config();
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const machineId = '6a0b3e15ad874aa2e816fbc5';

  console.log('=== Machine.sasMeters (current) ===');
  const machine = await db.collection('machines').findOne({ _id: machineId }, { projection: { sasMeters: 1, collectionMeters: 1, collectionTime: 1, sasStartTime: 1, sasEndTime: 1 } });
  console.log(JSON.stringify(machine?.sasMeters, null, 2));
  console.log('collectionTime:', machine?.collectionTime);
  console.log('');

  console.log('=== ALL ReportedMachines for this machine ===');
  const all = await db.collection('reportedmachines')
    .find({ machineId })
    .sort({ createdAt: -1 })
    .toArray();
  for (const rm of all) {
    console.log(JSON.stringify({
      _id: rm._id,
      sessionId: rm.sessionId,
      sessionStatus: rm.sessionStatus,
      sasStartTime: rm.sasStartTime,
      sasEndTime: rm.sasEndTime,
      locationName: rm.locationName,
      deletedAt: rm.deletedAt || null,
      createdAt: rm.createdAt,
    }));
  }

  console.log('');
  console.log('=== Latest meter docs (last 10) ===');
  const meters = await db.collection('meters')
    .find({ machine: machineId })
    .sort({ readAt: -1 })
    .limit(10)
    .toArray();
  for (const m of meters) {
    console.log(JSON.stringify({
      _id: m._id,
      readAt: m.readAt,
      drop: m.drop,
      totalCancelledCredits: m.totalCancelledCredits,
    }));
  }

  console.log('');
  console.log('=== What custom-meters endpoint would return for Jun 16 3:05 PM -> Jun 29 2:59 PM ===');
  const start = new Date('2026-06-16T15:05:00.000Z');
  const end = new Date('2026-06-29T14:59:00.000Z');
  const latestMeter = await db.collection('meters').findOne(
    { machine: machineId, readAt: { $gte: start, $lte: end } },
    { sort: { readAt: -1 } }
  );
  if (latestMeter) {
    console.log('Found meter:', JSON.stringify({
      _id: latestMeter._id,
      readAt: latestMeter.readAt,
      drop: latestMeter.drop,
      totalCancelledCredits: latestMeter.totalCancelledCredits,
    }));
  } else {
    console.log('NO METER FOUND in that range');
  }

  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
