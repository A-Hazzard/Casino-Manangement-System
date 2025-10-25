// Using built-in fetch (Node.js 18+)

const BASE_URL = 'http://localhost:3000';

async function testCustomDateOnly() {
  try {
    const machineId = '5769366190e560cdab9b8e51';
    const startDate = '2025-10-15';
    const endDate = '2025-10-16';

    console.log('🔍 Testing Custom Date Range for Machine 1309');
    console.log(`📅 Start Date: ${startDate}, End Date: ${endDate}\n`);

    // Test Bill Validator API
    const billValidatorResponse = await fetch(
      `${BASE_URL}/api/bill-validator/${machineId}?timePeriod=Custom&startDate=${startDate}&endDate=${endDate}`
    );
    const billValidatorData = await billValidatorResponse.json();

    // Test Metrics API
    const metricsResponse = await fetch(
      `${BASE_URL}/api/machines/${machineId}?timePeriod=Custom&startDate=${startDate}&endDate=${endDate}`
    );
    const metricsData = await metricsResponse.json();

    console.log('📊 BILL VALIDATOR API:');
    console.log(
      `   Total: $${
        (billValidatorData.data?.totalKnownAmount || 0) +
        (billValidatorData.data?.totalUnknownAmount || 0)
      }`
    );
    console.log(`   Bills Found: ${billValidatorData.totalBills || 0}`);

    console.log('\n📊 METRICS API:');
    console.log(`   Money In: $${metricsData.data?.moneyIn || 0}`);
    console.log(`   Meters Found: ${metricsData.data?.meterCount || 'N/A'}`);

    console.log('\n🔍 COMPARISON:');
    const billTotal =
      (billValidatorData.data?.totalKnownAmount || 0) +
      (billValidatorData.data?.totalUnknownAmount || 0);
    const metricsTotal = metricsData.data?.moneyIn || 0;
    console.log(`   Difference: $${billTotal - metricsTotal}`);

    if (Math.abs(billTotal - metricsTotal) < 0.01) {
      console.log('   ✅ Values match!');
    } else {
      console.log('   ❌ Mismatch detected!');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testCustomDateOnly().catch(console.error);
