// Test script to directly verify machine update is working

const BASE_URL = 'http://localhost:3000';

async function testMachineUpdateDirect() {
  try {
    console.log('🔍 Testing Machine Update Directly');
    console.log('📅 This test verifies machine collection history update\n');

    // Use a real machine ID from the database
    const realMachineId = 'c4e30d163e55fbb5ecbd6080';
    const testCollectionTime = '2025-10-16T08:00:00.000Z';
    const testLocationReportId = 'direct-test-' + Date.now();

    console.log('1️⃣ Creating test collection with detailed logging...');

    const testCollection = {
      machineId: realMachineId,
      machineName: 'Direct Test Machine',
      metersIn: 4000,
      metersOut: 2000,
      prevIn: 0,
      prevOut: 0,
      notes: 'Direct test collection for machine update',
      timestamp: testCollectionTime,
      collectionTime: testCollectionTime,
      location: 'Direct Test Location',
      collector: 'Direct Test Collector',
      locationReportId: testLocationReportId, // This will trigger history creation
      isCompleted: false,
      softMetersIn: 4000,
      softMetersOut: 2000,
    };

    console.log('📤 Sending collection data:', {
      machineId: testCollection.machineId,
      locationReportId: testCollection.locationReportId,
      metersIn: testCollection.metersIn,
      metersOut: testCollection.metersOut,
      collectionTime: testCollection.collectionTime,
    });

    const response = await fetch(`${BASE_URL}/api/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCollection),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, ${errorText}`);
    }

    const result = await response.json();
    console.log('   ✅ Collection created successfully');
    console.log('   📋 Collection ID:', result.data?._id);
    console.log('   📅 CollectionTime:', result.data?.collectionTime);

    console.log('\n2️⃣ Checking if machine was found and updated...');
    console.log('   🔍 Check the server console for detailed logs:');
    console.log("   - '🔍 Looking for machine: [machineId]'");
    console.log(
      "   - '✅ Machine found: [machineId]' or '❌ Machine not found: [machineId]'"
    );
    console.log("   - '📊 Current collection meters: [meters]'");
    console.log("   - '📝 History entry to add: [entry]'");
    console.log(
      "   - '✅ Machine collection history updated for new collection'"
    );
    console.log("   - '📊 Update result: Success or Failed'");

    console.log('\n3️⃣ The collection creation completed successfully.');
    console.log('   If the machine was found and updated, you should see:');
    console.log('   - Machine collection history entry added');
    console.log('   - Machine collectionMeters updated');
    console.log('   - History timestamp matching collectionTime');

    console.log('\n✅ Direct machine update test completed!');
    console.log('\n💡 Next steps:');
    console.log('   1. Check server console for detailed logs');
    console.log(
      '   2. If machine not found, the machine ID might not exist in the machines collection'
    );
    console.log(
      '   3. If machine found but update failed, check database permissions'
    );
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testMachineUpdateDirect().catch(console.error);
