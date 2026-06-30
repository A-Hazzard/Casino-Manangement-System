require('dotenv').config();
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const machineId = '6a0b3e15ad874aa2e816fbc5';
  const excludeSessionId = '6a429b4433fb66874b31e6ea';

  console.log('=== ALL ReportedMachines ===');
  const all = await db.collection('reportedmachines')
    .find({ machineId })
    .sort({ sasEndTime: 1 })
    .toArray();
  for (const rm of all) {
    console.log(JSON.stringify({
      _id: rm._id,
      sessionId: rm.sessionId,
      sessionStatus: rm.sessionStatus,
      sasStartTime: rm.sasStartTime,
      sasEndTime: rm.sasEndTime,
      location: rm.location,
      locationName: rm.locationName,
      deletedAt: rm.deletedAt || null,
    }));
  }

  console.log('');
  console.log('=== Simulating last-collection-time (excluding current session) ===');
  const baseFilter = {
    machineId,
    sessionStatus: 'submitted',
    sessionId: { $ne: excludeSessionId },
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  };
  const last = await db.collection('reportedmachines').findOne(baseFilter, { sort: { sasEndTime: -1 }, projection: { sasEndTime: 1, sessionId: 1 } });
  const first = await db.collection('reportedmachines').findOne(baseFilter, { sort: { sasEndTime: 1 }, projection: { sasEndTime: 1, sessionId: 1 } });
  console.log('last:', JSON.stringify(last));
  console.log('first:', JSON.stringify(first));

  const machine = await db.collection('machines').findOne({ _id: machineId }, { projection: { collectionTime: 1 } });
  console.log('Machine.collectionTime (V1 fallback):', machine?.collectionTime);

  console.log('');
  console.log('=== isMiddleReportWarning simulation ===');
  const customSasStart = new Date('2026-06-17T15:05:00.000Z');
  const customSasEnd = new Date('2026-06-27T19:41:00.000Z');
  const mFT = first?.sasEndTime ? new Date(first.sasEndTime) : (machine?.collectionTime ? new Date(machine.collectionTime) : null);
  const mLT = last?.sasEndTime ? new Date(last.sasEndTime) : (machine?.collectionTime ? new Date(machine.collectionTime) : null);
  console.log('machineFirstCollectionTime:', mFT?.toISOString());
  console.log('machineLastCollectionTime:', mLT?.toISOString());
  console.log('customSasStart:', customSasStart.toISOString());
  console.log('customSasEnd:', customSasEnd.toISOString());
  if (mFT && mLT) {
    const startInMiddle = customSasStart > mFT && customSasStart < mLT;
    const endInMiddle = customSasEnd > mFT && customSasEnd < mLT;
    console.log('startInMiddle:', startInMiddle);
    console.log('endInMiddle:', endInMiddle);
    console.log('BLOCKED:', startInMiddle || endInMiddle);
  } else {
    console.log('NOT BLOCKED - not enough data');
  }

  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
