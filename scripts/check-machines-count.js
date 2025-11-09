require('dotenv').config();
const mongoose = require('mongoose');

async function checkMachines() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const Machine = mongoose.model('Machine', new mongoose.Schema({}, { strict: false }), 'machines');
  
  const total = await Machine.countDocuments();
  console.log('\n=== MACHINES COUNT ===');
  console.log('Total machines:', total);
  
  if (total > 0) {
    const sample = await Machine.find({}).limit(5).select('_id serialNumber gamingLocation');
    console.log('\nSample machines:');
    sample.forEach(m => {
      console.log(`  ${m._id} - ${m.serialNumber} (Location: ${m.gamingLocation})`);
    });
  }
  
  await mongoose.disconnect();
}

checkMachines().catch(console.error);

