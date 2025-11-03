/**
 * Debug Machines Tab Currency Display
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function debugMachinesCurrency() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     MACHINES TAB CURRENCY DEBUG                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  try {
    // Test with TTD currency
    console.log('1. Fetching with TTD currency (native)');
    console.log('─'.repeat(60));
    const ttdResponse = await axios.get(`${BASE_URL}/api/reports/machines`, {
      params: {
        type: 'stats',
        timePeriod: '7d',
        licencee: '', // All Licensee
        currency: 'TTD',
      },
    });

    console.log('  Response Data:');
    console.log(`    totalGross: ${ttdResponse.data.totalGross}`);
    console.log(`    totalDrop: ${ttdResponse.data.totalDrop}`);
    console.log(`    totalCancelledCredits: ${ttdResponse.data.totalCancelledCredits}`);
    console.log(`    currency: ${ttdResponse.data.currency}`);
    console.log(`    converted: ${ttdResponse.data.converted}`);

    // Test with BBD currency
    console.log('\n2. Fetching with BBD currency (should convert)');
    console.log('─'.repeat(60));
    const bbdResponse = await axios.get(`${BASE_URL}/api/reports/machines`, {
      params: {
        type: 'stats',
        timePeriod: '7d',
        licencee: '', // All Licensee
        currency: 'BBD',
      },
    });

    console.log('  Response Data:');
    console.log(`    totalGross: ${bbdResponse.data.totalGross}`);
    console.log(`    totalDrop: ${bbdResponse.data.totalDrop}`);
    console.log(`    totalCancelledCredits: ${bbdResponse.data.totalCancelledCredits}`);
    console.log(`    currency: ${bbdResponse.data.currency}`);
    console.log(`    converted: ${bbdResponse.data.converted}`);

    // Analysis
    console.log('\n3. Analysis');
    console.log('─'.repeat(60));
    console.log('  Expected:');
    console.log('    - TEST machine has $20 drop in TTD');
    console.log('    - Other machines have $0');
    console.log('    - Total should be $20 TTD');
    console.log('');
    console.log('  Actual:');
    console.log(`    - Total shows $${ttdResponse.data.totalDrop} TTD`);
    console.log('');
    
    if (ttdResponse.data.totalDrop === 20) {
      console.log('  ✓ TTD value is correct!');
    } else {
      console.log('  ✗ TTD value is WRONG!');
      console.log(`  Expected: $20, Got: $${ttdResponse.data.totalDrop}`);
    }

    // Check individual machines
    console.log('\n4. Checking Individual Machine Data');
    console.log('─'.repeat(60));
    const allMachines = await axios.get(`${BASE_URL}/api/reports/machines`, {
      params: {
        type: 'all',
        timePeriod: '7d',
        licencee: '',
        currency: 'TTD',
      },
    });

    const machines = allMachines.data.data || [];
    console.log(`  Total machines: ${machines.length}`);
    
    machines.forEach((m) => {
      console.log(`\n  Machine: ${m.serialNumber}`);
      console.log(`    drop: $${m.drop}`);
      console.log(`    gross: $${m.gross}`);
      console.log(`    coinIn: $${m.coinIn}`);
    });

    const totalDropSum = machines.reduce((sum, m) => sum + (m.drop || 0), 0);
    console.log(`\n  Sum of individual machine drops: $${totalDropSum}`);
    console.log(`  API stats total: $${ttdResponse.data.totalDrop}`);

    if (totalDropSum !== ttdResponse.data.totalDrop) {
      console.log('  ✗ MISMATCH! Individual machines don\'t match stats total!');
    }
  } catch (error) {
    console.error('Fatal error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

debugMachinesCurrency();

