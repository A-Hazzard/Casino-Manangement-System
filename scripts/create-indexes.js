const { MongoClient } = require('mongodb');

// Database connection string - update this with your actual connection string
const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/your-database';

async function createIndexes() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    // Create indexes for better performance
    
    // Meters collection indexes
    console.log('Creating meters collection indexes...');
    await db.collection('meters').createIndex({ location: 1 });
    await db.collection('meters').createIndex({ createdAt: 1 });
    await db.collection('meters').createIndex({ location: 1, createdAt: 1 });
    
    // Machines collection indexes
    console.log('Creating machines collection indexes...');
    await db.collection('machines').createIndex({ gamingLocation: 1 });
    await db.collection('machines').createIndex({ deletedAt: 1 });
    await db.collection('machines').createIndex({ lastActivity: 1 });
    await db.collection('machines').createIndex({ gamingLocation: 1, deletedAt: 1 });
    await db.collection('machines').createIndex({ isSasMachine: 1 });
    
    // Gaming locations collection indexes
    console.log('Creating gaminglocations collection indexes...');
    await db.collection('gaminglocations').createIndex({ deletedAt: 1 });
    await db.collection('gaminglocations').createIndex({ 'rel.licencee': 1 });
    await db.collection('gaminglocations').createIndex({ 'rel.licencee': 1, deletedAt: 1 });
    await db.collection('gaminglocations').createIndex({ name: 1 });
    
    console.log('All indexes created successfully!');
    
  } catch (error) {
    console.error('Error creating indexes:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
createIndexes().catch(console.error);
