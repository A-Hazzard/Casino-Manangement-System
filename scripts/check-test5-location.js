require('dotenv').config();
const mongoose = require('mongoose');

async function checkLocation() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const Location = mongoose.model('Location', new mongoose.Schema({}, { strict: false }), 'gamingLocations');
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
  
  const locationId = '2691c7cb97750118b3ec290e';
  
  console.log('\n=== LOCATION & USER CHECK ===\n');
  
  const location = await Location.findOne({ _id: locationId }).lean();
  if (location) {
    console.log('Location Name:', location.name);
    console.log('Location Licensee:', location.rel?.licencee);
  } else {
    console.log('❌ Location not found!');
  }
  
  // Check current user
  const user = await User.findOne({ _id: '6ec719ad799fef764d0222f0' });
  if (user) {
    console.log('\nUser:', user.username);
    console.log('User Roles:', user.roles);
    console.log('User Licensees:', user.rel?.licencee);
    console.log('User has admin role:', user.roles?.includes('admin'));
    console.log('User has developer role:', user.roles?.includes('developer'));
  }
  
  await mongoose.disconnect();
}

checkLocation().catch(console.error);

