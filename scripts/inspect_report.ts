import mongoose from 'mongoose';

const MONGODB_URI =
  'mongodb://sunny1:87ydaiuhdsia2e@147.182.133.136:27017/sas-aaron?authSource=admin';

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB');

  const collections = await mongoose.connection.db.listCollections().toArray();
  const searchId = '69e9108e0d63319f20cafc93';

  console.log('Searching for text occurrences of ID:', searchId);

  for (const collInfo of collections) {
    const collName = collInfo.name;
    const items = await mongoose.connection.db
      .collection(collName)
      .find({})
      .toArray();
    for (const item of items) {
      const itemStr = JSON.stringify(item);
      if (itemStr.includes(searchId)) {
        console.log(`Found in collection: ${collName}`);
        console.log('Doc:', JSON.stringify(item, null, 2));
      }
    }
  }

  await mongoose.disconnect();
}

main();
