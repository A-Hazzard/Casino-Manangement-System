const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function checkUser() {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = mongoose.model('User', new mongoose.Schema({
    username: String,
    assignedLocations: [String],
    roles: [String]
  }));

  const user = await User.findOne({ username: 'admin' });
  console.log('Admin User:', JSON.stringify(user, null, 2));

  const Notification = mongoose.model('VaultNotification', new mongoose.Schema({}, { strict: false }), 'vaultNotifications');
  const notifications = await Notification.find({ status: 'unread' });
  console.log('Unread Notifications:', JSON.stringify(notifications, null, 2));

  await mongoose.disconnect();
}

checkUser().catch(console.error);
