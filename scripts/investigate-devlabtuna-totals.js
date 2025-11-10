require('dotenv').config();
const mongoose = require('mongoose');

async function investigateDevLabTuna() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  console.log('\n=== DEVLABTUNA INVESTIGATION ===\n');

  // Find DevLabTuna location
  const location = await db
    .collection('gamingLocations')
    .findOne({ name: /DevLabTuna/i });

  if (!location) {
    console.log('❌ DevLabTuna location not found!');
    await mongoose.disconnect();
    return;
  }

  console.log('✅ Location found:');
  console.log('  _id:', location._id);
  console.log('  Name:', location.name);
  console.log('  Licensee:', location.rel?.licencee);
  console.log('  Gaming Day Offset:', location.gameDayOffset);

  // Find licensee to get currency
  const licensee = await db
    .collection('licencees')
    .findOne({ _id: location.rel?.licencee });
  console.log('\n📊 Licensee:', licensee?.name, '(Currency: TTD)');

  // Find all machines at this location
  const machines = await db
    .collection('machines')
    .find({
      gamingLocation: String(location._id),
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    })
    .toArray();

  console.log(`\n🎰 Machines at DevLabTuna: ${machines.length}`);
  machines.forEach(m => {
    console.log(`  - ${m.serialNumber} (${m._id})`);
  });

  // Calculate gaming day range for TODAY (8 AM offset)
  const now = new Date();
  const trinidad8AM_UTC = new Date(now);
  trinidad8AM_UTC.setUTCHours(12, 0, 0, 0); // 8 AM Trinidad = 12 PM UTC

  if (trinidad8AM_UTC > now) {
    trinidad8AM_UTC.setDate(trinidad8AM_UTC.getDate() - 1);
  }

  const nextDay8AM = new Date(trinidad8AM_UTC);
  nextDay8AM.setDate(nextDay8AM.getDate() + 1);

  console.log(`\n📅 Gaming Day Range (Today, 8 AM offset):`);
  console.log(`  Start: ${trinidad8AM_UTC.toISOString()}`);
  console.log(`  End: ${nextDay8AM.toISOString()}`);

  // Query meters for all machines at this location for TODAY
  const machineIds = machines.map(m => String(m._id));

  const todayMeters = await db
    .collection('meters')
    .aggregate([
      {
        $match: {
          machine: { $in: machineIds },
          readAt: { $gte: trinidad8AM_UTC, $lte: nextDay8AM },
        },
      },
      {
        $group: {
          _id: null,
          totalMoneyIn: { $sum: '$movement.drop' },
          totalMoneyOut: { $sum: '$movement.totalCancelledCredits' },
          totalJackpot: { $sum: '$movement.jackpot' },
          meterCount: { $sum: 1 },
        },
      },
    ])
    .toArray();

  const totals = todayMeters[0] || {
    totalMoneyIn: 0,
    totalMoneyOut: 0,
    totalJackpot: 0,
    meterCount: 0,
  };
  const gross = totals.totalMoneyIn - totals.totalMoneyOut;

  console.log(`\n💰 DevLabTuna Totals (TODAY, native TTD):`);
  console.log(`  Money In: ${totals.totalMoneyIn} TTD`);
  console.log(`  Money Out: ${totals.totalMoneyOut} TTD`);
  console.log(`  Gross: ${gross} TTD`);
  console.log(`  Meters counted: ${totals.meterCount}`);

  // Break down by machine
  console.log(`\n🔍 Per-Machine Breakdown:`);
  for (const machine of machines) {
    const machineMeters = await db
      .collection('meters')
      .aggregate([
        {
          $match: {
            machine: String(machine._id),
            readAt: { $gte: trinidad8AM_UTC, $lte: nextDay8AM },
          },
        },
        {
          $group: {
            _id: null,
            moneyIn: { $sum: '$movement.drop' },
            moneyOut: { $sum: '$movement.totalCancelledCredits' },
            meterCount: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const machineTotals = machineMeters[0] || {
      moneyIn: 0,
      moneyOut: 0,
      meterCount: 0,
    };
    if (machineTotals.meterCount > 0) {
      console.log(
        `  ${machine.serialNumber}: Money In = ${machineTotals.moneyIn} TTD, Money Out = ${machineTotals.moneyOut} TTD (${machineTotals.meterCount} meters)`
      );
    }
  }

  console.log(`\n✅ EXPECTED VALUES FOR MANAGER (TTG):`);
  console.log(`  DevLabTuna Money In: ${totals.totalMoneyIn} TTD`);
  console.log(`  DevLabTuna Gross: ${gross} TTD`);

  console.log(`\n❌ WRONG IF SEEING:`);
  console.log(`  127.87 USD (this would be some converted/wrong value)`);
  console.log(`  20.74 USD (this is 140 TTD / 6.75)`);

  await mongoose.disconnect();
}

investigateDevLabTuna().catch(console.error);
