const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

async function createDummyNotification() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const Notification = mongoose.model('VaultNotification', new mongoose.Schema({}, { strict: false }), 'vaultNotifications');
  
  const locationId = 'd0f0a2b09b1c3d890bb1d34a';
  const adminId = '679800e93898150e7b925b44'; // Guessed or from check_admin
  
  const notification = await Notification.create({
    locationId,
    type: 'system_alert',
    recipientId: adminId,
    recipientRole: 'vault-manager',
    title: 'Test Notification',
    message: 'This is a test notification created at ' + new Date().toISOString(),
    urgent: true,
    relatedEntityType: 'vault_shift',
    relatedEntityId: 'test-id',
    status: 'unread',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  console.log('Created Notification:', JSON.stringify(notification, null, 2));

  await mongoose.disconnect();
}

createDummyNotification().catch(console.error);
