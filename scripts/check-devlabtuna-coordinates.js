/**
 * Check DevLabTuna Coordinates
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGO_URI;
const DB_NAME = 'sas-dev';
const LOCATION_ID = '2691c7cb97750118b3ec290e';

async function checkCoordinates() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB\n');

    const db = client.db(DB_NAME);

    // Find DevLabTuna location
    const location = await db.collection('gaminglocations').findOne({
      _id: LOCATION_ID,
    });

    if (location) {
      console.log('DevLabTuna Location Details:');
      console.log('  ID:', location._id);
      console.log('  Name:', location.name);
      console.log('  Address:', location.address || 'N/A');
      console.log('  Latitude:', location.latitude || 'MISSING');
      console.log('  Longitude:', location.longitude || 'MISSING');
      console.log('  Coordinates:', location.coordinates || 'MISSING');
      console.log('  Location:', location.location || 'MISSING');
      console.log('  geoCoords:', JSON.stringify(location.geoCoords) || 'MISSING');
      console.log('\n  Full location object keys:', Object.keys(location));
      
      // Check geoCoords specifically
      if (location.geoCoords) {
        console.log('\n  geoCoords Details:');
        console.log('    latitude:', location.geoCoords.latitude);
        console.log('    longitude:', location.geoCoords.longitude);
        console.log('    latitude type:', typeof location.geoCoords.latitude);
        console.log('    longitude type:', typeof location.geoCoords.longitude);
        console.log('    latitude === 0:', location.geoCoords.latitude === 0);
        console.log('    longitude === 0:', location.geoCoords.longitude === 0);
        console.log('    latitude is NaN:', Number.isNaN(location.geoCoords.latitude));
        console.log('    longitude is NaN:', Number.isNaN(location.geoCoords.longitude));
      }
      
      // Check all possible coordinate field names
      const coordFields = [
        'latitude',
        'longitude',
        'lat',
        'lng',
        'coordinates',
        'location',
        'position',
        'geoLocation',
      ];
      
      console.log('\n  Checking other coordinate fields:');
      coordFields.forEach(field => {
        if (location[field] !== undefined) {
          console.log(`    ${field}:`, location[field]);
        }
      });
    } else {
      console.log('DevLabTuna location not found!');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkCoordinates();

