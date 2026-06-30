require('dotenv').config();
const mongoose = require('mongoose');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  console.log('=== Full meter doc for machine ===');
  const meter = await db.collection('meters').findOne({ machine: '6a0b3e15ad874aa2e816fbc5' });
  if (meter) {
    console.log(JSON.stringify(meter, null, 2));
  } else {
    console.log('NO meter doc found!');
  }

  console.log('\n=== Check if movement fields exist ===');
  if (meter) {
    console.log('top-level drop:', meter.drop);
    console.log('top-level totalCancelledCredits:', meter.totalCancelledCredits);
    console.log('movement:', JSON.stringify(meter.movement));
    console.log('movement?.drop:', meter.movement?.drop);
    console.log('movement?.totalCancelledCredits:', meter.movement?.totalCancelledCredits);
    console.log('location:', meter.location);
    console.log('readAt:', meter.readAt);
  }

  console.log('\n=== What the aggregation would return ===');
  const result = await db.collection('meters').aggregate([
    { $match: { machine: '6a0b3e15ad874aa2e816fbc5' } },
    { $group: {
      _id: '$machine',
      moneyIn: { $sum: '$movement.drop' },
      moneyOut: { $sum: '$movement.totalCancelledCredits' },
      jackpot: { $sum: '$movement.jackpot' },
    }},
  ]).toArray();
  console.log('Aggregation result:', JSON.stringify(result));

  console.log('\n=== What the "All Time" range query would return ===');
  const resultAllTime = await db.collection('meters').aggregate([
    { $match: { 
      machine: '6a0b3e15ad874aa2e816fbc5',
      location: '6a0c677bad874aa2e8171d9f',
    } },
    { $group: {
      _id: '$machine',
      moneyIn: { $sum: '$movement.drop' },
      moneyOut: { $sum: '$movement.totalCancelledCredits' },
      jackpot: { $sum: '$movement.jackpot' },
      count: { $sum: 1 },
    }},
  ]).toArray();
  console.log('All Time result:', JSON.stringify(resultAllTime));

  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
