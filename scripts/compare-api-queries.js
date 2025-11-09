require('dotenv').config();
const mongoose = require('mongoose');

async function compareQueries() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const Meters = mongoose.model('Meters', new mongoose.Schema({}, { strict: false }), 'meters');
  const Location = mongoose.model('Location', new mongoose.Schema({}, { strict: false }), 'gamingLocations');
  
  const machineId = '68f7ce36f5ea2df7999881aa';
  const locationId = '2691c7cb97750118b3ec290e';
  
  // Get location to get gameDayOffset
  const location = await Location.findOne({ _id: locationId }).lean();
  const gameDayOffset = location?.gameDayOffset ?? 8;
  
  console.log('\n=== COMPARING API QUERIES ===');
  console.log('Location:', location?.name);
  console.log('Gaming Day Offset:', gameDayOffset);
  
  // Calculate gaming day range for "Today" (like the APIs do)
  // Trinidad is UTC-4, so Trinidad 8 AM = 12:00 PM UTC
  const now = new Date();
  const trinidad8AM_UTC = new Date(now);
  trinidad8AM_UTC.setUTCHours(gameDayOffset + 4, 0, 0, 0); // 8 AM Trinidad = 12 PM UTC
  
  if (trinidad8AM_UTC > now) {
    trinidad8AM_UTC.setDate(trinidad8AM_UTC.getDate() - 1);
  }
  
  const nextDay8AM = new Date(trinidad8AM_UTC);
  nextDay8AM.setDate(nextDay8AM.getDate() + 1);
  
  console.log(`\nGaming Day Range:`);
  console.log(`  Start: ${trinidad8AM_UTC.toISOString()}`);
  console.log(`  End: ${nextDay8AM.toISOString()}`);
  
  // Query 1: Individual Machine API (app/api/machines/[machineId]/route.ts)
  console.log('\n--- QUERY 1: Individual Machine API ---');
  const individualPipeline = [
    {
      $match: {
        machine: machineId,
        readAt: { $gte: trinidad8AM_UTC, $lte: nextDay8AM }
      }
    },
    {
      $group: {
        _id: null,
        moneyIn: { $sum: '$movement.drop' },
        moneyOut: { $sum: '$movement.totalCancelledCredits' },
        jackpot: { $sum: '$movement.jackpot' },
        coinIn: { $last: '$coinIn' },
        coinOut: { $last: '$coinOut' },
        gamesPlayed: { $last: '$gamesPlayed' },
        gamesWon: { $last: '$gamesWon' },
        handPaidCancelledCredits: { $last: '$handPaidCancelledCredits' },
        meterCount: { $sum: 1 },
      }
    }
  ];
  
  const individualResult = await Meters.aggregate(individualPipeline);
  console.log('Result:', individualResult[0] || { moneyIn: 0 });
  
  // Query 2: Aggregation API (app/api/machines/aggregation/route.ts)
  console.log('\n--- QUERY 2: Aggregation API ---');
  const aggregationPipeline = [
    {
      $match: {
        machine: { $in: [machineId] },
        readAt: { $gte: trinidad8AM_UTC, $lte: nextDay8AM }
      }
    },
    {
      $group: {
        _id: '$machine',
        moneyIn: { $sum: '$movement.drop' },
        moneyOut: { $sum: '$movement.totalCancelledCredits' },
        jackpot: { $sum: '$movement.jackpot' },
        coinIn: { $last: '$coinIn' },
        coinOut: { $last: '$coinOut' },
        gamesPlayed: { $last: '$gamesPlayed' },
        gamesWon: { $last: '$gamesWon' },
        handPaidCancelledCredits: { $last: '$handPaidCancelledCredits' },
        meterCount: { $sum: 1 },
      }
    }
  ];
  
  const aggregationResult = await Meters.aggregate(aggregationPipeline);
  console.log('Result:', aggregationResult[0] || { moneyIn: 0 });
  
  // Show the actual meters matched
  const matchedMeters = await Meters.find({
    machine: machineId,
    readAt: { $gte: trinidad8AM_UTC, $lte: nextDay8AM }
  }).sort({ readAt: 1 }).lean();
  
  console.log(`\n✅ Matched ${matchedMeters.length} meters in gaming day range`);
  matchedMeters.forEach((m, i) => {
    console.log(`  ${i + 1}. ${new Date(m.readAt).toISOString()} - Drop: ${m.movement?.drop || 0}`);
  });
  
  await mongoose.disconnect();
}

compareQueries().catch(console.error);

