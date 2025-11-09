require('dotenv').config();
const mongoose = require('mongoose');

async function debugTest5() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const Machine = mongoose.model('Machine', new mongoose.Schema({}, { strict: false }), 'machines');
  const Location = mongoose.model('Location', new mongoose.Schema({}, { strict: false }), 'gamingLocations');
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
  
  const machineId = '68f7ce36f5ea2df7999881aa';
  
  console.log('\n=== TEST5 MACHINE DEBUG ===\n');
  
  // Get the machine
  const machine = await Machine.findOne({ _id: machineId });
  if (!machine) {
    console.log('❌ Machine not found!');
    await mongoose.disconnect();
    return;
  }
  
  console.log('Machine Serial:', machine.serialNumber);
  console.log('Machine Location ID:', machine.gamingLocation);
  
  // Get the location
  const location = await Location.findOne({ _id: machine.gamingLocation });
  if (location) {
    console.log('\nLocation Name:', location.name);
    console.log('Location Licensee:', location.rel?.licencee);
  } else {
    console.log('❌ Location not found!');
  }
  
  // Get the user
  const user = await User.findOne({ username: 'jwallis@dynamic1group.com' });
  if (user) {
    console.log('\nUser Roles:', user.roles);
    console.log('User Licensees:', user.rel?.licencee);
    console.log('User Location Permissions:', user.resourcePermissions?.['gaming-locations']?.resources);
  }
  
  await mongoose.disconnect();
}

debugTest5().catch(console.error);

