require('dotenv').config();
const mongoose = require('mongoose');

async function findDevLabTuna() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const Location = mongoose.model('Location', new mongoose.Schema({}, { strict: false }), 'gamingLocations');
  const Machine = mongoose.model('Machine', new mongoose.Schema({}, { strict: false }), 'machines');
  
  console.log('\n=== FINDING DEVLABTUNA ===\n');
  
  // Find location by name
  const location = await Location.findOne({ name: /DevLabTuna/i }).lean();
  
  if (location) {
    console.log('✅ Found Location!');
    console.log('Location _id:', location._id);
    console.log('Location _id type:', typeof location._id);
    console.log('Location Name:', location.name);
    console.log('Location Licensee:', location.rel?.licencee);
    console.log('Location Gaming Day Offset:', location.gameDayOffset);
    
    // Find all machines at this location
    const machines = await Machine.find({ gamingLocation: String(location._id) }).limit(10).lean();
    console.log(`\nMachines at this location: ${machines.length}`);
    machines.forEach(m => {
      console.log(`  - ${m.serialNumber} (${m._id})`);
    });
  } else {
    console.log('❌ DevLabTuna location not found!');
    
    // Show all locations
    const allLocations = await Location.find({}).limit(10).select('_id name').lean();
    console.log('\nFirst 10 locations:');
    allLocations.forEach(loc => {
      console.log(`  ${loc._id} - ${loc.name}`);
    });
  }
  
  await mongoose.disconnect();
}

findDevLabTuna().catch(console.error);

