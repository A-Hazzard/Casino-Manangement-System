
const mongoose = require('mongoose');

async function check() {
  const uri = 'mongodb://sunny1:87ydaiuhdsia2e@147.182.210.65:32017/sas-prod?authSource=admin';
  await mongoose.connect(uri);
  const licencees = await mongoose.connection.collection('licencees').find({}).toArray();
  console.log('Licencees subtractJackpot status:');
  licencees.forEach(l => {
    console.log(`${l.name}: ${l.subtractJackpot} (${typeof l.subtractJackpot})`);
  });
  
  const locations = await mongoose.connection.collection('gaminglocations').find({ 'rel.licencee': { $exists: true } }).limit(5).toArray();
  console.log('Sample locations rel.licencee format:');
  locations.forEach(loc => {
    console.log(`${loc.name}: ${JSON.stringify(loc.rel.licencee)} (${typeof loc.rel.licencee})`);
  });
  
  process.exit(0);
}

check();
