require('dotenv').config();
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const machineId = '6a0b3e15ad874aa2e816fbc5';

  console.log('=== ALL sessions for this machine (all statuses) ===');
  const allSessions = await db.collection('reportedmachines')
    .find({ machineId })
    .sort({ createdAt: 1 })
    .toArray();
  for (const s of allSessions) {
    console.log(JSON.stringify({
      _id: s._id,
      sessionId: s.sessionId,
      sessionStatus: s.sessionStatus,
      sasStartTime: s.sasStartTime,
      sasEndTime: s.sasEndTime,
      sasMetersIn: s.sasMetersIn,
      sasMetersOut: s.sasMetersOut,
      prevSasMetersIn: s.prevSasMetersIn,
      prevSasMetersOut: s.prevSasMetersOut,
      locationName: s.locationName,
      createdAt: s.createdAt,
    }));
  }

  console.log('\n=== ALL meter docs for this machine ===');
  const meters = await db.collection('meters')
    .find({ machine: machineId })
    .sort({ readAt: 1 })
    .toArray();
  console.log('Count:', meters.length);
  for (const m of meters) {
    console.log(JSON.stringify({
      _id: m._id,
      readAt: m.readAt,
      drop: m.drop,
      totalCancelledCredits: m.totalCancelledCredits,
      locationSession: m.locationSession,
    }));
  }

  console.log('\n=== Machine.sasMeters (current relay state) ===');
  const machine = await db.collection('machines').findOne({ _id: machineId }, {
    projection: { sasMeters: 1, collectionTime: 1, relayId: 1, lastActivity: 1 }
  });
  console.log('sasMeters:', JSON.stringify(machine?.sasMeters));
  console.log('collectionTime:', machine?.collectionTime);
  console.log('relayId:', machine?.relayId);
  console.log('lastActivity:', machine?.lastActivity);

  console.log('\n=== V1 Collections for this machine (last 5) ===');
  const v1 = await db.collection('collections')
    .find({ machineId, locationReportId: { $ne: '' }, isCompleted: true })
    .sort({ timestamp: -1 })
    .limit(5)
    .toArray();
  for (const c of v1) {
    console.log(JSON.stringify({
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
