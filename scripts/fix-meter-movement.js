require('dotenv').config();
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  console.log('=== Current meter doc state ===');
  const meter = await db.collection('meters').findOne({ _id: '6a429bb933fb66874b31e70b' });
  console.log('Current movement:', JSON.stringify(meter.movement));
  console.log('Current top-level drop:', meter.drop);
  console.log('Current top-level TC:', meter.totalCancelledCredits);

  // Machine's collectionMeters.metersIn = 205895 (from V2 session submission)
  // Meter doc's top-level drop = 205995 (SAS reading at meter creation time)
  // Correct movement.drop should be the delta since the last collection:
  // 205995 - 205895 = 100
  // Correct movement.totalCancelledCredits should be:
  // 167900.9 - 167790.9 = 110
  
  // BUT WAIT - this is the ONLY meter doc for this machine.
  // The location page "All Time" sums movement.drop across ALL meter docs.
  // If movement.drop = 100, the location page shows $100 for "All Time".
  // But the machine's actual total drop is 205995.
  //
  // For machines with only ONE meter doc, movement.drop should equal
  // the full cumulative reading (not just the delta).
  // This way "All Time" shows the correct total.
  
  const correctMovementDrop = 205995;  // full cumulative SAS reading
  const correctMovementTC = 167900.9;  // full cumulative TC

  console.log('\n=== Fixing meter doc ===');
  console.log('Setting movement.drop:', correctMovementDrop, '(was', meter.movement.drop + ')');
  console.log('Setting movement.totalCancelledCredits:', correctMovementTC, '(was', meter.movement.totalCancelledCredits + ')');

  const result = await db.collection('meters').findOneAndUpdate(
    { _id: '6a429bb933fb66874b31e70b' },
    { $set: {
      'movement.drop': correctMovementDrop,
      'movement.totalCancelledCredits': correctMovementTC,
    }},
    { returnDocument: 'after' }
  );
  
  console.log('\n=== Updated meter doc ===');
  console.log('movement:', JSON.stringify(result.movement));

  console.log('\n=== Aggregation result after fix ===');
  const agg = await db.collection('meters').aggregate([
    { $match: { machine: '6a0b3e15ad874aa2e816fbc5', location: '6a0c677bad874aa2e8171d9f' } },
    { $group: {
      _id: '$machine',
      moneyIn: { $sum: '$movement.drop' },
      moneyOut: { $sum: '$movement.totalCancelledCredits' },
      jackpot: { $sum: '$movement.jackpot' },
      count: { $sum: 1 },
    }},
  ]).toArray();
  console.log('moneyIn:', agg[0]?.moneyIn);
  console.log('moneyOut:', agg[0]?.moneyOut);

  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
