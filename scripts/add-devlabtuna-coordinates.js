/**
 * Add Coordinates to DevLabTuna Location
 * 
 * This script adds geoCoords (latitude and longitude) to the DevLabTuna location
 * so it can be displayed on the map.
 * 
 * Default coordinates: Port of Spain, Trinidad (10.6599, -61.5199)
 * You can modify these to the actual location coordinates.
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGO_URI;
const DB_NAME = 'sas-dev';
const LOCATION_ID = '2691c7cb97750118b3ec290e';

// Trinidad and Tobago - Port of Spain coordinates
// You can change these to the actual location coordinates
const DEFAULT_COORDINATES = {
  latitude: 10.6599,
  longitude: -61.5199,
};

async function addCoordinates() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB\n');

    const db = client.db(DB_NAME);

    // Check current location data
    const location = await db.collection('gaminglocations').findOne({
      _id: LOCATION_ID,
    });

    if (!location) {
      console.log('❌ DevLabTuna location not found!');
      return;
    }

    console.log('Current DevLabTuna Location:');
    console.log('  Name:', location.name);
    console.log('  Address:', location.address);
    console.log('  Current geoCoords:', location.geoCoords || 'NONE');

    // Add coordinates
    const result = await db.collection('gaminglocations').updateOne(
      { _id: LOCATION_ID },
      {
        $set: {
          geoCoords: DEFAULT_COORDINATES,
          updatedAt: new Date(),
        },
      }
    );

    if (result.modifiedCount > 0) {
      console.log('\n✅ Successfully added coordinates to DevLabTuna!');
      console.log('  Latitude:', DEFAULT_COORDINATES.latitude);
      console.log('  Longitude:', DEFAULT_COORDINATES.longitude);
      console.log('\n📍 Location: Port of Spain, Trinidad and Tobago');
      console.log('\nThe location should now appear on the map.');
    } else {
      console.log('\n⚠️ No changes made. Coordinates may already exist.');
    }

    // Verify the update
    const updatedLocation = await db.collection('gaminglocations').findOne({
      _id: LOCATION_ID,
    });

    console.log('\nUpdated Location:');
    console.log('  geoCoords:', updatedLocation?.geoCoords);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║   ADD COORDINATES TO DEVLABTUNA LOCATION                     ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

addCoordinates();

