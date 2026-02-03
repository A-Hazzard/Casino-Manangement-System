const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function debugNotifications() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const Notification = mongoose.model('VaultNotification', new mongoose.Schema({}, { strict: false }), 'vaultNotifications');
  
  const unread = await Notification.find({ status: 'unread' }).lean();
  console.log('--- Unread Notifications ---');
  unread.forEach(n => {
    console.log(`ID: ${n._id}, Type: ${n.type}, Loc: ${n.locationId}, Role: ${n.recipientRole}, User: ${n.recipientId}, Title: ${n.title}`);
  });
  
  const total = await Notification.countDocuments();
  console.log('Total notifications in DB:', total);

  await mongoose.disconnect();
}

debugNotifications().catch(console.error);
