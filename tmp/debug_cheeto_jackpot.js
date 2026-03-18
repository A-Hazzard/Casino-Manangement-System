const { MongoClient } = require('mongodb');
require('dotenv').config();

async function run() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    
    // Find Cheeto's location
    const location = await db.collection('gaminglocations').findOne({ name: /cheeto/i });
    if (!location) {
      console.log('Cheeto location not found');
      return;
    }
    
    console.log('Location:', JSON.stringify(location, null, 2));
    
    const licenceeId = location.rel?.licencee;
    if (licenceeId) {
      const licencee = await db.collection('licencees').findOne({ _id: licenceeId });
      console.log('Licencee of Cheeto:', JSON.stringify(licencee, null, 2));
    } else {
      console.log('No licencee assigned to Cheeto');
    }

    // Check all licencees with subtractJackpot: true
    const jackpotLicencees = await db.collection('licencees').find({ subtractJackpot: true }).toArray();
    console.log('\nLicencees with subtractJackpot true:', jackpotLicencees.map(l => l.name));

  } finally {
    await client.close();
  }
}

run().catch(console.error);
