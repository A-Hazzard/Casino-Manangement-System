require('dotenv').config();
const { MongoClient } = require('mongodb');

const TTG_LICENSEE_ID = '9a5db2cb29ffd2d962fd1d91';
const TEST_USER_ID = '690ff137102fe0d1dc7a5079';

async function testAPI() {
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('\n=== SIMULATING API QUERY ===\n');
    
    // Get testuser
    const testUser = await db.collection('users').findOne({ _id: TEST_USER_ID });
    console.log('User:', testUser.username);
    console.log('Roles:', testUser.roles);
    console.log('Licensees:', testUser.rel?.licencee);
    console.log('Assigned Locations:', testUser.resourcePermissions?.['gaming-locations']?.resources);
    
    // Simulate getUserLocationFilter logic
    const userLicensees = testUser.rel?.licencee || [];
    const userLocationPermissions = testUser.resourcePermissions?.['gaming-locations']?.resources || [];
    const isManager = testUser.roles?.includes('manager');
    
    console.log('\n=== CALCULATING ALLOWED LOCATIONS ===');
    console.log('Is Manager?', isManager);
    
    // Get all TTG locations
    const ttgLocations = await db.collection('gaminglocations').find({
      'rel.licencee': TTG_LICENSEE_ID,
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } }
      ]
    }).toArray();
    
    console.log(`\nTTG Locations (${ttgLocations.length}):`);
    ttgLocations.forEach(loc => {
      console.log(`  - ${loc.name} (${loc._id})`);
    });
    
    const ttgLocationIds = ttgLocations.map(l => l._id);
    
    // Calculate intersection for non-manager
    let allowedLocationIds;
    if (isManager) {
      allowedLocationIds = ttgLocationIds;
    } else {
      allowedLocationIds = ttgLocationIds.filter(id => userLocationPermissions.includes(id));
    }
    
    console.log('\n=== INTERSECTION RESULT ===');
    console.log('Allowed Location IDs:', allowedLocationIds);
    
    // Now simulate the API query with the filter
    const matchCriteria = {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } }
      ]
    };
    
    if (allowedLocationIds.length > 0) {
      matchCriteria['_id'] = { $in: allowedLocationIds };
    }
    
    console.log('\n=== API QUERY ===');
    console.log('Match Criteria:', JSON.stringify(matchCriteria, null, 2));
    
    const locationsWithMachines = await db.collection('gaminglocations').aggregate([
      { $match: matchCriteria },
      {
        $lookup: {
          from: 'machines',
          localField: '_id',
          foreignField: 'gamingLocation',
          as: 'machines',
          pipeline: [
            {
              $match: {
                $or: [
                  { deletedAt: null },
                  { deletedAt: { $lt: new Date('1970-01-01') } }
                ]
              }
            }
          ]
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          machines: {
            $map: {
              input: '$machines',
              as: 'machine',
              in: {
                _id: '$$machine._id',
                serialNumber: '$$machine.serialNumber',
                game: '$$machine.game'
              }
            }
          }
        }
      }
    ]).toArray();
    
    console.log('\n=== API RESULT ===');
    console.log(`Locations returned: ${locationsWithMachines.length}`);
    locationsWithMachines.forEach(loc => {
      console.log(`\n${loc.name} (${loc._id}):`);
      console.log(`  Machines: ${loc.machines.length}`);
      loc.machines.forEach(m => {
        console.log(`    - ${m.serialNumber} (${m._id})`);
      });
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testAPI().catch(console.error);

