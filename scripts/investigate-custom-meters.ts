require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const machineId = '6a0b3e15ad874aa2e816fbc5';
  const start = new Date('2025-06-16T00:00:00.000Z');
  const end = new Date('2025-06-27T23:59:59.999Z');

  console.log('=== Custom-meters query (Jun 16 → Jun 27) ===');
  console.log('machine:', machineId);
  console.log('readAt range:', start.toISOString(), '→', end.toISOString());
  console.log('');

  // Exact query the endpoint runs
  const doc = await db.collection('meters')
    .findOne(
      { machine: machineId, readAt: { $gte: start, $lte: end } },
      { sort: { readAt: -1 } }
    );

  if (doc) {
    console.log('=== FOUND DOCUMENT (exact JSON) ===');
    console.log(JSON.stringify(doc, null, 2));
    console.log('');
    console.log('top-level drop:', doc.drop);
    console.log('top-level totalCancelledCredits:', doc.totalCancelledCredits);
    console.log('movement.drop:', doc.movement?.drop);
    console.log('movement.totalCancelledCredits:', doc.movement?.totalCancelledCredits);
    console.log('readAt:', doc.readAt);
  } else {
    console.log('=== NO DOCUMENT FOUND in that range ===');
  }

  console.log('');
  console.log('=== ALL meters for this machine (all time) ===');
  const all = await db.collection('meters')
    .find({ machine: machineId })
    .sort({ readAt: 1 })
    .toArray();

  for (const m of all) {
    console.log(JSON.stringify({
      _id: m._id,
      readAt: m.readAt,
      drop: m.drop,
      totalCancelledCredits: m.totalCancelledCredits,
      movementDrop: m.movement?.drop,
      movementTotalCancelledCredits: m.movement?.totalCancelledCredits,
      meterSource: m.meterSource,
      locationSession: m.locationSession || null,
      isRamClear: m.isRamClear || false,
    }));
  }

  console.log('');
  console.log('=== Machine.sasMeters ===');
  const machine = await db.collection('machines').findOne({ _id: machineId });
  console.log(JSON.stringify(machine?.sasMeters, null, 2));

  console.log('');
  console.log('=== Machine.collectionMeters ===');
  console.log(JSON.stringify(machine?.collectionMeters, null, 2));

  await mongoose.disconnect();
})().catch((e: any) => { console.error(e); process.exit(1); });
