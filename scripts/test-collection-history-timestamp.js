// Test script to verify collection history timestamp fix

const BASE_URL = 'http://localhost:3000';

async function testCollectionHistoryTimestamp() {
  try {
    console.log('🔍 Testing Collection History Timestamp Fix');
    console.log(
      '📅 This test verifies that collectionMetersHistory uses collectionTime\n'
    );

    // Create a test collection with a locationReportId (so it gets added to history)
    const testCollectionTime = '2025-10-16T08:00:00.000Z';
    const testLocationReportId = 'test-report-' + Date.now();

    console.log(
      '1️⃣ Creating test collection with locationReportId:',
      testLocationReportId
    );

    const testCollection = {
      machineId: '5769366190e560cdab9b8e51', // Machine 1309
      machineName: '1309',
      metersIn: 2000,
      metersOut: 1000,
      prevIn: 1000,
      prevOut: 500,
      notes: 'Test collection for history timestamp fix',
      timestamp: testCollectionTime,
      collectionTime: testCollectionTime,
      location: 'Test Location',
      collector: 'Test Collector',
      locationReportId: testLocationReportId, // This will trigger history creation
      isCompleted: false,
      softMetersIn: 2000,
      softMetersOut: 1000,
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
    console.log('   📅 CollectionTime:', result.data?.collectionTime);

    console.log('\n2️⃣ Checking machine collection history...');

    // Check if the machine's collectionMetersHistory was updated with correct timestamp
    const machineResponse = await fetch(
      `${BASE_URL}/api/machines/5769366190e560cdab9b8e51`
    );
    if (machineResponse.ok) {
      const machineData = await machineResponse.json();
      const history = machineData.data?.collectionMetersHistory || [];

      console.log(`   📊 Total history entries: ${history.length}`);

      if (history.length > 0) {
        // Find the entry with our test locationReportId
        const testEntry = history.find(
          entry => entry.locationReportId === testLocationReportId
        );

        if (testEntry) {
          console.log('   ✅ Found test entry in collection history');
          console.log('   📅 History timestamp:', testEntry.timestamp);
          console.log('   📊 Meters In:', testEntry.metersIn);
          console.log('   📊 Meters Out:', testEntry.metersOut);
          console.log('   📊 Prev In:', testEntry.prevIn);
          console.log('   📊 Prev Out:', testEntry.prevOut);

          // Check if timestamp matches collectionTime
          const historyTimestamp = new Date(testEntry.timestamp);
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
          console.log('   ❌ Test entry not found in collection history');
          console.log(
            '   Available locationReportIds:',
            history.map(h => h.locationReportId)
          );
        }
      } else {
        console.log('   ⚠️ No collection history found');
      }
    }

    console.log('\n3️⃣ Testing Previous Meters Mismatch detection...');

    // Check if the issues detection works correctly now
    const issuesResponse = await fetch(
      `${BASE_URL}/api/collection-reports/check-all-issues`
    );
    if (issuesResponse.ok) {
      const issuesData = await issuesResponse.json();
      console.log('   📊 Total issues found:', issuesData.totalIssues);

      // Look for issues with our test report
      const testReportIssues = issuesData.reportIssues?.[testLocationReportId];
      if (testReportIssues) {
        console.log('   📋 Test report issues:', testReportIssues.issueCount);
        if (testReportIssues.issueCount === 0) {
          console.log('   ✅ No issues detected for test collection');
        } else {
          console.log(
            '   ⚠️ Issues detected (may be expected for new collections)'
          );
        }
      } else {
        console.log('   ℹ️ Test report not found in issues (may be expected)');
      }
    }

    console.log('\n✅ Collection history timestamp test completed!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testCollectionHistoryTimestamp().catch(console.error);
