require('dotenv').config();
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  console.log('=== Machine collectionMetersHistory for this V2 session ===');
  const machine = await db.collection('machines').findOne(
    { _id: '6a0b3e15ad874aa2e816fbc5' },
    { collectionMetersHistory: 1, collectionMeters: 1, sasMeters: 1 }
  );
  if (machine) {
    const v2History = machine.collectionMetersHistory?.filter(
      h => h.locationReportId === '6a42c07ab521fbb2b6ca1309'
    );
    console.log('V2 session history entries:', JSON.stringify(v2History, null, 2));
    console.log('machine.collectionMeters:', JSON.stringify(machine.collectionMeters));
    console.log('machine.sasMeters:', JSON.stringify(machine.sasMeters));
  }

  console.log('\n=== Meter doc full fields ===');
  const meter = await db.collection('meters').findOne({ _id: '6a429bb933fb66874b31e70b' });
  if (meter) {
    console.log('locationSession:', meter.locationSession);
    console.log('isRamClear:', meter.isRamClear);
    console.log('meterSource:', meter.meterSource);
    console.log('movement:', JSON.stringify(meter.movement));
    console.log('top-level drop:', meter.drop);
  }

  console.log('\n=== ReportedMachine for this session+machine ===');
  const rm = await db.collection('reportedmachines').findOne({
    machineId: '6a0b3e15ad874aa2e816fbc5',
    sessionId: '6a42c07ab521fbb2b6ca1309'
  });
  if (rm) {
    console.log('manualMetersIn:', rm.manualMetersIn);
    console.log('sasMetersIn:', rm.sasMetersIn);
    console.log('prevSasMetersIn:', rm.prevSasMetersIn);
    console.log('manualMetersOut:', rm.manualMetersOut);
    console.log('sasMetersOut:', rm.sasMetersOut);
    console.log('prevSasMetersOut:', rm.prevSasMetersOut);
    console.log('metersMatch:', rm.metersMatch);
  }

  console.log('\n=== When was this meter doc created vs machine lastActivity ===');
  if (meter) {
    console.log('meter createdAt:', meter.createdAt);
    console.log('meter readAt:', meter.readAt);
  }

  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
