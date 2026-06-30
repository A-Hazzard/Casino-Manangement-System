require('dotenv').config();
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  console.log('=== Meters collection for ALL machines at this location ===');
  const meters = await db.collection('meters').find(
    { location: '6a0c677bad874aa2e8171d9f' }
  ).sort({ readAt: -1 }).limit(20).toArray();
  for (const m of meters) {
    console.log(JSON.stringify({
      _id: m._id,
      machine: m.machine,
      readAt: m.readAt,
      locationSession: m.locationSession,
      movementDrop: m.movement?.drop,
      movementTC: m.movement?.totalCancelledCredits,
      topDrop: m.drop,
      topTC: m.totalCancelledCredits,
    }));
  }

  console.log('\n=== Meters with locationSession for this machine ===');
  const v2meters = await db.collection('meters').find({
    machine: '6a0b3e15ad874aa2e816fbc5',
    locationSession: { $exists: true }
  }).toArray();
  console.log('Count:', v2meters.length);
  for (const m of v2meters) {
    console.log(JSON.stringify(m));
  }

  console.log('\n=== V1 meters (no locationSession) for this machine ===');
  const v1meters = await db.collection('meters').find({
    machine: '6a0b3e15ad874aa2e816fbc5',
    locationSession: { $exists: false }
  }).toArray();
  console.log('Count:', v1meters.length);
  for (const m of v1meters) {
    console.log(JSON.stringify({
      _id: m._id,
      readAt: m.readAt,
      createdAt: m.createdAt,
      movement: m.movement,
      drop: m.drop,
      totalCancelledCredits: m.totalCancelledCredits,
      coinIn: m.coinIn,
      coinOut: m.coinOut,
    }));
  }

  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
