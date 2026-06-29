require('dotenv').config();
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const machineId = '6a0b3e15ad874aa2e816fbc5';

  console.log('=== ALL meter docs for this machine (sorted by readAt) ===');
  const allMeters = await db.collection('meters')
    .find({ machine: machineId })
    .sort({ readAt: 1 })
    .toArray();
  console.log('Total meter docs:', allMeters.length);
  for (const m of allMeters) {
    console.log(JSON.stringify({
      _id: m._id,
      readAt: m.readAt,
      drop: m.drop,
      totalCancelledCredits: m.totalCancelledCredits,
      locationSession: m.locationSession,
      isRamClear: m.isRamClear,
      meterSource: m.meterSource,
    }));
  }

  console.log('\n=== Latest V2 submitted session ===');
  const latestV2 = await db.collection('reportedmachines')
    .find({ machineId, sessionStatus: 'submitted' })
    .sort({ createdAt: -1 })
    .limit(1)
    .toArray();
  if (latestV2.length > 0) {
    const s = latestV2[0];
    console.log('Session:', s.sessionId);
    console.log('sasStartTime:', s.sasStartTime);
    console.log('sasEndTime:', s.sasEndTime);
    console.log('sasMetersIn:', s.sasMetersIn);
    console.log('sasMetersOut:', s.sasMetersOut);
    console.log('prevSasMetersIn:', s.prevSasMetersIn);
    console.log('prevSasMetersOut:', s.prevSasMetersOut);
    console.log('locationName:', s.locationName);
  }

  console.log('\n=== Machine relay info ===');
  const machine = await db.collection('machines').findOne({ _id: machineId }, {
    projection: { relayId: 1, sasMeters: 1, lastActivity: 1, collectionMeters: 1, name: 1, serialNumber: 1, custom: 1, gamingLocation: 1 }
  });
  console.log('relayId:', machine?.relayId);
  console.log('sasMeters:', machine?.sasMeters);
  console.log('lastActivity:', machine?.lastActivity);
  console.log('collectionMeters:', machine?.collectionMeters);
  console.log('location:', machine?.gamingLocation);

  console.log('\n=== ALL meter docs across ALL machines at this location (last 10) ===');
  const locationId = machine?.gamingLocation;
  if (locationId) {
    const locationMachines = await db.collection('machines').find({ gamingLocation: locationId }, { projection: { _id: 1 } }).toArray();
    const locMachineIds = locationMachines.map(m => m._id);
    const recentLocMeters = await db.collection('meters')
      .find({ machine: { $in: locMachineIds } })
      .sort({ readAt: -1 })
      .limit(10)
      .toArray();
    for (const m of recentLocMeters) {
      console.log(JSON.stringify({
        machine: m.machine,
        readAt: m.readAt,
        drop: m.drop,
        totalCancelledCredits: m.totalCancelledCredits,
        locationSession: m.locationSession,
      }));
    }
  }

  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
