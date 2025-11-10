require('dotenv').config();
const { MongoClient } = require('mongodb');

async function checkCollections() {
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('\n=== DATABASE COLLECTIONS ===\n');
    
    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collections:`);
    collections.forEach(c => {
      console.log(`  - ${c.name}`);
    });
    
    // Check for location-related collections
    console.log('\n=== LOCATION-RELATED COLLECTIONS ===\n');
    const locationCollections = collections.filter(c => 
      c.name.toLowerCase().includes('location') || 
      c.name.toLowerCase().includes('gaming')
    );
    
    for (const col of locationCollections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`${col.name}: ${count} documents`);
      
      if (count > 0 && count < 20) {
        const sample = await db.collection(col.name).find({}).limit(5).toArray();
        console.log('  Sample documents:');
        sample.forEach(doc => {
          console.log(`    - ${doc.name || doc._id} (${doc._id})`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkCollections().catch(console.error);

