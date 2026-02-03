const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function checkNotifications() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const Notification = mongoose.model('VaultNotification', new mongoose.Schema({}, { strict: false }), 'vaultNotifications');
  
  const allNotifications = await Notification.find({}).sort({ createdAt: -1 }).limit(10);
  console.log('Last 10 Notifications:', JSON.stringify(allNotifications, null, 2));

  await mongoose.disconnect();
}

checkNotifications().catch(console.error);
