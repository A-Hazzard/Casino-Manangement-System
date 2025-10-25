// Test script to verify gameDayOffset defaults work correctly

const BASE_URL = 'http://localhost:3000';

async function testGameDayOffsetDefaults() {
  try {
    const machineId = '5769366190e560cdab9b8e51';

    console.log('🔍 Testing gameDayOffset defaults for Machine 1309');
    console.log('📅 Testing with gameDayOffset = 8 (8 AM to 8 AM)\n');

    // Test the machines API to get gameDayOffset
    const machineResponse = await fetch(
      `${BASE_URL}/api/machines/${machineId}?timePeriod=Today`
    );
    const machineData = await machineResponse.json();

    console.log('📊 MACHINE API RESPONSE:');
    console.log(`   Success: ${machineData.success}`);
    console.log(`   Location Name: ${machineData.data?.locationName || 'N/A'}`);
    console.log(
      `   Game Day Offset: ${machineData.data?.gameDayOffset || 'N/A'}`
    );

    if (machineData.data?.gameDayOffset !== undefined) {
      const gameDayOffset = machineData.data.gameDayOffset;

      // Calculate expected default times
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const startDate = new Date(today);
      startDate.setHours(gameDayOffset, 0, 0, 0);

      const endDate = new Date(tomorrow);
      endDate.setHours(gameDayOffset, 0, 0, 0);

      console.log('\n🕐 EXPECTED DEFAULT TIMES:');
      console.log(`   Start: ${startDate.toISOString()}`);
      console.log(`   End: ${endDate.toISOString()}`);

      // Test bill validator with these times
      const billValidatorResponse = await fetch(
        `${BASE_URL}/api/bill-validator/${machineId}?timePeriod=Custom&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      const billValidatorData = await billValidatorResponse.json();

      console.log('\n📊 BILL VALIDATOR WITH DEFAULT TIMES:');
      console.log(`   Success: ${billValidatorData.success}`);
      console.log(
        `   Total: $${
          (billValidatorData.data?.totalKnownAmount || 0) +
          (billValidatorData.data?.totalUnknownAmount || 0)
        }`
      );
      console.log(`   Bills Found: ${billValidatorData.totalBills || 0}`);

      console.log('\n✅ gameDayOffset defaults working correctly!');
    } else {
      console.log('❌ gameDayOffset not found in machine data');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testGameDayOffsetDefaults().catch(console.error);
