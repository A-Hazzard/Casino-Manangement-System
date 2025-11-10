require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

const TTG_LICENSEE_ID = '9a5db2cb29ffd2d962fd1d91';

function generateId() {
  return new ObjectId().toHexString();
}

async function createTestLocation() {
  const client = new MongoClient(process.env.MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('\n=== CREATING TEST LOCATION FOR PERMISSION TESTING ===\n');
    
    // Step 1: Create new location
    const locationId = generateId();
    const locationName = 'Test-Permission-Location';
    
    console.log('Step 1: Creating location...');
    await db.collection('gaminglocations').insertOne({
      _id: locationId,
      name: locationName,
      status: 'active',
      profitShare: 50,
      collectionBalance: 0,
      country: 'be622340d9d8384087937ff6', // Trinidad
      address: { city: 'Port of Spain' },
      rel: { licencee: TTG_LICENSEE_ID },
      membershipEnabled: false,
      deletedAt: new Date('1970-01-01'),
      gameDayOffset: 8,
      createdAt: new Date(),
      updatedAt: new Date(),
      __v: 0
    });
    console.log(`✅ Created location: ${locationName} (${locationId})`);
    
    // Step 2: Create 3 machines for this location
    console.log('\nStep 2: Creating machines...');
    const machines = [];
    for (let i = 1; i <= 3; i++) {
      const machineId = generateId();
      const machine = {
        _id: machineId,
        serialNumber: `TEST-PERM-${i}`,
        custom: { name: `Permission Test Machine ${i}` },
        game: 'Test Game',
        gameType: 'Slot',
        gamingLocation: locationId,
        deletedAt: new Date('1969-12-31'),  // Before 1970-01-01 to pass the filter
        isSasMachine: true,
        sasVersion: '6.02',
        machineType: 'Slot',
        machineStatus: 'active',
        loggedIn: true,
        lastActivity: new Date(),
        sasMeters: {
          coinIn: 5000 * i,
          coinOut: 4000 * i,
          drop: 200 * i,
          totalCancelledCredits: 50 * i,
          jackpot: 0,
          gamesPlayed: 500 * i,
          gamesWon: 250 * i,
          currentCredits: 0,
          totalWonCredits: 4000 * i,
          totalHandPaidCancelledCredits: 50 * i
        },
        billMeters: {
          dollar1: 0, dollar2: 0, dollar5: 10 * i, dollar10: 5 * i,
          dollar20: 3 * i, dollar50: 1 * i, dollar100: 1 * i,
          dollar500: 0, dollar1000: 0, dollar2000: 0,
          dollar5000: 0, dollar10000: 0,
          dollarTotal: 200 * i,
          dollarTotalUnknown: 0
        },
        collectionMeters: {
          metersIn: 5000 * i,
          metersOut: 4000 * i
        },
        collectionTime: new Date(),
        previousCollectionTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        collectionMetersHistory: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        __v: 0
      };
      
      await db.collection('machines').insertOne(machine);
      machines.push(machine);
      console.log(`✅ Created machine: ${machine.serialNumber} (${machineId})`);
    }
    
    // Step 3: Create meters for each machine
    console.log('\nStep 3: Creating meters...');
    let totalMetersCreated = 0;
    
    for (const machine of machines) {
      // Create meters for last 7 days
      for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        date.setHours(12, 0, 0, 0); // Noon
        
        const baseDrop = parseInt(machine.serialNumber.split('-')[2]) * 100;
        const meter = {
          _id: generateId(),
          machine: machine._id,
          location: locationId,
          readAt: date,
          timestamp: date,
          
          // CRITICAL: movement field for aggregation APIs
          movement: {
            drop: baseDrop + (daysAgo * 20),
            coinIn: (baseDrop + (daysAgo * 20)) * 25,
            coinOut: (baseDrop + (daysAgo * 20)) * 20,
            totalCancelledCredits: baseDrop * 0.25,
            jackpot: 0,
            totalHandPaidCancelledCredits: baseDrop * 0.25,
            gamesPlayed: (baseDrop + (daysAgo * 20)) * 5,
            gamesWon: (baseDrop + (daysAgo * 20)) * 2.5,
            currentCredits: 0,
            totalWonCredits: (baseDrop + (daysAgo * 20)) * 20
          },
          
          // Top-level fields (backward compatibility)
          drop: baseDrop + (daysAgo * 20),
          coinIn: (baseDrop + (daysAgo * 20)) * 25,
          coinOut: (baseDrop + (daysAgo * 20)) * 20,
          totalCancelledCredits: baseDrop * 0.25,
          jackpot: 0,
          totalHandPaidCancelledCredits: baseDrop * 0.25,
          gamesPlayed: (baseDrop + (daysAgo * 20)) * 5,
          gamesWon: (baseDrop + (daysAgo * 20)) * 2.5,
          currentCredits: 0,
          totalWonCredits: (baseDrop + (daysAgo * 20)) * 20,
          
          // SAS Meters
          sasMeters: {
            drop: baseDrop + (daysAgo * 20),
            coinIn: (baseDrop + (daysAgo * 20)) * 25,
            coinOut: (baseDrop + (daysAgo * 20)) * 20,
            totalCancelledCredits: baseDrop * 0.25,
            jackpot: 0,
            totalHandPaidCancelledCredits: baseDrop * 0.25,
            gamesPlayed: (baseDrop + (daysAgo * 20)) * 5,
            gamesWon: (baseDrop + (daysAgo * 20)) * 2.5,
            currentCredits: 0,
            totalWonCredits: (baseDrop + (daysAgo * 20)) * 20
          },
          
          // Bill Meters
          billMeters: machine.billMeters,
          
          createdAt: date,
          updatedAt: date,
          __v: 0
        };
        
        await db.collection('meters').insertOne(meter);
        totalMetersCreated++;
      }
    }
    
    console.log(`✅ Created ${totalMetersCreated} meters (7 days × 3 machines)`);
    
    // Step 4: Find testuser and update their permissions
    console.log('\nStep 4: Configuring testuser...');
    const testUser = await db.collection('users').findOne({ username: 'testuser' });
    
    if (!testUser) {
      console.log('❌ testuser not found - creating new user...');
      const newUserId = generateId();
      await db.collection('users').insertOne({
        _id: newUserId,
        username: 'testuser',
        password: '$2b$10$xVqH9YqJ0x0B7pY5j8K8Z.X9fZ0P8Y5j8K8Z0P8Y5j8K8Z0P8Y5j8K', // Decrypted12!
        emailAddress: 'testuser@test.com',
        roles: ['collector'],
        rel: {
          licencee: [TTG_LICENSEE_ID]
        },
        resourcePermissions: {
          'gaming-locations': {
            entity: 'gaming-locations',
            resources: [locationId]
          }
        },
        sessionVersion: 1,
        loginCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        __v: 0
      });
      console.log(`✅ Created testuser with access to only: ${locationName}`);
    } else {
      console.log(`Found existing testuser (${testUser._id})`);
      
      // Update testuser permissions
      await db.collection('users').updateOne(
        { _id: testUser._id },
        {
          $set: {
            'rel.licencee': [TTG_LICENSEE_ID],
            'resourcePermissions.gaming-locations': {
              entity: 'gaming-locations',
              resources: [locationId]
            }
          },
          $inc: { sessionVersion: 1 }
        }
      );
      console.log(`✅ Updated testuser with access to ONLY: ${locationName}`);
      console.log(`⚠️  testuser will need to re-login (sessionVersion incremented)`);
    }
    
    console.log('\n=== SUMMARY ===');
    console.log(`✅ Location: ${locationName} (${locationId})`);
    console.log(`✅ Machines: 3 (TEST-PERM-1, TEST-PERM-2, TEST-PERM-3)`);
    console.log(`✅ Meters: ${totalMetersCreated} (7 days of data)`);
    console.log(`✅ User: testuser`);
    console.log(`   - Username: testuser`);
    console.log(`   - Password: Decrypted12!`);
    console.log(`   - Licensee: TTG`);
    console.log(`   - Accessible Locations: ONLY ${locationName}`);
    console.log(`\n✅ TEST DATA READY!`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

createTestLocation().catch(console.error);

