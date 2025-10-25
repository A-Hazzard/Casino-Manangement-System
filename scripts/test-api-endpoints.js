/**
 * Test Script: API Endpoint Verification
 *
 * This script tests the actual API endpoints to verify they return
 * the correct values for custom date ranges.
 */

// Using built-in fetch (Node.js 18+)

// Configuration
const BASE_URL = 'http://localhost:3000';
const MACHINE_SERIAL = '1309';
const CUSTOM_START = '2025-10-01T08:00:00';
const CUSTOM_END = '2025-10-15T08:00:00';
const EXPECTED_MONEY_IN = 13483;
const EXPECTED_GROSS = 2727; // 13483 - 10756.02 ≈ 2727

async function testAPIEndpoints() {
  try {
    console.log('🧪 Testing API Endpoints for Custom Date Alignment');
    console.log('='.repeat(60));
    console.log(`Machine Serial: ${MACHINE_SERIAL}`);
    console.log(`Custom Range: ${CUSTOM_START} to ${CUSTOM_END}`);
    console.log(`Expected Money In: ${EXPECTED_MONEY_IN}`);
    console.log(`Expected Gross: ${EXPECTED_GROSS}`);
    console.log('');

    // Test 1: Individual Machine API
    console.log('📋 Test 1: Individual Machine API');
    console.log('='.repeat(40));

    try {
      // First, we need to find the machine ID
      const machineResponse = await fetch(
        `${BASE_URL}/api/machines/aggregation?timePeriod=Custom&startDate=${CUSTOM_START}&endDate=${CUSTOM_END}&search=${MACHINE_SERIAL}`
      );
      const machineData = await machineResponse.json();

      if (machineData.success && machineData.data.length > 0) {
        const machine = machineData.data[0];
        const machineId = machine._id;

        console.log(`✅ Found machine ID: ${machineId}`);
        console.log(`   Money In: ${machine.moneyIn}`);
        console.log(`   Money Out: ${machine.moneyOut}`);
        console.log(`   Gross: ${machine.gross}`);

        // Test individual machine API
        const individualResponse = await fetch(
          `${BASE_URL}/api/machines/${machineId}?timePeriod=Custom&startDate=${CUSTOM_START}&endDate=${CUSTOM_END}`
        );
        const individualData = await individualResponse.json();

        if (individualData.success && individualData.data) {
          const machineData = individualData.data;
          console.log(`\n✅ Individual Machine API Results:`);
          console.log(`   Money In: ${machineData.moneyIn}`);
          console.log(`   Money Out: ${machineData.moneyOut}`);
          console.log(`   Gross: ${machineData.gross}`);

          // Check if values match expected
          const moneyInMatch =
            Math.abs(machineData.moneyIn - EXPECTED_MONEY_IN) < 1;
          const grossMatch = Math.abs(machineData.gross - EXPECTED_GROSS) < 1;

          console.log(`\n🎯 Individual Machine API Results:`);
          console.log(
            `   Money In Match: ${
              moneyInMatch ? '✅' : '❌'
            } (Expected: ${EXPECTED_MONEY_IN}, Got: ${machineData.moneyIn})`
          );
          console.log(
            `   Gross Match: ${
              grossMatch ? '✅' : '❌'
            } (Expected: ${EXPECTED_GROSS}, Got: ${machineData.gross})`
          );
        } else {
          console.log(
            '❌ Individual Machine API failed:',
            individualData.error
          );
        }
      } else {
        console.log('❌ Could not find machine in aggregation API');
      }
    } catch (error) {
      console.log('❌ Error testing Individual Machine API:', error.message);
    }

    // Test 2: Cabinets Page API (Aggregation)
    console.log('\n📋 Test 2: Cabinets Page API (Aggregation)');
    console.log('='.repeat(40));

    try {
      const aggregationResponse = await fetch(
        `${BASE_URL}/api/machines/aggregation?timePeriod=Custom&startDate=${CUSTOM_START}&endDate=${CUSTOM_END}&search=${MACHINE_SERIAL}`
      );
      const aggregationData = await aggregationResponse.json();

      if (aggregationData.success && aggregationData.data.length > 0) {
        const machine = aggregationData.data[0];
        console.log(`✅ Aggregation API Results:`);
        console.log(`   Money In: ${machine.moneyIn}`);
        console.log(`   Money Out: ${machine.moneyOut}`);
        console.log(`   Gross: ${machine.gross}`);

        // Check if values match expected
        const moneyInMatch = Math.abs(machine.moneyIn - EXPECTED_MONEY_IN) < 1;
        const grossMatch = Math.abs(machine.gross - EXPECTED_GROSS) < 1;

        console.log(`\n🎯 Aggregation API Results:`);
        console.log(
          `   Money In Match: ${
            moneyInMatch ? '✅' : '❌'
          } (Expected: ${EXPECTED_MONEY_IN}, Got: ${machine.moneyIn})`
        );
        console.log(
          `   Gross Match: ${
            grossMatch ? '✅' : '❌'
          } (Expected: ${EXPECTED_GROSS}, Got: ${machine.gross})`
        );
      } else {
        console.log('❌ Aggregation API failed or no data returned');
      }
    } catch (error) {
      console.log('❌ Error testing Aggregation API:', error.message);
    }

    // Test 3: Location Details API
    console.log('\n📋 Test 3: Location Details API');
    console.log('='.repeat(40));

    try {
      // First get the location ID from the machine
      const machineResponse = await fetch(
        `${BASE_URL}/api/machines/aggregation?timePeriod=Custom&startDate=${CUSTOM_START}&endDate=${CUSTOM_END}&search=${MACHINE_SERIAL}`
      );
      const machineData = await machineResponse.json();

      if (machineData.success && machineData.data.length > 0) {
        const machine = machineData.data[0];
        const locationId = machine.locationId;

        console.log(`✅ Found location ID: ${locationId}`);

        const locationResponse = await fetch(
          `${BASE_URL}/api/locations/${locationId}?timePeriod=Custom&startDate=${CUSTOM_START}&endDate=${CUSTOM_END}&search=${MACHINE_SERIAL}`
        );
        const locationData = await locationResponse.json();

        // Location API returns an array directly, not wrapped in success object
        if (Array.isArray(locationData) && locationData.length > 0) {
          const locationMachine = locationData.find(
            m => m.serialNumber === MACHINE_SERIAL
          );

          if (locationMachine) {
            console.log(`✅ Location API Results:`);
            console.log(`   Money In: ${locationMachine.moneyIn}`);
            console.log(`   Money Out: ${locationMachine.moneyOut}`);
            console.log(`   Gross: ${locationMachine.gross}`);

            // Check if values match expected
            const moneyInMatch =
              Math.abs(locationMachine.moneyIn - EXPECTED_MONEY_IN) < 1;
            const grossMatch =
              Math.abs(locationMachine.gross - EXPECTED_GROSS) < 1;

            console.log(`\n🎯 Location API Results:`);
            console.log(
              `   Money In Match: ${
                moneyInMatch ? '✅' : '❌'
              } (Expected: ${EXPECTED_MONEY_IN}, Got: ${
                locationMachine.moneyIn
              })`
            );
            console.log(
              `   Gross Match: ${
                grossMatch ? '✅' : '❌'
              } (Expected: ${EXPECTED_GROSS}, Got: ${locationMachine.gross})`
            );
          } else {
            console.log('❌ Machine not found in location API results');
          }
        } else {
          console.log('❌ Location API failed or no data returned');
        }
      } else {
        console.log('❌ Could not find machine for location API test');
      }
    } catch (error) {
      console.log('❌ Error testing Location API:', error.message);
    }

    console.log('\n📋 Summary');
    console.log('='.repeat(60));
    console.log(
      'All APIs should now return the same values for custom date ranges.'
    );
    console.log('If any API shows ❌, the fix may not be fully applied yet.');
    console.log('Expected values:');
    console.log(`  Money In: ${EXPECTED_MONEY_IN}`);
    console.log(`  Gross: ${EXPECTED_GROSS}`);
  } catch (error) {
    console.error('❌ Error during API testing:', error);
  }
}

// Run the test
testAPIEndpoints().catch(console.error);
