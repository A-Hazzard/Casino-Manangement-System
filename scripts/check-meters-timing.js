require('dotenv').config();
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const machineId = '6a0b3e15ad874aa2e816fbc5';

  console.log('=== Current machine state ===');
  const machine = await db.collection('machines').findOne({ _id: machineId }, { projection: { sasMeters: 1, collectionMeters: 1, collectionTime: 1 } });
  console.log('Machine.sasMeters.drop:', machine?.sasMeters?.drop);
  console.log('Machine.sasMeters.totalCancelledCredits:', machine?.sasMeters?.totalCancelledCredits);
  console.log('Machine.collectionMeters:', machine?.collectionMeters);
  console.log('');

  console.log('=== Current in-progress ReportedMachine ===');
  const rm = await db.collection('reportedmachines').findOne({ machineId, sessionStatus: 'in-progress' });
  console.log('sasStartTime:', rm?.sasStartTime);
  console.log('sasEndTime:', rm?.sasEndTime);
  console.log('sasMetersIn:', rm?.sasMetersIn);
  console.log('sasMetersOut:', rm?.sasMetersOut);
  console.log('');

  console.log('=== Meter docs around Jun 16 3:05 PM ===');
  const jun16start = new Date('2026-06-16T14:55:00.000Z');
  const jun16end = new Date('2026-06-16T15:15:00.000Z');
  const jun16meters = await db.collection('meters')
    .find({ machine: machineId, readAt: { $gte: jun16start, $lte: jun16end } })
    .sort({ readAt: -1 })
    .toArray();
  console.log('Meters near Jun 16 3:05 PM:', jun16meters.length);
  for (const m of jun16meters) {
    console.log(JSON.stringify({ readAt: m.readAt, drop: m.drop, totalCancelledCredits: m.totalCancelledCredits }));
  }

  console.log('');
  console.log('=== Meter doc at session end (Jun 29 ~2:59 PM) ===');
  const jun29start = new Date('2026-06-29T14:50:00.000Z');
  const jun29end = new Date('2026-06-29T15:10:00.000Z');
  const jun29meters = await db.collection('meters')
    .find({ machine: machineId, readAt: { $gte: jun29start, $lte: jun29end } })
    .sort({ readAt: -1 })
    .toArray();
  console.log('Meters near Jun 29 2:59 PM:', jun29meters.length);
  for (const m of jun29meters) {
    console.log(JSON.stringify({ readAt: m.readAt, drop: m.drop, totalCancelledCredits: m.totalCancelledCredits }));
  }

  console.log('');
  console.log('=== What the in-progress machine was captured with ===');
  console.log('The machine sasMetersIn was set to:', rm?.sasMetersIn ?? 'NOT SET');
  console.log('This should be the value at sasStartTime (Jun 16 3:05 PM) = 204,076');
  console.log('But Machine.sasMeters.drop =', machine?.sasMeters?.drop, '(current relay value)');

  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
