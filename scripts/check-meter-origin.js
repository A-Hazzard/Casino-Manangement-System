require('dotenv').config();
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  console.log('=== When was the V2 session submitted (not created)? ===');
  const session = await db.collection('reportedmachines').findOne({
    _id: '6a42c07ab521fbb2b6ca1309'
  });
  if (session) {
    console.log('createdAt:', session.createdAt);
    console.log('updatedAt:', session.updatedAt);
    console.log('submittedAt:', session.submittedAt);
    console.log('sessionStatus:', session.sessionStatus);
    console.log('reportVersion:', session.reportVersion);
  }

  console.log('\n=== ALL reportedmachines for this machine ===');
  const rms = await db.collection('reportedmachines').find({
    machineId: '6a0b3e15ad874aa2e816fbc5'
  }).sort({ createdAt: -1 }).toArray();
  for (const rm of rms) {
    console.log(JSON.stringify({
      _id: rm._id,
      sessionId: rm.sessionId,
      sessionStatus: rm.sessionStatus,
      createdAt: rm.createdAt,
      updatedAt: rm.updatedAt,
      locationId: rm.locationId,
      manualMetersIn: rm.manualMetersIn,
      sasMetersIn: rm.sasMetersIn,
      prevSasMetersIn: rm.prevSasMetersIn,
      metersMatch: rm.metersMatch,
      isSupplemental: rm.isSupplemental,
    }));
  }

  console.log('\n=== Check if meter doc ID is in any session machine list ===');
  for (const rm of rms) {
    if (rm.machines) {
      const found = rm.machines.find(m => m.machineId === '6a0b3e15ad874aa2e816fbc5');
      if (found) {
        console.log(`Session ${rm.sessionId}:`, JSON.stringify(found, null, 2));
      }
    }
  }

  console.log('\n=== Check reportedmachines collections for meter doc machine around Jun 29 ===');
  const jun29 = new Date('2026-06-29T15:00:00Z');
  const jun30 = new Date('2026-06-29T18:00:00Z');
  const aroundTime = await db.collection('reportedmachines').find({
    createdAt: { $gte: jun29, $lte: jun30 }
  }).toArray();
  console.log('reportedmachines created between 15:00-18:00 UTC on Jun 29:');
  for (const rm of aroundTime) {
    console.log(JSON.stringify({
      _id: rm._id,
      sessionId: rm.sessionId,
      machineId: rm.machineId,
      createdAt: rm.createdAt,
    }));
  }

  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
