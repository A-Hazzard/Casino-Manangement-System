// Debug script to check machine ID format differences

const BASE_URL = 'http://localhost:3000';

async function debugMachineIdFormat() {
  try {
    console.log('🔍 Debugging Machine ID Format Differences\n');

    // Get recent collections to see machine ID format
    console.log('1️⃣ Checking recent collections...');
    const collectionsResponse = await fetch(
      `${BASE_URL}/api/collections?limit=3`
    );
    if (collectionsResponse.ok) {
      const collections = await collectionsResponse.json();
      console.log('   📋 Recent collections:');
      collections.forEach((collection, index) => {
        console.log(`   ${index + 1}. Collection ID: ${collection._id}`);
        console.log(`      Machine ID: ${collection.machineId}`);
        console.log(`      Machine ID length: ${collection.machineId?.length}`);
        console.log(`      Machine ID type: ${typeof collection.machineId}`);
      });
    }

    // Try to get a machine by one of these IDs
    console.log('\n2️⃣ Testing machine lookup...');
    const testMachineId = 'c4e30d163e55fbb5ecbd6080';
    console.log(`   🔍 Looking up machine: ${testMachineId}`);

    const machineResponse = await fetch(
      `${BASE_URL}/api/machines/${testMachineId}`
    );
    console.log(`   📊 Response status: ${machineResponse.status}`);

    if (machineResponse.ok) {
      const machineData = await machineResponse.json();
      console.log('   ✅ Machine found:', machineData.data?._id);
    } else {
      const errorText = await machineResponse.text();
      console.log('   ❌ Machine not found:', errorText);
    }

    // Try to create a collection with this machine ID to see what happens
    console.log('\n3️⃣ Testing collection creation with debug logging...');
    const testCollection = {
      machineId: testMachineId,
      machineName: 'Debug Test Machine',
      metersIn: 1000,
      metersOut: 500,
      prevIn: 0,
      prevOut: 0,
      notes: 'Debug test collection',
      timestamp: '2025-10-16T08:00:00.000Z',
      collectionTime: '2025-10-16T08:00:00.000Z',
      location: 'Debug Location',
      collector: 'Debug Collector',
      locationReportId: 'debug-test-' + Date.now(),
      isCompleted: false,
      softMetersIn: 1000,
      softMetersOut: 500,
    };

    const collectionResponse = await fetch(`${BASE_URL}/api/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCollection),
    });

    if (collectionResponse.ok) {
      const collectionResult = await collectionResponse.json();
      console.log('   ✅ Collection created:', collectionResult.data?._id);
      console.log(
        '   📅 CollectionTime:',
        collectionResult.data?.collectionTime
      );
    } else {
      const errorText = await collectionResponse.text();
      console.log('   ❌ Collection creation failed:', errorText);
    }

    console.log('\n✅ Machine ID format debugging completed!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugMachineIdFormat().catch(console.error);
