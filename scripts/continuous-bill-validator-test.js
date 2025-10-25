const { MongoClient } = require('mongodb');
// Using built-in fetch (Node.js 18+)

const MONGODB_URI =
  'mongodb://sunny1:87ydaiuhdsia2e@192.168.8.2:32018/sas-prod-local?authSource=admin';
const BASE_URL = 'http://localhost:3000';

async function testBillValidatorAlignment() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db();

    console.log('🔍 Continuous Bill Validator vs Metrics Alignment Test');
    console.log('📅 Testing Machine 1309 (ID: 5769366190e560cdab9b8e51)');

    const machineId = '5769366190e560cdab9b8e51';

    // Get machine and location info
    const machine = await db.collection('machines').findOne({ _id: machineId });
    const location = await db
      .collection('gaminglocations')
      .findOne({ _id: machine.locationId });
    const gameDayOffset = location?.gameDayOffset || 0;

    console.log(
      `📍 Location: ${location?.name}, Game Day Offset: ${gameDayOffset}`
    );

    // Test multiple time periods
    const timePeriods = ['Today', 'Yesterday', '7d', '30d', 'All Time'];

    let allTestsPassed = true;

    for (const timePeriod of timePeriods) {
      console.log(`\n📊 Testing ${timePeriod}...`);

      try {
        // Test Bill Validator API
        const billValidatorResponse = await fetch(
          `${BASE_URL}/api/bill-validator/${machineId}?timePeriod=${timePeriod}`
        );
        const billValidatorData = await billValidatorResponse.json();

        // Test Metrics API
        const metricsResponse = await fetch(
          `${BASE_URL}/api/machines/${machineId}?timePeriod=${timePeriod}`
        );
        const metricsData = await metricsResponse.json();

        if (billValidatorData.success && metricsData.success) {
          const billValidatorTotal =
            (billValidatorData.data.totalKnownAmount || 0) +
            (billValidatorData.data.totalUnknownAmount || 0);
          const metricsMoneyIn = metricsData.data.moneyIn || 0;
          const difference = billValidatorTotal - metricsMoneyIn;

          console.log(`   Bill Validator: $${billValidatorTotal}`);
          console.log(`   Metrics Money In: $${metricsMoneyIn}`);
          console.log(`   Difference: $${difference}`);

          if (Math.abs(difference) < 0.01) {
            console.log(`   ✅ PASS - Values match!`);
          } else {
            console.log(`   ❌ FAIL - Mismatch detected!`);
            allTestsPassed = false;

            // Show detailed breakdown for failed tests
            if (billValidatorData.data.denominations) {
              console.log(`   Bill Validator Breakdown:`);
              billValidatorData.data.denominations.forEach(denom => {
                if (denom.quantity > 0) {
                  console.log(
                    `     ${denom.label}: ${denom.quantity} bills = $${denom.subtotal}`
                  );
                }
              });
            }
          }
        } else {
          console.log(
            `   ❌ API Error - Bill Validator: ${billValidatorData.success}, Metrics: ${metricsData.success}`
          );
          allTestsPassed = false;
        }
      } catch (error) {
        console.log(`   ❌ Request Error: ${error.message}`);
        allTestsPassed = false;
      }
    }

    // Test custom date range (Oct 15-16, 2025)
    console.log(`\n📊 Testing Custom Date Range (Oct 15-16, 2025)...`);

    try {
      const startDate = '2025-10-15';
      const endDate = '2025-10-16';

      const billValidatorResponse = await fetch(
        `${BASE_URL}/api/bill-validator/${machineId}?timePeriod=Custom&startDate=${startDate}&endDate=${endDate}`
      );
      const billValidatorData = await billValidatorResponse.json();

      const metricsResponse = await fetch(
        `${BASE_URL}/api/machines/${machineId}?timePeriod=Custom&startDate=${startDate}&endDate=${endDate}`
      );
      const metricsData = await metricsResponse.json();

      if (billValidatorData.success && metricsData.success) {
        const billValidatorTotal =
          (billValidatorData.data.totalKnownAmount || 0) +
          (billValidatorData.data.totalUnknownAmount || 0);
        const metricsMoneyIn = metricsData.data.moneyIn || 0;
        const difference = billValidatorTotal - metricsMoneyIn;

        console.log(`   Bill Validator: $${billValidatorTotal}`);
        console.log(`   Metrics Money In: $${metricsMoneyIn}`);
        console.log(`   Difference: $${difference}`);

        if (Math.abs(difference) < 0.01) {
          console.log(`   ✅ PASS - Values match!`);
        } else {
          console.log(`   ❌ FAIL - Mismatch detected!`);
          allTestsPassed = false;
        }
      } else {
        console.log(
          `   ❌ API Error - Bill Validator: ${billValidatorData.success}, Metrics: ${metricsData.success}`
        );
        allTestsPassed = false;
      }
    } catch (error) {
      console.log(`   ❌ Request Error: ${error.message}`);
      allTestsPassed = false;
    }

    console.log(`\n🎯 FINAL RESULT:`);
    if (allTestsPassed) {
      console.log(
        `   ✅ ALL TESTS PASSED! Bill Validator and Metrics are aligned.`
      );
    } else {
      console.log(
        `   ❌ SOME TESTS FAILED! Bill Validator and Metrics need alignment.`
      );
    }

    return allTestsPassed;
  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  } finally {
    await client.close();
  }
}

// Run the test
if (require.main === module) {
  testBillValidatorAlignment().catch(console.error);
}

module.exports = { testBillValidatorAlignment };
