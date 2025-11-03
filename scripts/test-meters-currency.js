/**
 * Test Meters Tab Currency Conversion
 * Verifies multi-currency conversion is working correctly
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const LOCATION_ID = '2691c7cb97750118b3ec290e'; // DevLabTuna (TTD)

async function testMetersCurrency() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     METERS TAB CURRENCY CONVERSION TEST                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  try {
    // Test 1: TTD (native currency - should show $20)
    console.log('1. Testing TTD (Native Currency)');
    console.log('─'.repeat(60));
    const ttdResponse = await axios.get(`${BASE_URL}/api/reports/meters`, {
      params: {
        locations: LOCATION_ID,
        timePeriod: 'Custom',
        startDate: '2025-10-31',
        endDate: '2025-10-31',
        licencee: '', // All Licensee mode
        currency: 'TTD',
        page: '1',
        limit: '10',
      },
    });

    console.log('  Response Status:', ttdResponse.status);
    console.log('  Total Records:', ttdResponse.data.totalCount);
    console.log('  Currency:', ttdResponse.data.currency);
    console.log('  Converted:', ttdResponse.data.converted);

    if (ttdResponse.data.data.length > 0) {
      const testMachine = ttdResponse.data.data.find(m => m.machineId === 'TEST');
      if (testMachine) {
        console.log('\n  TEST Machine:');
        console.log(`    Bill In (Drop): $${testMachine.billIn}`);
        console.log(`    Meters In (Coin In): $${testMachine.metersIn}`);
        console.log(`    Jackpot: $${testMachine.jackpot}`);
        console.log(
          `    ✅ Expected: $20 drop, Actual: $${testMachine.billIn}`
        );
      }
    }

    // Test 2: USD (should convert $20 TTD to ~$2.96 USD)
    console.log('\n2. Testing USD (Converted Currency)');
    console.log('─'.repeat(60));
    const usdResponse = await axios.get(`${BASE_URL}/api/reports/meters`, {
      params: {
        locations: LOCATION_ID,
        timePeriod: 'Custom',
        startDate: '2025-10-31',
        endDate: '2025-10-31',
        licencee: '', // All Licensee mode
        currency: 'USD',
        page: '1',
        limit: '10',
      },
    });

    console.log('  Response Status:', usdResponse.status);
    console.log('  Currency:', usdResponse.data.currency);
    console.log('  Converted:', usdResponse.data.converted);

    if (usdResponse.data.data.length > 0) {
      const testMachine = usdResponse.data.data.find(m => m.machineId === 'TEST');
      if (testMachine) {
        console.log('\n  TEST Machine:');
        console.log(`    Bill In (Drop): $${testMachine.billIn.toFixed(2)}`);
        console.log(
          `    ✅ Expected: ~$2.96 USD, Actual: $${testMachine.billIn.toFixed(2)}`
        );
      }
    }

    // Test 3: BBD (should convert $20 TTD to ~$5.93 BBD)
    console.log('\n3. Testing BBD (Converted Currency)');
    console.log('─'.repeat(60));
    const bbdResponse = await axios.get(`${BASE_URL}/api/reports/meters`, {
      params: {
        locations: LOCATION_ID,
        timePeriod: 'Custom',
        startDate: '2025-10-31',
        endDate: '2025-10-31',
        licencee: '', // All Licensee mode
        currency: 'BBD',
        page: '1',
        limit: '10',
      },
    });

    console.log('  Response Status:', bbdResponse.status);
    console.log('  Currency:', bbdResponse.data.currency);
    console.log('  Converted:', bbdResponse.data.converted);

    if (bbdResponse.data.data.length > 0) {
      const testMachine = bbdResponse.data.data.find(m => m.machineId === 'TEST');
      if (testMachine) {
        console.log('\n  TEST Machine:');
        console.log(`    Bill In (Drop): $${testMachine.billIn.toFixed(2)}`);
        console.log(
          `    ✅ Expected: ~$5.93 BBD, Actual: $${testMachine.billIn.toFixed(2)}`
        );
      }
    }

    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('SUMMARY');
    console.log('═'.repeat(60));

    const ttdMachine = ttdResponse.data.data.find(m => m.machineId === 'TEST');
    const usdMachine = usdResponse.data.data.find(m => m.machineId === 'TEST');
    const bbdMachine = bbdResponse.data.data.find(m => m.machineId === 'TEST');

    if (ttdMachine && usdMachine && bbdMachine) {
      console.log(`TTD (native): $${ttdMachine.billIn}`);
      console.log(`USD (converted): $${usdMachine.billIn.toFixed(2)}`);
      console.log(`BBD (converted): $${bbdMachine.billIn.toFixed(2)}`);

      // Verify conversion
      const ttdToUsd = ttdMachine.billIn / 6.75; // Expected: ~2.96
      const ttdToBbd = (ttdMachine.billIn / 6.75) * 2.0; // Expected: ~5.93

      console.log(
        `\n✅ TTD → USD: ${Math.abs(usdMachine.billIn - ttdToUsd) < 0.01 ? 'PASS' : 'FAIL'}`
      );
      console.log(
        `✅ TTD → BBD: ${Math.abs(bbdMachine.billIn - ttdToBbd) < 0.01 ? 'PASS' : 'FAIL'}`
      );
    }

    console.log('\n✅ Meters tab currency conversion test completed!');
  } catch (error) {
    console.error('\n❌ Error during test:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testMetersCurrency();

