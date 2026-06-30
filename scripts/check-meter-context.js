require('dotenv').config();
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  console.log('=== All meter docs for this machine (sorted by readAt) ===');
  const meters = await db.collection('meters').find(
    { machine: '6a0b3e15ad874aa2e816fbc5' }
  ).sort({ readAt: 1 }).toArray();
  for (const m of meters) {
    console.log(JSON.stringify({
      _id: m._id,
      readAt: m.readAt,
      createdAt: m.createdAt,
      locationSession: m.locationSession,
      isRamClear: m.isRamClear,
      meterSource: m.meterSource,
      movement: m.movement,
      drop: m.drop,
      totalCancelledCredits: m.totalCancelledCredits,
    }));
  }

  console.log('\n=== Machine relay status ===');
  const machine = await db.collection('machines').findOne(
    { _id: '6a0b3e15ad874aa2e816fbc5' },
    { relayId: 1, lastActivity: 1, sasMeters: 1, gamingLocation: 1 }
  );
  console.log('relayId:', machine?.relayId);
  console.log('lastActivity:', machine?.lastActivity);
  console.log('gamingLocation:', machine?.gamingLocation);
  console.log('sasMeters:', JSON.stringify(machine?.sasMeters));

  console.log('\n=== V1 reports for this location around Jun 29 ===');
  const reports = await db.collection('collectionreports').find({
    'locationMetrics.locationId': '6a0c677bad874aa2e8171d9f',
    gamingDay: { $gte: '2026-06-28', $lte: '2026-06-30' }
  }).toArray();
  for (const r of reports) {
    console.log(JSON.stringify({
      _id: r._id,
      gamingDay: r.gamingDay,
      reportVersion: r.reportVersion,
      isEditing: r.isEditing,
    }));
  }

  console.log('\n=== All V1 reports for this location ===');
  const allReports = await db.collection('collectionreports').find({
    'locationMetrics.locationId': '6a0c677bad874aa2e8171d9f',
  }).sort({ createdAt: 1 }).toArray();
  for (const r of allReports) {
    console.log(JSON.stringify({
      _id: r._id,
      gamingDay: r.gamingDay,
      reportVersion: r.reportVersion,
      isEditing: r.isEditing,
    }));
  }

  console.log('\n=== All V2 sessions for this location ===');
  const sessions = await db.collection('reportedmachines').aggregate([
    { $match: { locationId: '6a0c677bad874aa2e8171d9f' } },
    { $group: {
      _id: '$sessionId',
      machineCount: { $sum: 1 },
      sessionStatus: { $first: '$sessionStatus' },
      createdAt: { $first: '$createdAt' },
    }},
    { $sort: { createdAt: -1 } },
  ]).toArray();
  for (const s of sessions) {
    console.log(JSON.stringify(s));
  }

  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
