
const mongoose = require('mongoose');

async function check() {
  const uri = 'mongodb://sunny1:87ydaiuhdsia2e@147.182.210.65:32017/sas-prod?authSource=admin';
  await mongoose.connect(uri);
  
  console.log('--- Meter Data Analysis ---');
  // Find meters with jackpot to see the relationship
  const meters = await mongoose.connection.collection('meters').find({ 
    'movement.jackpot': { $gt: 0 },
    'movement.totalCancelledCredits': { $gt: 0 }
   }).limit(10).toArray();

  if (meters.length === 0) {
    console.log('No meters with jackpot found.');
  } else {
    meters.forEach((m, i) => {
      const drop = m.movement.drop || 0;
      const cancelled = m.movement.totalCancelledCredits || 0;
      const jackpot = m.movement.jackpot || 0;
      const totalWon = m.movement.totalWonCredits || 0;
      
      console.log(`\nMeter ${i+1} at ${m.readAt}:`);
      console.log(`  Drop: ${drop}`);
      console.log(`  Cancelled Credits: ${cancelled}`);
      console.log(`  Jackpot: ${jackpot}`);
      console.log(`  Total Won Credits: ${totalWon}`);
      console.log(`  Sum (Cancelled+Jackpot): ${cancelled + jackpot}`);
      console.log(`  Difference (TotalWon - Cancelled): ${totalWon - cancelled}`);
      if (Math.abs(totalWon - (cancelled + jackpot)) < 0.01) {
        console.log('  OBSERVATION: movement.totalCancelledCredits EXCLUDES jackpot (Net value).');
      } else if (Math.abs(totalWon - cancelled) < 0.01) {
        console.log('  OBSERVATION: movement.totalCancelledCredits INCLUDES jackpot (Total value).');
      } else {
        console.log('  OBSERVATION: Relationship is unclear.');
      }
    });
  }

  process.exit(0);
}

check();
