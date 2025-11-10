require('dotenv').config();
const { MongoClient } = require('mongodb');

// Simulate getUserLocationFilter logic
async function testGetUserLocationFilter() {
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('\n=== TESTING getUserLocationFilter LOGIC ===\n');
    
    // This simulates what happens when API is called
    const licensee = '9a5db2cb29ffd2d962fd1d91'; // TTG
    
    // The API would call getUserLocationFilter(licensee)
    // Let's simulate that logic here
    
    // Step 1: Get user from token (simulated)
    const testUser = await db.collection('users').findOne({ username: 'testuser' });
    console.log('User:', testUser.username);
    console.log('Roles:', testUser.roles);
    
    // Step 2: Check if admin/developer
    const userRoles = testUser.roles || [];
    const isAdmin = userRoles.some(role => ['admin', 'developer'].includes(role));
    console.log('Is Admin/Developer?', isAdmin);
    
    if (isAdmin) {
      console.log('Result: "all" (admin has full access)');
      return;
    }
    
    // Step 3: Get user's accessible licensees
    const userAccessibleLicensees = testUser.rel?.licencee || [];
    console.log('User Accessible Licensees:', userAccessibleLicensees);
    
    // Step 4: If licensee filter provided, check if user has access
    if (licensee && licensee !== 'all') {
      if (!userAccessibleLicensees.includes(licensee)) {
        console.log('❌ User does NOT have access to this licensee');
        console.log('Result: [] (no access)');
        return;
      }
      console.log('✅ User has access to this licensee');
    }
    
    // Step 5: Get locations for the licensee(s)
    const licenseeFilter = licensee && licensee !== 'all' 
      ? licensee 
      : { $in: userAccessibleLicensees };
    
    console.log('\nQuerying locations with filter:', JSON.stringify(licenseeFilter));
    
    const locations = await db.collection('gaminglocations').find({
      'rel.licencee': licenseeFilter,
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } }
      ]
    }).toArray();
    
    console.log(`Found ${locations.length} locations:`);
    locations.forEach(loc => {
      console.log(`  - ${loc.name} (${loc._id})`);
    });
    
    const locationIds = locations.map(l => l._id);
    
    // Step 6: Check if manager
    const isManager = userRoles.includes('manager');
    console.log('\nIs Manager?', isManager);
    
    if (isManager) {
      console.log('Result:', locationIds, '(manager sees all licensee locations)');
      return locationIds;
    }
    
    // Step 7: Get user's assigned location permissions
    const userLocationPermissions = testUser.resourcePermissions?.['gaming-locations']?.resources || [];
    console.log('User Location Permissions:', userLocationPermissions);
    
    // Step 8: Calculate intersection
    const intersection = locationIds.filter(id => userLocationPermissions.includes(id));
    console.log('\nIntersection Result:', intersection);
    console.log('Result:', intersection, '(non-manager sees intersection)');
    
    return intersection;
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testGetUserLocationFilter().catch(console.error);

