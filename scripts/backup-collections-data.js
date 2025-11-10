require('dotenv').config({ path: '../.env' });
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('🔄 Starting backup process...');
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, 'backups', timestamp);
    
    // Create backup directory
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    console.log(`📁 Backup directory: ${backupDir}`);
    
    // Backup collections
    const collectionsToBackup = ['collections', 'machines', 'collectionreports'];
    
    for (const collectionName of collectionsToBackup) {
      console.log(`\n📦 Backing up ${collectionName}...`);
      
      const collection = db.collection(collectionName);
      const data = await collection.find({}).toArray();
      
      const filePath = path.join(backupDir, `${collectionName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      
      console.log(`✅ Backed up ${data.length} documents to ${collectionName}.json`);
    }
    
    // Create backup manifest
    const manifest = {
      timestamp: new Date().toISOString(),
      collections: collectionsToBackup,
      counts: {},
    };
    
    for (const collectionName of collectionsToBackup) {
      const count = await db.collection(collectionName).countDocuments({});
      manifest.counts[collectionName] = count;
    }
    
    fs.writeFileSync(
      path.join(backupDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2)
    );
    
    console.log('\n✅ Backup completed successfully!');
    console.log(`📊 Backup Summary:`);
    console.log(JSON.stringify(manifest.counts, null, 2));
    console.log(`\n📁 Backup location: ${backupDir}`);
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
})();

