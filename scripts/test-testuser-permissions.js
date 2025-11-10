require('dotenv').config();
const { MongoClient } = require('mongodb');

async function testTestUserPermissions() {
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('\n=== TESTING TESTUSER PERMISSIONS ===\n');
    
    // Get testuser
    const testUser = await db.collection('users').findOne({ username: 'testuser' });
    
    if (!testUser) {
      console.log('❌ testuser not found');
      return;
    }
    
    console.log('User:', testUser.username);
    console.log('Roles:', testUser.roles);
    console.log('Assigned Licensees:', testUser.rel?.licencee);
    console.log('Assigned Locations:', testUser.resourcePermissions?.['gaming-locations']?.resources);
    
    // Get Test-Permission-Location
    const testLocation = await db.collection('gaminglocations').findOne({ 
      name: 'Test-Permission-Location' 
    });
    
    if (!testLocation) {
      console.log('\n❌ Test-Permission-Location not found');
      return;
    }
    
    console.log('\n=== TEST LOCATION ===');
    console.log('Location ID:', testLocation._id);
    console.log('Location Name:', testLocation.name);
    console.log('Licensee:', testLocation.rel?.licencee);
    
    // Check if testuser has access
    const userLicensees = testUser.rel?.licencee || [];
    const userLocations = testUser.resourcePermissions?.['gaming-locations']?.resources || [];
    
    console.log('\n=== ACCESS CHECK ===');
    console.log('User has licensee?', userLicensees.includes(testLocation.rel?.licencee) ? '✅ YES' : '❌ NO');
    console.log('User has location?', userLocations.includes(testLocation._id) ? '✅ YES' : '❌ NO');
    
    // Check if location is in TTG licensee locations
    const ttgLocations = await db.collection('gaminglocations').find({
      'rel.licencee': '9a5db2cb29ffd2d962fd1d91',
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } }
      ]
    }).toArray();
    
    console.log('\n=== TTG LOCATIONS ===');
    console.log(`Found ${ttgLocations.length} TTG locations:`);
    ttgLocations.forEach(loc => {
      console.log(`  - ${loc.name} (${loc._id})`);
    });
    
    // Calculate intersection
    const ttgLocationIds = ttgLocations.map(l => l._id);
    const intersection = ttgLocationIds.filter(id => userLocations.includes(id));
    
    console.log('\n=== INTERSECTION RESULT ===');
    console.log('TTG Location IDs:', ttgLocationIds);
    console.log('User Location IDs:', userLocations);
    console.log('Intersection:', intersection);
    console.log('Should see Test-Permission-Location?', intersection.includes(testLocation._id) ? '✅ YES' : '❌ NO');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testTestUserPermissions().catch(console.error);

