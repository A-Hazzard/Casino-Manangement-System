const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
dotenv.config({ path: '.env.local' });

async function debugNotifications() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const Notification = mongoose.model('VaultNotification', new mongoose.Schema({}, { strict: false }), 'vaultNotifications');
  
  const unread = await Notification.find({ status: 'unread' }).lean();
  let output = '--- Unread Notifications ---\n';
  unread.forEach(n => {
    output += `ID: ${n._id}, Type: ${n.type}, Loc: ${n.locationId}, Role: ${n.recipientRole}, User: ${n.recipientId}, Title: ${n.title}\n`;
  });
  
  const total = await Notification.countDocuments();
  output += `Total notifications in DB: ${total}\n`;

  fs.writeFileSync('notif_debug_output.txt', output);
  console.log('Output written to notif_debug_output.txt');

  await mongoose.disconnect();
}

debugNotifications().catch(console.error);
