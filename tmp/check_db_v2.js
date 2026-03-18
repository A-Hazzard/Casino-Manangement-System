
const mongoose = require('mongoose');

async function check() {
  const uri = 'mongodb://sunny1:87ydaiuhdsia2e@147.182.210.65:32017/sas-prod?authSource=admin';
  await mongoose.connect(uri);
  
  console.log('--- Licensees ---');
  const licencees = await mongoose.connection.collection('licencees').find({}).toArray();
  licencees.forEach(l => {
    console.log(`${l.name} (${l._id}): subtractJackpot=${l.subtractJackpot}`);
  });
  
  console.log('\n--- Locations with Licensee ---');
  const locations = await mongoose.connection.collection('gaminglocations').find({ 'rel.licencee': { $exists: true, $ne: null } }).limit(5).toArray();
  locations.forEach(loc => {
    console.log(`${loc.name} (${loc._id}): rel.licencee=${JSON.stringify(loc.rel.licencee)}`);
  });
  
  if (locations.length > 0) {
    const locId = locations[0]._id;
    console.log(`\n--- Sample Meters for Location ${locId} ---`);
    const meters = await mongoose.connection.collection('meters').find({ location: String(locId), 'movement.jackpot': { $gt: 0 } }).limit(3).toArray();
    meters.forEach(m => {
      console.log(`Meter at ${m.readAt}: drop=${m.movement.drop}, cancelled=${m.movement.totalCancelledCredits}, jackpot=${m.movement.jackpot}`);
    });
  }

  process.exit(0);
}

check();
