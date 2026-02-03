const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function checkNotifications() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const Notification = mongoose.model('VaultNotification', new mongoose.Schema({}, { strict: false }), 'vaultNotifications');
  
  const locationId = 'd0f0a2b09b1c3d890bb1d34a';
  
  const unreadCount = await Notification.countDocuments({ 
    locationId, 
    status: 'unread' 
  });
  
  const notifications = await Notification.find({ 
    locationId, 
    status: 'unread' 
  }).sort({ createdAt: -1 });

  console.log(`Unread Notifications for location ${locationId}:`, unreadCount);
  console.log(JSON.stringify(notifications, null, 2));

  await mongoose.disconnect();
}

checkNotifications().catch(console.error);
