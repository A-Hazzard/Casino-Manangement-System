// Test script to verify collection time fixes

const BASE_URL = 'http://localhost:3000';

async function testCollectionTimeFixes() {
  try {
    console.log('🔍 Testing Collection Time Fixes');
    console.log('📅 This test verifies that collectionTime is properly set\n');

    // Test 1: Create a test collection with specific collection time
    const testCollectionTime = '2025-10-16T08:00:00.000Z'; // Oct 16th, 8 AM

    console.log(
      '1️⃣ Creating test collection with collectionTime:',
      testCollectionTime
    );

    const testCollection = {
      machineId: '5769366190e560cdab9b8e51', // Machine 1309
      machineName: '1309',
      metersIn: 1000,
      metersOut: 500,
      prevIn: 0,
      prevOut: 0,
      notes: 'Test collection for collectionTime fix',
      timestamp: testCollectionTime,
      location: 'Test Location',
      collector: 'Test Collector',
      locationReportId: '',
      isCompleted: false,
      softMetersIn: 1000,
      softMetersOut: 500,
    };

    const response = await fetch(`${BASE_URL}/api/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCollection),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('   ✅ Collection created successfully');
    console.log('   📋 Collection ID:', result.data?._id);
    console.log('   📅 Timestamp:', result.data?.timestamp);
    console.log('   📅 CollectionTime:', result.data?.collectionTime);

    // Verify collectionTime is set correctly
    if (result.data?.collectionTime) {
      const collectionTimeDate = new Date(result.data.collectionTime);
      const expectedDate = new Date(testCollectionTime);

      if (collectionTimeDate.getTime() === expectedDate.getTime()) {
        console.log('   ✅ collectionTime matches expected value');
      } else {
        console.log('   ❌ collectionTime mismatch!');
        console.log('   Expected:', expectedDate.toISOString());
        console.log('   Got:', collectionTimeDate.toISOString());
      }
    } else {
      console.log('   ❌ collectionTime not set!');
      console.log('   Available fields:', Object.keys(result.data || {}));
    }

    console.log('\n2️⃣ Testing collection history timestamp...');

    // Check if the machine's collectionMetersHistory was updated with correct timestamp
    const machineResponse = await fetch(
      `${BASE_URL}/api/machines/5769366190e560cdab9b8e51`
    );
    if (machineResponse.ok) {
      const machineData = await machineResponse.json();
      const history = machineData.data?.collectionMetersHistory || [];

      if (history.length > 0) {
        const latestEntry = history[history.length - 1];
        console.log(
          '   📋 Latest history entry timestamp:',
          latestEntry.timestamp
        );

        const historyTimestamp = new Date(latestEntry.timestamp);
        const expectedTimestamp = new Date(testCollectionTime);

        if (
          Math.abs(historyTimestamp.getTime() - expectedTimestamp.getTime()) <
          1000
        ) {
          console.log('   ✅ History timestamp matches collection time');
        } else {
          console.log('   ❌ History timestamp mismatch!');
          console.log('   Expected:', expectedTimestamp.toISOString());
          console.log('   Got:', historyTimestamp.toISOString());
        }
      } else {
        console.log('   ⚠️ No collection history found');
      }
    }

    console.log('\n3️⃣ Testing collection reports issues check...');

    // Check if the issues detection works correctly
    const issuesResponse = await fetch(
      `${BASE_URL}/api/collection-reports/check-all-issues`
    );
    if (issuesResponse.ok) {
      const issuesData = await issuesResponse.json();
      console.log('   📊 Total issues found:', issuesData.totalIssues);
      console.log(
        '   📋 Reports with issues:',
        Object.keys(issuesData.reportIssues || {}).length
      );

      // Look for our test collection in the issues
      const hasTestCollectionIssues = Object.values(
        issuesData.reportIssues || {}
      ).some(report => report.issueCount > 0);

      if (hasTestCollectionIssues) {
        console.log(
          '   ⚠️ Issues detected (this may be expected for new collections)'
        );
      } else {
        console.log('   ✅ No issues detected');
      }
    }

    console.log('\n✅ Collection time fixes test completed!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testCollectionTimeFixes().catch(console.error);
