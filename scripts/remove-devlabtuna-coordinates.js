/**
 * Remove Coordinates from DevLabTuna Location
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGO_URI;
const DB_NAME = 'sas-dev';
const LOCATION_ID = '2691c7cb97750118b3ec290e';

async function removeCoordinates() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB\n');

    const db = client.db(DB_NAME);

    // Remove geoCoords field
    const result = await db.collection('gaminglocations').updateOne(
      { _id: LOCATION_ID },
      {
        $unset: { geoCoords: '' },
        $set: { updatedAt: new Date() },
      }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ Successfully removed coordinates from DevLabTuna!');
      console.log('\nThe location will no longer appear on the map.');
      console.log('Edit modal will now show empty coordinate fields.');
    } else {
      console.log('⚠️ No changes made.');
    }

    // Verify
    const location = await db.collection('gaminglocations').findOne({
      _id: LOCATION_ID,
    });

    console.log('\nVerification:');
    console.log('  geoCoords:', location?.geoCoords || 'REMOVED');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║   REMOVE COORDINATES FROM DEVLABTUNA                         ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

removeCoordinates();

