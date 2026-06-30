require('dotenv').config();
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const machineId = '6a0b3e15ad874aa2e816fbc5';

  console.log('=== Latest V2 Submitted Session ===');
  const latestSession = await db.collection('reportedmachines')
    .find({ machineId, sessionStatus: 'submitted' })
    .sort({ createdAt: -1 })
    .limit(1)
    .toArray();
  if (latestSession.length > 0) {
    const s = latestSession[0];
    console.log('Session:', s.sessionId);
    console.log('sasStartTime:', s.sasStartTime);
    console.log('sasEndTime:', s.sasEndTime);
    console.log('sasMetersIn:', s.sasMetersIn);
    console.log('sasMetersOut:', s.sasMetersOut);
    console.log('prevSasMetersIn:', s.prevSasMetersIn);
    console.log('prevSasMetersOut:', s.prevSasMetersOut);
    console.log('metersMatch:', s.metersMatch);
    console.log('createdAt:', s.createdAt);
  }

  console.log('\n=== Machine.collectionMeters ===');
  const machine = await db.collection('machines').findOne({ _id: machineId }, { projection: { collectionMeters: 1, collectionMetersHistory: 1 } });
  console.log('collectionMeters:', machine?.collectionMeters);

  console.log('\n=== Collection History (last 5) ===');
  const history = (machine?.collectionMetersHistory || []).slice(-5);
  for (const h of history) {
    console.log(JSON.stringify({
      locationReportId: h.locationReportId,
      metersIn: h.metersIn,
      metersOut: h.metersOut,
      timestamp: h.timestamp,
      reportVersion: h.reportVersion,
    }));
  }

  console.log('\n=== Meter Docs around Jun 16 3:05 PM ===');
  const jun16meters = await db.collection('meters')
    .find({ machine: machineId, readAt: { $gte: new Date('2026-06-16T14:50:00.000Z'), $lte: new Date('2026-06-16T15:30:00.000Z') } })
    .sort({ readAt: -1 })
    .toArray();
  for (const m of jun16meters) {
    console.log(JSON.stringify({ readAt: m.readAt, drop: m.drop, totalCancelledCredits: m.totalCancelledCredits }));
  }

  console.log('\n=== Meter Docs around Jun 27 ===');
  const jun27meters = await db.collection('meters')
    .find({ machine: machineId, readAt: { $gte: new Date('2026-06-27T00:00:00.000Z'), $lte: new Date('2026-06-28T00:00:00.000Z') } })
    .sort({ readAt: -1 })
    .toArray();
  for (const m of jun27meters) {
    console.log(JSON.stringify({ readAt: m.readAt, drop: m.drop, totalCancelledCredits: m.totalCancelledCredits }));
  }

  console.log('\n=== V1 Collection from Jun 16 ===');
  const v1Collection = await db.collection('collections')
    .find({ machineId, locationReportId: { $ne: '' }, isCompleted: true })
    .sort({ timestamp: -1 })
    .limit(2)
    .toArray();
  for (const c of v1Collection) {
    console.log(JSON.stringify({
      _id: c._id,
      metersIn: c.metersIn,
      metersOut: c.metersOut,
      prevIn: c.prevIn,
      prevOut: c.prevOut,
      timestamp: c.timestamp,
      locationReportId: c.locationReportId,
    }));
  }

  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
