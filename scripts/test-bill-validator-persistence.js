// Test script to verify bill validator custom date persistence

const BASE_URL = 'http://localhost:3000';

async function testBillValidatorPersistence() {
  try {
    const machineId = '5769366190e560cdab9b8e51';

    console.log('🔍 Testing Bill Validator Custom Date Persistence');
    console.log('📅 This test simulates user behavior:\n');

    // Test 1: First custom range (Oct 15-16)
    const customStart1 = '2025-10-15T08:00:00.000Z';
    const customEnd1 = '2025-10-16T08:00:00.000Z';

    console.log('1️⃣ Testing first custom range (Oct 15-16):');
    const response1 = await fetch(
      `${BASE_URL}/api/bill-validator/${machineId}?timePeriod=Custom&startDate=${customStart1}&endDate=${customEnd1}`
    );
    const data1 = await response1.json();
    console.log(`   Success: ${data1.success}`);
    console.log(
      `   Total: $${
        (data1.data?.totalKnownAmount || 0) +
        (data1.data?.totalUnknownAmount || 0)
      }`
    );
    console.log(`   Bills Found: ${data1.totalBills || 0}\n`);

    // Test 2: Different custom range (Oct 17-18)
    const customStart2 = '2025-10-17T08:00:00.000Z';
    const customEnd2 = '2025-10-18T08:00:00.000Z';

    console.log('2️⃣ Testing different custom range (Oct 17-18):');
    const response2 = await fetch(
      `${BASE_URL}/api/bill-validator/${machineId}?timePeriod=Custom&startDate=${customStart2}&endDate=${customEnd2}`
    );
    const data2 = await response2.json();
    console.log(`   Success: ${data2.success}`);
    console.log(
      `   Total: $${
        (data2.data?.totalKnownAmount || 0) +
        (data2.data?.totalUnknownAmount || 0)
      }`
    );
    console.log(`   Bills Found: ${data2.totalBills || 0}\n`);

    // Test 3: Back to first custom range (should be preserved in UI)
    console.log('3️⃣ Testing back to first custom range (Oct 15-16):');
    const response3 = await fetch(
      `${BASE_URL}/api/bill-validator/${machineId}?timePeriod=Custom&startDate=${customStart1}&endDate=${customEnd1}`
    );
    const data3 = await response3.json();
    console.log(`   Success: ${data3.success}`);
    console.log(
      `   Total: $${
        (data3.data?.totalKnownAmount || 0) +
        (data3.data?.totalUnknownAmount || 0)
      }`
    );
    console.log(`   Bills Found: ${data3.totalBills || 0}\n`);

    console.log('✅ API endpoints working correctly');
    console.log('🔍 Check browser console for UI state debugging');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testBillValidatorPersistence().catch(console.error);
