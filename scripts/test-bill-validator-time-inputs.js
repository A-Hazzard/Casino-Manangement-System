// Test script to verify bill validator now supports time inputs

const BASE_URL = 'http://localhost:3000';

async function testBillValidatorTimeInputs() {
  try {
    const machineId = '5769366190e560cdab9b8e51';

    // Test with time components like the global filters
    const startDate = '2025-10-15T08:00:00.000Z';
    const endDate = '2025-10-16T08:00:00.000Z';

    console.log('🔍 Testing Bill Validator with Time Inputs');
    console.log(`📅 Start: ${startDate}`);
    console.log(`📅 End: ${endDate}\n`);

    const response = await fetch(
      `${BASE_URL}/api/bill-validator/${machineId}?timePeriod=Custom&startDate=${startDate}&endDate=${endDate}`
    );
    const data = await response.json();

    console.log('📊 BILL VALIDATOR API RESPONSE:');
    console.log(`   Success: ${data.success}`);
    console.log(`   Total Known: $${data.data?.totalKnownAmount || 0}`);
    console.log(`   Total Unknown: $${data.data?.totalUnknownAmount || 0}`);
    console.log(
      `   Grand Total: $${
        (data.data?.totalKnownAmount || 0) +
        (data.data?.totalUnknownAmount || 0)
      }`
    );
    console.log(`   Bills Found: ${data.totalBills || 0}`);

    if (data.success) {
      console.log('✅ Bill Validator API working with time inputs!');
    } else {
      console.log('❌ Bill Validator API failed');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testBillValidatorTimeInputs().catch(console.error);
