const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function checkAdminUser() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
  const user = await User.findOne({ username: 'admin' });
  
  if (user) {
    console.log('Admin User:', JSON.stringify({
      _id: user._id,
      username: user.username,
      assignedLocations: user.assignedLocations,
      roles: user.roles
    }, null, 2));
  } else {
    console.log('Admin user not found');
  }

  await mongoose.disconnect();
}

checkAdminUser().catch(console.error);
