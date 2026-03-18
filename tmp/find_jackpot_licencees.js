const { MongoClient } = require('mongodb');
require('dotenv').config();

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found in .env');
    process.exit(1);
  }
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    
    const licencees = await db.collection('licencees').find({ subtractJackpot: true }).toArray();
    console.log('Licencees with subtractJackpot: true');
    console.log(JSON.stringify(licencees, null, 2));
    
    const licencees_with_yes = await db.collection('licencees').find({ subtractJackpot: "true" }).toArray();
    console.log('\nLicencees with subtractJackpot: "true" (string)');
    console.log(JSON.stringify(licencees_with_yes, null, 2));

  } finally {
    await client.close();
  }
}

run().catch(console.error);
