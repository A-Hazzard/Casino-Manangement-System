require('dotenv').config();
const mongoose = require('mongoose');

async function checkUserRole() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  
  // First, let's find any user to see what's in the database
  console.log('\n=== CHECKING USERS IN DATABASE ===');
  const allUsers = await User.find({}).limit(5).select('email username roles');
  console.log('Found users:', allUsers.length);
  allUsers.forEach((u, i) => {
    console.log(`\nUser ${i + 1}:`);
    console.log('  Email:', u.email);
    console.log('  Username:', u.username);
    console.log('  Roles:', u.roles);
  });
  
  // Try to find the specific user by email or username
  let user = await User.findOne({ 
    $or: [
      { email: 'aaronhazzard2018@gmail.com' },
      { username: 'aaronhazzard2018@gmail.com' }
    ]
  });
  
  if (!user) {
    console.log('\n⚠️ User not found with email aaronhazzard2018@gmail.com');
    console.log('Checking all users...');
    await mongoose.disconnect();
    return;
  }
  
  console.log('\n=== CURRENT USER ROLE CHECK ===');
  console.log('Email:', user.email);
  console.log('Username:', user.username);
  console.log('Roles:', user.roles);
  console.log('First role (roles[0]):', user.roles?.[0]);
  console.log('\n=== SMIB ACCESS CHECK ===');
  const allowedRoles = ['technician', 'manager', 'admin', 'developer'];
  const hasAccess = user.roles && user.roles.length > 0 && allowedRoles.includes(user.roles[0]);
  console.log(`Has SMIB access (checking roles[0] only): ${hasAccess}`);
  
  const hasAccessAnyRole = user.roles && user.roles.some(role => allowedRoles.includes(role));
  console.log(`Has SMIB access (checking all roles): ${hasAccessAnyRole}`);
  
  await mongoose.disconnect();
}

checkUserRole().catch(console.error);

