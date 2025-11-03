/**
 * Find Locations with Machines
 */

const { MongoClient } = require('mongodb');

require('dotenv').config();
const MONGODB_URI = process.env.MONGO_URI;
const DB_NAME = 'sas-dev';

async function findLocationsWithMachines() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB\n');

    const db = client.db(DB_NAME);

    // Find all locations
    const locations = await db
      .collection('gaminglocations')
      .find({})
      .project({ _id: 1, name: 1, 'rel.licencee': 1, country: 1 })
      .toArray();

    console.log(`Found ${locations.length} locations\n`);

    // For each location, count machines
    for (const location of locations) {
      const machineCount = await db
        .collection('machines')
        .countDocuments({ gamingLocation: location._id });

      if (machineCount > 0) {
        console.log(`${location.name}:`);
        console.log(`  ID: ${location._id}`);
        console.log(`  Licensee: ${location.rel?.licencee || 'None'}`);
        console.log(`  Country: ${location.country || 'None'}`);
        console.log(`  Machines: ${machineCount}\n`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

findLocationsWithMachines();
