
import mongoose from 'mongoose';

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('MONGODB_URI not set');
  process.exit(1);
}

async function checkCollections() {
  await mongoose.connect(mongoUri);
  console.log('Connected to DB');

  const db = mongoose.connection.db;
  const collection = db.collection('machines');

  const sample = await collection.findOne({ "collectionMetersHistory.0": { $exists: true } });
  
  if (sample) {
    console.log('Sample collection history item:', JSON.stringify(sample.collectionMetersHistory[0], null, 2));
    console.log('Type of timestamp:', typeof sample.collectionMetersHistory[0].timestamp);
    console.log('Current machine time:', new Date().toISOString());
  } else {
    console.log('No collection history found');
  }

  await mongoose.disconnect();
}

checkCollections().catch(console.error);
