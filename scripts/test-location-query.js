/**
 * Test MongoDB location query directly
 */

const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function testLocationQuery() {
  console.log('Testing MongoDB location query...\n');

  const mongoUri = process.env.MONGO_URI || process.env.MONGO_URI;

  if (!mongoUri) {
    console.error('MONGO_URI not found in .env file');
    return;
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db();

    const locationId = '2691c7cb97750118b3ec290e';

    console.log(`Testing different query methods for ID: ${locationId}\n`);

    // Test 1: Query with string
    console.log('Test 1: Query with string _id');
    const result1 = await db
      .collection('gaminglocations')
      .findOne({ _id: locationId });
    console.log(
      `  Result: ${result1 ? `Found "${result1.name}"` : 'NOT FOUND'}\n`
    );

    // Test 2: Query with ObjectId
    console.log('Test 2: Query with ObjectId _id');
    try {
      const result2 = await db
        .collection('gaminglocations')
        .findOne({ _id: new ObjectId(locationId) });
      console.log(
        `  Result: ${result2 ? `Found "${result2.name}"` : 'NOT FOUND'}\n`
      );
    } catch (e) {
      console.log(`  Error: ${e.message}\n`);
    }

    // Test 3: Find all locations and check _id type
    console.log('Test 3: Check actual _id types in database');
    const allLocs = await db
      .collection('gaminglocations')
      .find({})
      .limit(3)
      .toArray();

    console.log(`  Found ${allLocs.length} locations:`);
    allLocs.forEach(loc => {
      console.log(`    ID: ${loc._id} (type: ${typeof loc._id})`);
      console.log(`    Name: ${loc.name}`);
      console.log(`    Is ObjectId: ${loc._id instanceof ObjectId}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testLocationQuery();
