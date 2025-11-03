/**
 * Check Country by ID
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGO_URI;
const DB_NAME = 'sas-dev';
const COUNTRY_ID = 'be622340d9d8384087937ff6';

async function checkCountry() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB\n');

    const db = client.db(DB_NAME);

    // Find country by ID
    const country = await db.collection('countries').findOne({ _id: COUNTRY_ID });

    if (country) {
      console.log('Country Details:');
      console.log(`  ID: ${country._id}`);
      console.log(`  Name: ${country.name}`);
      console.log(`  Code: ${country.code}`);
      console.log(`  Currency: ${country.currency || 'Not specified'}`);
    } else {
      console.log('Country not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkCountry();

