
import mongoose from 'mongoose';

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('MONGODB_URI not set');
  process.exit(1);
}

async function checkEvents() {
  await mongoose.connect(mongoUri);
  console.log('Connected to DB');

  const db = mongoose.connection.db;
  const collection = db.collection('machineevents');

  const uniqueEventTypes = await collection.distinct('eventType');
  console.log('Unique eventType values:', uniqueEventTypes);

  const uniqueLogLevels = await collection.distinct('eventLogLevel');
  console.log('Unique eventLogLevel values:', uniqueLogLevels);

  const sampleEvents = await collection.find({}).limit(5).toArray();
  console.log('Sample events:', JSON.stringify(sampleEvents, null, 2));

  await mongoose.disconnect();
}

checkEvents().catch(console.error);
